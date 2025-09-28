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

function baseSerialUTC(d = new Date()) {
  const yy = String(d.getUTCFullYear()).slice(-2);
  const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(d.getUTCDate()).padStart(2, '0');
  const hh = String(d.getUTCHours()).padStart(2, '0');
  const mi = String(d.getUTCMinutes()).padStart(2, '0');
  const ss = String(d.getUTCSeconds()).padStart(2, '0');
  return `CX-${yy}${mm}${dd}-${hh}${mi}${ss}`;
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
                select: { id: true, name: true, brand: true, model: true },
              },
            },
            orderBy: { id: 'asc' },
          },
        },
        // lock: { mode: 'ForUpdate' }, // re-enable if your client supports it
      });

      if (!purchase) {
        throw new Error('Purchase not found');
      }

      const hasExistingItems = purchase.lines.some((line) => line.createdItemIds.length > 0);
      if (hasExistingItems) {
        return { purchase, alreadyReceived: true, createdItems: [] };
      }

      const createdItemIds: string[] = [];
      // Track per-base sequence so multiple items in the same second get unique suffixes (-01, -02, ...)
      const serialSeq = new Map<string, number>();

      for (const line of purchase.lines) {
        const idsForLine: string[] = [];

        for (let index = 0; index < line.quantity; index += 1) {
          const feesToman = computeFeeShare(line.feesToman, line.quantity, index);

          // Build a serial base for "now". Using UTC keeps ordering consistent across servers.
          const base = baseSerialUTC();

          // Start sequence from what we've already used for this base (in this tx)
          let seq = serialSeq.get(base) ?? 0;

          // Try creating with base, then with -01, -02, ... on unique collisions
          // (also covers collisions from concurrent requests creating the same second)
          let item: { id: string } | null = null;

          for (let attempt = 0; attempt < 8; attempt++) {
            const serial = seq === 0 ? base : `${base}-${String(seq).padStart(2, '0')}`;
            try {
              item = await tx.item.create({
                data: {
                  productId: line.productId,
                  serial,
                  condition: ItemCondition.NEW,
                  status: ItemStatus.IN_STOCK,
                  purchaseToman: line.unitToman,
                  feesToman,
                  refurbToman: 0,
                },
                select: { id: true },
              });

              // success -> bump the counter for this base and break
              serialSeq.set(base, seq + 1);
              break;
            } catch (e: any) {
              if (e?.code === 'P2002') {
                // Unique constraint on serial -> try next suffix
                seq += 1;
                continue;
              }
              throw e; // anything else, bubble up
            }
          }

          if (!item) {
            throw new Error('Failed to allocate unique serial after retries');
          }

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
                select: { id: true, name: true, brand: true, model: true },
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
