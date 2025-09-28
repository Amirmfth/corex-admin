import { Prisma } from '@prisma/client';
import { NextResponse } from 'next/server';

import { deleteItemsCascade } from '../../../../../lib/items';
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
    return json(400, 'Purchase id is required');
  }

  try {
    await prisma.$transaction(async (tx) => {
      const purchase = await tx.purchase.findUnique({
        where: { id },
        include: { lines: true },
      });

      if (!purchase) {
        throw new RouteError(404, 'Purchase not found');
      }

      const itemIds = purchase.lines.flatMap((line) => line.createdItemIds);

      if (itemIds.length > 0) {
        await deleteItemsCascade(tx, itemIds);
      }

      await tx.purchaseLine.deleteMany({ where: { purchaseId: id } });
      await tx.purchase.delete({ where: { id } });
    });

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    if (error instanceof RouteError) {
      return json(error.status, error.message);
    }

    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      return json(500, error.message);
    }

    const message = error instanceof Error ? error.message : 'Unable to delete purchase';
    return json(500, message);
  }
}
