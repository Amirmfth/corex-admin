import { ItemCondition, MovementType, Prisma } from '@prisma/client';
import { NextResponse } from "next/server";

import { prisma } from "../../../../lib/prisma";
import { createItemSchema } from "../../../../lib/validation";

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

function handlePrismaError(error: unknown) {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2002") {
      return badRequest("Item with this serial already exists");
    }
  }

  const message = error instanceof Error ? error.message : "Database error";
  return NextResponse.json({ message }, { status: 500 });
}

export async function POST(request: Request) {
  let payload: unknown;

  try {
    payload = await request.json();
  } catch {
    return badRequest("Invalid JSON body");
  }

  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return badRequest("Request body must be a JSON object");
  }

  const parsed = createItemSchema.safeParse(payload);

  if (!parsed.success) {
    const message = parsed.error.errors.map((err) => err.message).join(", ");
    return badRequest(message);
  }

  const data = parsed.data;

  try {
    const createdItem = await prisma.$transaction(async (tx) => {
      const item = await tx.item.create({
        data: {
          productId: data.productId,
          serial: data.serial,
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
        },
      });

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
