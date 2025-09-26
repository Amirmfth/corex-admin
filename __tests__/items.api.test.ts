import { MovementType, ItemStatus } from '@prisma/client';
import { NextRequest } from 'next/server';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';


import { prisma } from '../lib/prisma';
import { POST as createMovementRoute } from '../src/app/api/items/[id]/movements/route';
import { PATCH as updateItemRoute } from '../src/app/api/items/[id]/route';
import { POST as createItemRoute } from '../src/app/api/items/route';

const headers = {
  'content-type': 'application/json',
};

const suffix = Date.now();
let productId: string;
let itemId: string;

beforeAll(async () => {
  const product = await prisma.product.create({
    data: {
      name: `Test Inventory Product ${suffix}`,
      brand: 'TestCo',
    },
  });

  productId = product.id;
});

afterAll(async () => {
  if (itemId) {
    await prisma.inventoryMovement.deleteMany({ where: { itemId } });
    await prisma.item.delete({ where: { id: itemId } });
  }

  if (productId) {
    await prisma.product.delete({ where: { id: productId } });
  }
});

describe('Items API routes', () => {
  it('creates an item and logs a purchase movement', async () => {
    const request = new Request('http://localhost/api/items', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        productId,
        serial: `TEST-SERIAL-${suffix}`,
        condition: 'NEW',
        status: 'IN_STOCK',
        purchaseToman: 10_000_000,
        feesToman: 500_000,
        refurbToman: 0,
      }),
    }) as unknown as NextRequest;

    const response = await createItemRoute(request);
    expect(response.status).toBe(201);

    const data = (await response.json()) as { id: string; status: ItemStatus };
    expect(data.status).toBe(ItemStatus.IN_STOCK);

    itemId = data.id;

    const movements = await prisma.inventoryMovement.findMany({ where: { itemId } });
    expect(movements).toHaveLength(1);
    expect(movements[0]?.movement).toBe(MovementType.PURCHASE_IN);
  });

  it('updates an item to SOLD status and logs a sale movement', async () => {
    expect(itemId).toBeTruthy();

    const request = new Request(`http://localhost/api/items/${itemId}`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify({
        status: 'SOLD',
        soldPriceToman: 12_000_000,
        saleChannel: 'DIRECT',
      }),
    }) as unknown as NextRequest;

    const context = { params: Promise.resolve({ id: itemId }) } as { params: Promise<{ id: string }> };
    const response = await updateItemRoute(request, context);
    expect(response.status).toBe(200);

    const data = (await response.json()) as { status: ItemStatus; soldPriceToman: number };
    expect(data.status).toBe(ItemStatus.SOLD);
    expect(data.soldPriceToman).toBe(12_000_000);

    const movements = await prisma.inventoryMovement.findMany({ where: { itemId } });
    expect(movements).toHaveLength(2);
    const saleMovement = movements.find((movement) => movement.movement === MovementType.SALE_OUT);
    expect(saleMovement).toBeTruthy();
  });

  it('allows manual movement append', async () => {
    expect(itemId).toBeTruthy();

    const request = new Request(`http://localhost/api/items/${itemId}/movements`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        movement: 'ADJUSTMENT',
        qty: 2,
        reference: 'TEST-ADJ',
        notes: 'Stock recount',
      }),
    }) as unknown as NextRequest;

    const context = { params: Promise.resolve({ id: itemId }) } as { params: Promise<{ id: string }> };
    const response = await createMovementRoute(request, context);
    expect(response.status).toBe(201);

    const movement = await response.json();
    expect(movement.qty).toBe(2);
    expect(movement.movement).toBe(MovementType.ADJUSTMENT);

    const movements = await prisma.inventoryMovement.findMany({ where: { itemId } });
    expect(movements).toHaveLength(3);
  });
});
