import { MovementType, Prisma } from '@prisma/client';
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { prisma } from "../../../../../../lib/prisma";

const movementSchema = z.object({
  movement: z.nativeEnum(MovementType),
  qty: z
    .number({ invalid_type_error: "qty must be provided as an integer" })
    .int("qty must be an integer")
    .min(1, "qty must be at least 1")
    .optional()
    .default(1),
  reference: z
    .string({ invalid_type_error: "reference cannot be empty" })
    .trim()
    .min(1, "reference cannot be empty")
    .optional(),
  notes: z
    .string({ invalid_type_error: "notes cannot be empty" })
    .trim()
    .min(1, "notes cannot be empty")
    .optional(),
});

function badRequest(message: string) {
  return NextResponse.json({ message }, { status: 400 });
}

function notFound(message = "Item not found") {
  return NextResponse.json({ message }, { status: 404 });
}

function handlePrismaError(error: unknown) {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2003" || error.code === "P2025") {
      return notFound();
    }
  }

  const message = error instanceof Error ? error.message : "Database error";
  return NextResponse.json({ message }, { status: 500 });
}



export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;

  if (!id) {
    return badRequest("Item id is required");
  }

  let payload: unknown;

  try {
    payload = await request.json();
  } catch {
    return badRequest("Invalid JSON body");
  }

  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return badRequest("Request body must be a JSON object");
  }

  const parsed = movementSchema.safeParse(payload);

  if (!parsed.success) {
    const message = parsed.error.errors.map((err) => err.message).join(", ");
    return badRequest(message);
  }

  const data = parsed.data;

  const item = await prisma.item.findUnique({ where: { id } });

  if (!item) {
    return notFound();
  }

  try {
    const movement = await prisma.inventoryMovement.create({
      data: {
        itemId: id,
        movement: data.movement,
        qty: data.qty,
        reference: data.reference ?? null,
        notes: data.notes ?? null,
      },
    });

    return NextResponse.json(movement, { status: 201 });
  } catch (error) {
    return handlePrismaError(error);
  }
}

