import { randomUUID } from 'node:crypto';

import {
  ItemCondition,
  ItemStatus,
  MovementType,
  type Purchase,
  type PurchaseLine,
} from '@prisma/client';

import { prisma } from './prisma';
import { createPurchaseSchema } from './validation';

type CreatePurchaseInput = typeof createPurchaseSchema._type;

type PurchaseWithLines = Purchase & {
  lines: (PurchaseLine & {
    product: {
      id: string;
      name: string;
      brand: string | null;
      model: string | null;
    };
  })[];
};

function calculatePurchaseTotal(lines: CreatePurchaseInput['lines']): number {
  return lines.reduce((sum, line) => sum + line.quantity * line.unitToman + line.feesToman, 0);
}

export async function createPurchase(payload: unknown): Promise<PurchaseWithLines> {
  const data = createPurchaseSchema.parse(payload);

  const productIds = Array.from(new Set(data.lines.map((line) => line.productId)));

  const existingProducts = await prisma.product.findMany({
    where: { id: { in: productIds } },
    select: { id: true },
  });

  if (existingProducts.length !== productIds.length) {
    throw new TypeError('One or more productIds are invalid');
  }

  const totalToman = calculatePurchaseTotal(data.lines);

  const result = await prisma.$transaction(async (tx) => {
    const purchase = await tx.purchase.create({
      data: {
        supplierName: data.supplierName,
        reference: data.reference?.trim() || null,
        orderedAt: data.orderedAt ?? undefined,
        channel: data.channel ?? null,
        totalToman,
      },
    });

    const lines: PurchaseWithLines['lines'] = [];

    for (const line of data.lines) {
      const createdLine = await tx.purchaseLine.create({
        data: {
          purchaseId: purchase.id,
          productId: line.productId,
          quantity: line.quantity,
          unitToman: line.unitToman,
          feesToman: line.feesToman,
        },
        include: {
          product: {
            select: {
              id: true,
              name: true,
              brand: true,
              model: true,
            },
          },
        },
      });

      lines.push(createdLine);
    }

    return { purchase, lines };
  });

  return { ...result.purchase, lines: result.lines };
}

export type PurchaseListEntry = {
  id: string;
  supplierName: string;
  reference: string | null;
  totalItems: number;
  receivedItems: number;
  createdAt: Date;
};

export async function getPurchasesList(limit = 20): Promise<PurchaseListEntry[]> {
  const purchases = await prisma.purchase.findMany({
    orderBy: { createdAt: 'desc' },
    take: limit,
    include: {
      lines: true,
    },
  });

  return purchases.map((purchase) => {
    const totals = purchase.lines.reduce(
      (acc, line) => {
        acc.totalItems += line.quantity;
        acc.receivedItems += line.createdItemIds.length;
        return acc;
      },
      { totalItems: 0, receivedItems: 0 },
    );

    return {
      id: purchase.id,
      supplierName: purchase.supplierName,
      reference: purchase.reference,
      totalItems: totals.totalItems,
      receivedItems: totals.receivedItems,
      createdAt: purchase.createdAt,
    };
  });
}

export async function getPurchaseProductOptions(): Promise<
  {
    id: string;
    name: string;
    brand: string | null;
    model: string | null;
  }[]
> {
  const products = await prisma.product.findMany({
    select: {
      id: true,
      name: true,
      brand: true,
      model: true,
    },
    orderBy: { name: 'asc' },
  });

  return products;
}

export async function getPurchaseDetail(purchaseId: string): Promise<PurchaseWithLines | null> {
  return prisma.purchase.findUnique({
    where: { id: purchaseId },
    include: {
      lines: {
        include: {
          product: {
            select: {
              id: true,
              name: true,
              brand: true,
              model: true,
            },
          },
        },
        orderBy: { id: 'asc' },
      },
    },
  });
}

function computeFeeShare(totalFees: number, quantity: number, index: number): number {
  if (quantity <= 0) {
    return 0;
  }

  const base = Math.floor(totalFees / quantity);
  const remainder = totalFees % quantity;

  return base + (index === 0 ? remainder : 0);
}

export async function receivePurchase(purchaseId: string): Promise<{
  purchase: PurchaseWithLines;
  alreadyReceived: boolean;
  createdItems: string[];
}> {
  return prisma.$transaction(
    async (tx) => {
      const purchase = await tx.purchase.findUnique({
        where: { id: purchaseId },
        include: {
          lines: {
            include: {
              product: {
                select: {
                  id: true,
                  name: true,
                  brand: true,
                  model: true,
                },
              },
            },
            orderBy: { id: 'asc' },
          },
        },
        // lock: { mode: 'ForUpdate' },
      });

      if (!purchase) {
        throw new Error('Purchase not found');
      }

      const hasExistingItems = purchase.lines.some((line) => line.createdItemIds.length > 0);
      if (hasExistingItems) {
        return { purchase, alreadyReceived: true, createdItems: [] };
      }

      const createdItemIds: string[] = [];

      for (const line of purchase.lines) {
        const idsForLine: string[] = [];

        for (let index = 0; index < line.quantity; index += 1) {
          const serial = `${purchase.id.slice(0, 4)}-${line.id.slice(0, 4)}-${index + 1}-${randomUUID().slice(0, 4)}`;
          const feesToman = computeFeeShare(line.feesToman, line.quantity, index);

          const item = await tx.item.create({
            data: {
              productId: line.productId,
              serial,
              condition: ItemCondition.NEW,
              status: ItemStatus.IN_STOCK,
              purchaseToman: line.unitToman,
              feesToman,
              refurbToman: 0,
            },
          });

          await tx.inventoryMovement.create({
            data: {
              itemId: item.id,
              movement: MovementType.PURCHASE_IN,
              qty: 1,
              reference: purchase.reference ?? purchase.id,
            },
          });

          idsForLine.push(item.id);
          createdItemIds.push(item.id);
        }

        await tx.purchaseLine.update({
          where: { id: line.id },
          data: { createdItemIds: idsForLine },
        });
      }

      const refreshed = await tx.purchase.findUnique({
        where: { id: purchaseId },
        include: {
          lines: {
            include: {
              product: {
                select: {
                  id: true,
                  name: true,
                  brand: true,
                  model: true,
                },
              },
            },
            orderBy: { id: 'asc' },
          },
        },
      });

      if (!refreshed) {
        throw new Error('Purchase not found after receiving');
      }

      return { purchase: refreshed, alreadyReceived: false, createdItems: createdItemIds };
    },
    { timeout: 20000, maxWait: 10000 },
  );
}
