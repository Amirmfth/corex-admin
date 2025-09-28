import { ItemCondition, MovementType, Prisma } from '@prisma/client';
import { NextResponse } from 'next/server';

import { prisma } from '../../../../lib/prisma';
import { createItemSchema } from '../../../../lib/validation';

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

function baseSerialUTC(d = new Date()) {
  const yy = String(d.getUTCFullYear()).slice(-2);
  const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(d.getUTCDate()).padStart(2, '0');
  const hh = String(d.getUTCHours()).padStart(2, '0');
  const mi = String(d.getUTCMinutes()).padStart(2, '0');
  const ss = String(d.getUTCSeconds()).padStart(2, '0');
  return `CX-${yy}${mm}${dd}-${hh}${mi}${ss}`;
}

async function createItemWithSerialRetry(
  tx: Prisma.TransactionClient,
  dataBuilder: (serial: string) => Prisma.ItemCreateInput,
) {
  const baseOrProvided = (() => {
    return '';
  })();

  const base = baseOrProvided?.trim() || baseSerialUTC();
  for (let attempt = 0; attempt < 5; attempt++) {
    const serial = attempt === 0 ? base : `${base}-${String(attempt).padStart(2, '0')}`;
    try {
      return await tx.item.create({ data: dataBuilder(serial) });
    } catch (e: any) {
      if (e?.code === 'P2002' && (e?.meta?.target?.includes?.('serial') ?? true)) {
        continue;
      }
      throw e;
    }
  }
  throw new Error('Failed to allocate unique serial after retries');
}

function handlePrismaError(error: unknown) {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === 'P2002') {
      return badRequest('Item with this serial already exists');
    }
  }

  const message = error instanceof Error ? error.message : 'Database error';
  return NextResponse.json({ message }, { status: 500 });
}

export async function POST(request: Request) {
  let payload: unknown;

  try {
    payload = await request.json();
  } catch {
    return badRequest('Invalid JSON body');
  }

  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    return badRequest('Request body must be a JSON object');
  }

  const parsed = createItemSchema.safeParse(payload);

  if (!parsed.success) {
    const message = parsed.error.errors.map((err) => err.message).join(', ');
    return badRequest(message);
  }

  const data = parsed.data;

  try {
    const createdItem = await prisma.$transaction(async (tx) => {
      const item = await createItemWithSerialRetry(tx, (serial) => ({
        product: { connect: { id: data.productId } },
        serial,
        condition: data.condition ?? ItemCondition.USED,
        status: data.status,
        acquiredAt: toDate(data.acquiredAt),
        purchaseToman: data.purchaseToman,
        feesToman: data.feesToman ?? 0,
        refurbToman: data.refurbToman ?? 0,
        location: data.location ?? null,
        listedChannel: data.listedChannel ?? null,
        listedPriceToman: data.listedPriceToman ?? null,
        listedAt: toDate(data.listedAt) ?? null,
        soldAt: toDate(data.soldAt) ?? null,
        soldPriceToman: data.soldPriceToman ?? null,
        saleChannel: data.saleChannel ?? null,
        buyerName: data.buyerName ?? null,
        notes: data.notes ?? null,
        images: data.images ?? [],
      }));

      await tx.inventoryMovement.create({
        data: {
          itemId: item.id,
          movement: MovementType.PURCHASE_IN,
          qty: 1,
        },
      });

      return item;
    });

    return NextResponse.json(createdItem, { status: 201 });
  } catch (error) {
    return handlePrismaError(error);
  }
}
