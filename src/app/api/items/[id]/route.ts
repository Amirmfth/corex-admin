import { ItemStatus, MovementType, Prisma } from '@prisma/client';
import { NextRequest, NextResponse } from 'next/server';

import { prisma } from '../../../../../lib/prisma';
import { updateItemSchema } from '../../../../../lib/validation';

type DateInput = Date | string | undefined;

function toDate(value: DateInput): Date | undefined {
  if (value == null) {
    return undefined;
  }

  return value instanceof Date ? value : new Date(value);
}

function badRequest(message: string) {
  return NextResponse.json({ message }, { status: 400 });
}

function notFound(message = 'Item not found') {
  return NextResponse.json({ message }, { status: 404 });
}

function handlePrismaError(error: unknown) {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === 'P2002') {
      return badRequest('Item with this serial already exists');
    }

    if (error.code === 'P2025') {
      return notFound();
    }
  }

  const message = error instanceof Error ? error.message : 'Database error';
  return NextResponse.json({ message }, { status: 500 });
}

export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;

  if (!id) {
    return badRequest('Item id is required');
  }

  let payload: unknown;

  try {
    payload = await request.json();
  } catch {
    return badRequest('Invalid JSON body');
  }

  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    return badRequest('Request body must be a JSON object');
  }

  const parsed = updateItemSchema.safeParse(payload);
  console.log(payload)

  if (!parsed.success) {
    const message = parsed.error.errors.map((err) => err.message).join(', ');
    return badRequest(message);
  }

  const data = parsed.data;
  const hasUpdates = Object.values(data).some((value) => value !== undefined);

  if (!hasUpdates) {
    return badRequest('No updates provided');
  }

  const existing = await prisma.item.findUnique({ where: { id } });

  if (!existing) {
    return notFound();
  }

  const statusChangeToSold = data.status === ItemStatus.SOLD && existing.status !== ItemStatus.SOLD;

  if (statusChangeToSold && data.soldPriceToman == null) {
    return badRequest('soldPriceToman is required when marking an item as SOLD');
  }

  const updates: Prisma.ItemUncheckedUpdateInput = {};

  const assign = <Key extends keyof Prisma.ItemUncheckedUpdateInput>(
    key: Key,
    value: Prisma.ItemUncheckedUpdateInput[Key] | undefined,
  ) => {
    if (value !== undefined) {
      updates[key] = value;
    }
  };

  assign('productId', data.productId ?? undefined);
  assign('serial', data.serial ?? undefined);
  assign('condition', data.condition ?? undefined);
  assign('status', data.status ?? undefined);
  assign('acquiredAt', toDate(data.acquiredAt) ?? undefined);
  assign('purchaseToman', data.purchaseToman ?? undefined);
  assign('feesToman', data.feesToman ?? undefined);
  assign('refurbToman', data.refurbToman ?? undefined);
  assign('location', data.location ?? undefined);
  assign('listedChannel', data.listedChannel ?? undefined);
  assign('listedPriceToman', data.listedPriceToman ?? undefined);
  assign('listedAt', toDate(data.listedAt) ?? undefined);
  assign('soldAt', toDate(data.soldAt) ?? undefined);
  assign('soldPriceToman', data.soldPriceToman ?? undefined);
  assign('saleChannel', data.saleChannel ?? undefined);
  assign('buyerName', data.buyerName ?? undefined);
  assign('notes', data.notes ?? undefined);
  assign('images', data.images ?? undefined);

  if (statusChangeToSold && updates.soldAt === undefined) {
    updates.soldAt = new Date();
  }

  try {
    const updatedItem = await prisma.$transaction(async (tx) => {
      const item = await tx.item.update({
        where: { id },
        data: updates,
      });

      if (statusChangeToSold && data.soldPriceToman != null) {
        await tx.inventoryMovement.create({
          data: {
            itemId: id,
            movement: MovementType.SALE_OUT,
            qty: 1,
          },
        });
      }

      return item;
    });

    return NextResponse.json(updatedItem);
  } catch (error) {
    return handlePrismaError(error);
  }
}
