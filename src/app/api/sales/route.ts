import { Channel, ItemStatus, MovementType, Prisma } from '@prisma/client';
import { NextResponse } from "next/server";
import { z } from "zod";


import { prisma } from "../../../../lib/prisma";

class RouteError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = "RouteError";
  }
}

const tomanInt = z
  .number({ invalid_type_error: "unitToman must be provided as a number" })
  .int("unitToman must be an integer")
  .min(0, "unitToman cannot be negative");

const saleLineSchema = z.object({
  itemId: z
    .string({ invalid_type_error: "itemId is required" })
    .trim()
    .min(1, "itemId is required"),
  unitToman: tomanInt,
});

const createSaleSchema = z.object({
  customerName: z
    .string({ invalid_type_error: "customerName is required" })
    .trim()
    .min(1, "customerName is required"),
  channel: z.nativeEnum(Channel),
  reference: z
    .string({ invalid_type_error: "reference cannot be empty" })
    .trim()
    .min(1, "reference cannot be empty")
    .optional(),
  lines: z
    .array(saleLineSchema)
    .min(1, "At least one line item is required"),
});

const DUPLICATE_ITEM_MESSAGE = "Each item can appear only once per sale";

function badRequest(message: string) {
  return NextResponse.json({ message }, { status: 400 });
}

function handleError(error: unknown) {
  if (error instanceof RouteError) {
    return NextResponse.json({ message: error.message }, { status: error.status });
  }

  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }

  const message = error instanceof Error ? error.message : "Unexpected error";
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

  const parsed = createSaleSchema.safeParse(payload);

  if (!parsed.success) {
    const message = parsed.error.errors.map((err) => err.message).join(", ");
    return badRequest(message);
  }

  const data = parsed.data;

  const uniqueItemIds = new Set<string>();
  for (const line of data.lines) {
    if (uniqueItemIds.has(line.itemId)) {
      return badRequest(DUPLICATE_ITEM_MESSAGE);
    }

    uniqueItemIds.add(line.itemId);
  }

  const totalToman = data.lines.reduce((total, line) => total + line.unitToman, 0);

  try {
    const sale = await prisma.$transaction(async (tx) => {
      const itemIds = Array.from(uniqueItemIds);
      const items = await tx.item.findMany({
        where: {
          id: {
            in: itemIds,
          },
        },
        select: {
          id: true,
          status: true,
          productId: true,
        },
      });

      if (items.length !== itemIds.length) {
        const foundIds = new Set(items.map((item) => item.id));
        const missing = itemIds.filter((id) => !foundIds.has(id));
        throw new RouteError(404, `Item(s) not found: ${missing.join(", ")}`);
      }

      const itemsById = new Map(items.map((item) => [item.id, item]));

      for (const line of data.lines) {
        const item = itemsById.get(line.itemId);

        if (!item) {
          throw new RouteError(404, `Item not found: ${line.itemId}`);
        }

        if (item.status === ItemStatus.SOLD) {
          throw new RouteError(400, `Item ${line.itemId} is already sold`);
        }
      }

      const saleRecord = await tx.sale.create({
        data: {
          customerName: data.customerName,
          channel: data.channel,
          reference: data.reference ?? null,
          totalToman,
          lines: {
            create: data.lines.map((line) => {
              const item = itemsById.get(line.itemId)!;
              return {
                itemId: line.itemId,
                productId: item.productId,
                unitToman: line.unitToman,
              };
            }),
          },
        },
        include: {
          lines: true,
        },
      });

      for (const line of data.lines) {
        const soldAt = new Date();

        await tx.item.update({
          where: { id: line.itemId },
          data: {
            status: ItemStatus.SOLD,
            soldAt,
            soldPriceToman: line.unitToman,
            saleChannel: data.channel,
            buyerName: data.customerName,
          },
        });

        await tx.inventoryMovement.create({
          data: {
            itemId: line.itemId,
            movement: MovementType.SALE_OUT,
            qty: 1,
            reference: data.reference ?? null,
          },
        });
      }

      return saleRecord;
    });

    return NextResponse.json(sale, { status: 201 });
  } catch (error) {
    return handleError(error);
  }
}
