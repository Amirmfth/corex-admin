import { ItemCondition, ItemStatus, MovementType } from '@prisma/client';
import { NextRequest } from 'next/server';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';


import { prisma } from '../lib/prisma';
import { POST as createSaleRoute } from '../src/app/api/sales/route';

const headers = {
  'content-type': 'application/json',
};

const suffix = Date.now();
let productId: string;
let firstItemId: string;
let secondItemId: string;
let saleId: string;

beforeAll(async () => {
  const product = await prisma.product.create({
    data: {
      name: `Sale Test Product ${suffix}`,
    },
  });

  productId = product.id;

  const [firstItem, secondItem] = await Promise.all([
    prisma.item.create({
      data: {
        productId,
        serial: `SALE-ITEM-${suffix}-A`,
        condition: ItemCondition.NEW,
        status: ItemStatus.IN_STOCK,
        purchaseToman: 9_000_000,
        feesToman: 250_000,
        refurbToman: 0,
      },
    }),
    prisma.item.create({
      data: {
        productId,
        serial: `SALE-ITEM-${suffix}-B`,
        condition: ItemCondition.USED,
        status: ItemStatus.LISTED,
        purchaseToman: 7_500_000,
        feesToman: 150_000,
        refurbToman: 400_000,
        listedPriceToman: 9_200_000,
      },
    }),
  ]);

  firstItemId = firstItem.id;
  secondItemId = secondItem.id;
});

afterAll(async () => {
  if (saleId) {
    await prisma.inventoryMovement.deleteMany({
      where: { itemId: { in: [firstItemId, secondItemId].filter(Boolean) as string[] } },
    });
    await prisma.saleLine.deleteMany({ where: { saleId } });
    await prisma.sale.delete({ where: { id: saleId } }).catch(() => {});
  }

  await prisma.item.deleteMany({
    where: {
      id: {
        in: [firstItemId, secondItemId].filter(Boolean) as string[],
      },
    },
  }).catch(() => {});

  if (productId) {
    await prisma.product.delete({ where: { id: productId } }).catch(() => {});
  }
});

describe('Sales API route', () => {
  it(
    'creates a sale with two line items',
    async () => {
      const request = new Request('http://localhost/api/sales', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          customerName: 'Test Buyer',
          channel: 'DIRECT',
          reference: 'SO-TEST-001',
          lines: [
            {
              itemId: firstItemId,
              unitToman: 12_500_000,
            },
            {
              itemId: secondItemId,
              unitToman: 9_500_000,
            },
          ],
        }),
      }) as unknown as NextRequest;

      const response = await createSaleRoute(request);
      expect(response.status).toBe(201);

      const sale = await response.json();
      saleId = sale.id;

      expect(sale.totalToman).toBe(22_000_000);
      expect(Array.isArray(sale.lines)).toBe(true);
      expect(sale.lines).toHaveLength(2);

      const [firstItem, secondItem, movements] = await Promise.all([
        prisma.item.findUnique({ where: { id: firstItemId } }),
        prisma.item.findUnique({ where: { id: secondItemId } }),
        prisma.inventoryMovement.findMany({
          where: {
            itemId: {
              in: [firstItemId, secondItemId],
            },
          },
        }),
      ]);

      expect(firstItem?.status).toBe(ItemStatus.SOLD);
      expect(secondItem?.status).toBe(ItemStatus.SOLD);
      expect(firstItem?.soldPriceToman).toBe(12_500_000);
      expect(secondItem?.soldPriceToman).toBe(9_500_000);

      const saleMovements = movements.filter((movement) => movement.movement === MovementType.SALE_OUT);
      expect(saleMovements).toHaveLength(2);
      saleMovements.forEach((movement) => {
        expect([firstItemId, secondItemId]).toContain(movement.itemId);
      });
    },
    20000,
  );
});
