import type { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";

import { prisma } from "../../../../../lib/prisma";
import { updateProductSchema } from "../../../../../lib/validation.product";
import { BadRequestError, NotFoundError, handleApiError, parseJsonBody } from "../_utils";

export async function GET(_: Request, { params }: { params: { id: string } }) {
  try {
    const product = await prisma.product.findUnique({
      where: { id: params.id },
      include: {
        category: { select: { id: true, name: true, slug: true } },
        _count: { select: { items: true } },
      },
    });

    if (!product) {
      throw new NotFoundError("Product not found");
    }

    const soldItems = await prisma.item.findMany({
      where: { productId: params.id, soldAt: { not: null } },
      select: { id: true, soldAt: true, soldPriceToman: true },
      orderBy: { soldAt: "desc" },
      take: 10,
    });

    return NextResponse.json({ ...product, soldItems });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  try {
    const payload = await parseJsonBody(request, updateProductSchema);

    if (Object.keys(payload).length === 0) {
      throw new BadRequestError("Request body cannot be empty");
    }

    const data: Prisma.ProductUpdateInput = {};

    if (payload.name !== undefined) {
      data.name = payload.name;
    }

    if (payload.brand !== undefined) {
      data.brand = payload.brand ?? null;
    }

    if (payload.model !== undefined) {
      data.model = payload.model ?? null;
    }

    if (payload.categoryId !== undefined) {
      data.categoryId = payload.categoryId ?? null;
    }

    if (payload.specsJson !== undefined) {
      data.specsJson = payload.specsJson as Prisma.JsonValue;
    }

    if (payload.imageUrls !== undefined) {
      data.imageUrls = payload.imageUrls;
    }

    const product = await prisma.product.update({
      where: { id: params.id },
      data,
      include: {
        category: { select: { id: true, name: true, slug: true } },
        _count: { select: { items: true } },
      },
    });

    return NextResponse.json(product);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(_: Request, { params }: { params: { id: string } }) {
  try {
    const product = await prisma.product.findUnique({
      where: { id: params.id },
      select: { id: true, _count: { select: { items: true } } },
    });

    if (!product) {
      throw new NotFoundError("Product not found");
    }

    if (product._count.items > 0) {
      throw new BadRequestError("Cannot delete a product that still has inventory items");
    }

    await prisma.product.delete({ where: { id: params.id } });

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return handleApiError(error);
  }
}
