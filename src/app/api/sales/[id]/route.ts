import { ItemStatus, MovementType, Prisma } from '@prisma/client';
import { NextResponse } from 'next/server';

import { prisma } from '../../../../../lib/prisma';

class RouteError extends Error {
  constructor(readonly status: number, message: string) {
    super(message);
    this.name = 'RouteError';
  }
}

function json(status: number, message: string) {
  return NextResponse.json({ message }, { status });
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  if (!id) {
    return json(400, 'Sale id is required');
  }

  try {
    await prisma.$transaction(async (tx) => {
      const sale = await tx.sale.findUnique({
        where: { id },
        include: { lines: true },
      });

      if (!sale) {
        throw new RouteError(404, 'Sale not found');
      }

      const itemIds = sale.lines
        .map((line) => line.itemId)
        .filter((itemId): itemId is string => Boolean(itemId));

      if (itemIds.length > 0) {
        await tx.item.updateMany({
          where: { id: { in: itemIds } },
          data: {
            status: ItemStatus.LISTED,
            soldAt: null,
            soldPriceToman: null,
            saleChannel: null,
            buyerName: null,
          },
        });

        await tx.inventoryMovement.deleteMany({
          where: {
            itemId: { in: itemIds },
            movement: MovementType.SALE_OUT,
          },
        });
      }

      await tx.saleLine.deleteMany({ where: { saleId: id } });
      await tx.sale.delete({ where: { id } });
    });

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    if (error instanceof RouteError) {
      return json(error.status, error.message);
    }

    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      return json(500, error.message);
    }

    const message = error instanceof Error ? error.message : 'Unable to delete sale';
    return json(500, message);
  }
}
