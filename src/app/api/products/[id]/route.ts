import type { Prisma } from '@prisma/client';
import { NextResponse } from 'next/server';
import { getTranslations } from 'next-intl/server';

import { resolveRequestLocale } from '../../../../../lib/api-locale';
import { prisma } from '../../../../../lib/prisma';
import { updateProductSchema } from '../../../../../lib/validation.product';
import { BadRequestError, NotFoundError, handleApiError, parseJsonBody } from '../_utils';

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const product = await prisma.product.findUnique({
      where: { id },
      include: {
        category: { select: { id: true, name: true, slug: true, path: true } },
        _count: { select: { items: true } },
      },
    });

    if (!product) {
      throw new NotFoundError('Product not found');
    }

    const soldItems = await prisma.item.findMany({
      where: { productId: id, soldAt: { not: null } },
      select: { id: true, soldAt: true, soldPriceToman: true },
      orderBy: { soldAt: 'desc' },
      take: 25,
    });

    return NextResponse.json({ ...product, soldItems });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const payload = await parseJsonBody(request, updateProductSchema);

    if (Object.keys(payload).length === 0) {
      throw new BadRequestError('Request body cannot be empty');
    }

    const data: Prisma.ProductUncheckedUpdateInput = {};

    if (payload.name !== undefined && payload.name !== null) {
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
      data.specsJson = payload.specsJson as Prisma.InputJsonValue;
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

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const locale = resolveRequestLocale(request);
    const t = await getTranslations({ locale, namespace: 'products' });
    const product = await prisma.product.findUnique({
      where: { id },
      select: { id: true, _count: { select: { items: true } } },
    });

    if (!product) {
      throw new NotFoundError('Product not found');
    }

    if (product._count.items > 0) {
      throw new BadRequestError(t('delete.hasItems'));
    }

    await prisma.product.delete({ where: { id } });

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return handleApiError(error);
  }
}
