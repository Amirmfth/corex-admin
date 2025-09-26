import { MovementType } from '@prisma/client';
import { NextRequest } from 'next/server';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';


import { prisma } from '../lib/prisma';
import { POST as receivePurchaseRoute } from '../src/app/api/purchases/[id]/receive/route';
import { POST as createPurchaseRoute } from '../src/app/api/purchases/route';

const headers = {
  'content-type': 'application/json',
};

const suffix = Date.now();
let productIdA: string;
let productIdB: string;
let purchaseId: string;

beforeAll(async () => {
  const [productA, productB] = await Promise.all([
    prisma.product.create({
      data: {
        name: `Purchase Product ${suffix}-A`,
      },
    }),
    prisma.product.create({
      data: {
        name: `Purchase Product ${suffix}-B`,
      },
    }),
  ]);

  productIdA = productA.id;
  productIdB = productB.id;
});

afterAll(async () => {
  if (purchaseId) {
    const lines = await prisma.purchaseLine.findMany({
      where: { purchaseId },
      select: { createdItemIds: true },
    });

    const itemIds = lines.flatMap((line) => line.createdItemIds);

    if (itemIds.length > 0) {
      await prisma.inventoryMovement.deleteMany({ where: { itemId: { in: itemIds } } });
      await prisma.item.deleteMany({ where: { id: { in: itemIds } } });
    }

    await prisma.purchaseLine.deleteMany({ where: { purchaseId } });
    await prisma.purchase.delete({ where: { id: purchaseId } }).catch(() => {});
  }

  await prisma.product.deleteMany({
    where: { id: { in: [productIdA, productIdB].filter(Boolean) as string[] } },
  });
});

describe('Purchases API routes', () => {
  it('creates a purchase with two lines', async () => {
    const request = new Request('http://localhost/api/purchases', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        supplierName: 'Test Supplier',
        reference: 'PO-123',
        lines: [
          {
            productId: productIdA,
            quantity: 2,
            unitToman: 5_000_000,
            feesToman: 200_000,
          },
          {
            productId: productIdB,
            quantity: 1,
            unitToman: 7_500_000,
            feesToman: 0,
          },
        ],
      }),
    }) as unknown as NextRequest;

    const response = await createPurchaseRoute(request);
    expect(response.status).toBe(201);

    const purchase = await response.json();
    purchaseId = purchase.id;

    expect(purchase.supplierName).toBe('Test Supplier');
    expect(Array.isArray(purchase.lines)).toBe(true);
    expect(purchase.lines).toHaveLength(2);
    expect(purchase.totalToman).toBe(5_000_000 * 2 + 200_000 + 7_500_000);
  });

  it('receives a purchase into inventory', async () => {
    expect(purchaseId).toBeTruthy();

    const request = new Request(`http://localhost/api/purchases/${purchaseId}/receive`, {
      method: 'POST',
    }) as unknown as NextRequest;

    const response = await receivePurchaseRoute(request, {
      params: Promise.resolve({ id: purchaseId }),
    });

    expect([200, 201]).toContain(response.status);

    const payload = await response.json();
    expect(payload.purchase.id).toBe(purchaseId);
    expect(
      payload.purchase.lines.every(
        (line: { createdItemIds: string[]; quantity: number }) =>
          line.createdItemIds.length === line.quantity,
      ),
    ).toBe(true);

    const itemIds = payload.createdItems as string[];
    expect(itemIds.length).toBeGreaterThan(0);

    const items = await prisma.item.findMany({ where: { id: { in: itemIds } } });
    expect(items).toHaveLength(itemIds.length);
    items.forEach((item) => {
      expect(item.status).toBe('IN_STOCK');
      expect(item.purchaseToman).toBeGreaterThan(0);
    });

    const movements = await prisma.inventoryMovement.findMany({
      where: { itemId: { in: itemIds } },
    });
    expect(movements).toHaveLength(itemIds.length);
    movements.forEach((movement) => {
      expect(movement.movement).toBe(MovementType.PURCHASE_IN);
    });
  });

  it('does not create duplicate items when receiving twice', async () => {
    expect(purchaseId).toBeTruthy();

    const request = new Request(`http://localhost/api/purchases/${purchaseId}/receive`, {
      method: 'POST',
    }) as unknown as NextRequest;

    const response = await receivePurchaseRoute(request, {
      params: Promise.resolve({ id: purchaseId }),
    });

    expect(response.status).toBe(200);

    const payload = await response.json();
    expect(payload.alreadyReceived).toBe(true);

    const line = await prisma.purchaseLine.findFirstOrThrow({ where: { purchaseId } });
    expect(line.createdItemIds.length).toBeGreaterThan(0);
  });

  it('returns not found for missing purchases', async () => {
    const request = new Request('http://localhost/api/purchases/missing/receive', {
      method: 'POST',
    }) as unknown as NextRequest;

    const response = await receivePurchaseRoute(request, {
      params: Promise.resolve({ id: 'missing-purchase' }),
    });

    expect(response.status).toBe(404);
  });
});
