import { Prisma } from "@prisma/client";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getTranslations } from "next-intl/server";

import { resolveRequestLocale } from "../../../../../lib/api-locale";
import { prisma } from "../../../../../lib/prisma";
import { updateProductSchema } from "../../../../../lib/validation.product";
import { BadRequestError, NotFoundError, handleApiError, parseJsonBody } from "../_utils";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(_request: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  try {
    const product = await prisma.product.findUnique({
      where: { id },
      include: {
        category: { select: { id: true, name: true, slug: true, path: true } },
        _count: { select: { items: true } },
      },
    });

    if (!product) {
      throw new NotFoundError("Product not found");
    }

    const soldItems = await prisma.item.findMany({
      where: { productId: id, soldAt: { not: null } },
      select: { id: true, soldAt: true, soldPriceToman: true },
      orderBy: { soldAt: "desc" },
      take: 25,
    });

    return NextResponse.json({ ...product, soldItems });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  try {
    const payload = await parseJsonBody(request, updateProductSchema);

    if (Object.keys(payload).length === 0) {
      throw new BadRequestError("Request body cannot be empty");
    }

    const data: Prisma.ProductUpdateInput = {};

    if (typeof payload.name === 'string') {
      data.name = payload.name;
    }

    if (payload.brand !== undefined) {
      data.brand = { set: payload.brand };
    }

    if (payload.model !== undefined) {
      data.model = { set: payload.model };
    }

    if (payload.categoryId !== undefined) {
      data.category = payload.categoryId
        ? { connect: { id: payload.categoryId } }
        : { disconnect: true };
    }

    if (payload.specsJson !== undefined) {
      data.specsJson =
        payload.specsJson === null
          ? Prisma.JsonNull
          : (payload.specsJson as Prisma.InputJsonValue);
    }

    if (payload.imageUrls !== undefined) {
      data.imageUrls = payload.imageUrls;
    }

    const product = await prisma.product.update({
      where: { id },
      data,
      include: {
        category: { select: { id: true, name: true, slug: true, path: true } },
        _count: { select: { items: true } },
      },
    });

    return NextResponse.json(product);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  try {
    const locale = resolveRequestLocale(request);
    const t = await getTranslations({ locale, namespace: "products" });
    const product = await prisma.product.findUnique({
      where: { id },
      select: { id: true, _count: { select: { items: true } } },
    });

    if (!product) {
      throw new NotFoundError("Product not found");
    }

    if (product._count.items > 0) {
      throw new BadRequestError(t("delete.hasItems"));
    }

    await prisma.product.delete({ where: { id } });

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return handleApiError(error);
  }
}
