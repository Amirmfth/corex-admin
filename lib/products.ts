import { ItemCondition, ItemStatus, Prisma } from '@prisma/client';

import { prisma } from './prisma';

type SearchProductsArgs = {
  query?: string;
  take?: number;
};

export const PRODUCTS_PAGE_SIZE = 20;

export type ProductListFilters = {
  q?: string | null;
  categoryId?: string | null;
  brand?: string | null;
  page?: number;
  pageSize?: number;
};

export type ProductListItem = {
  id: string;
  name: string;
  brand: string | null;
  model: string | null;
  imageUrls: string[];
  category: {
    id: string;
    name: string;
    path: string;
  } | null;
  itemsCount: number;
  createdAt: string;
};

export type ProductListResult = {
  items: ProductListItem[];
  total: number;
  page: number;
  pageSize: number;
};

export type ProductDetail = {
  id: string;
  name: string;
  brand: string | null;
  model: string | null;
  category: {
    id: string;
    name: string;
    path: string;
  } | null;
  imageUrls: string[];
  specsJson: Prisma.JsonValue | null;
  createdAt: string;
  updatedAt: string;
};

export type ProductItemEntry = {
  id: string;
  serial: string;
  condition: ItemCondition;
  status: ItemStatus;
  purchaseToman: number;
  feesToman: number;
  refurbToman: number;
  listedPriceToman: number | null;
  soldPriceToman: number | null;
};

export type ProductSoldItem = {
  id: string;
  soldAt: string;
  soldPriceToman: number;
};

export type ProductDetailResult = {
  product: ProductDetail;
  items: ProductItemEntry[];
  soldItems: ProductSoldItem[];
};

export async function searchProducts({ query, take = 10 }: SearchProductsArgs = {}) {
  const filters = query
    ? [
        { name: { contains: query, mode: Prisma.QueryMode.insensitive } },
        { brand: { contains: query, mode: Prisma.QueryMode.insensitive } },
        { model: { contains: query, mode: Prisma.QueryMode.insensitive } },
      ]
    : undefined;

  const products = await prisma.product.findMany({
    where: filters ? { OR: filters } : undefined,
    select: {
      id: true,
      name: true,
      brand: true,
      model: true,
      imageUrls: true,
    },
    orderBy: {
      updatedAt: 'desc',
    },
    take,
  });

  return products.map((product) => ({
    ...product,
    image: product.imageUrls[0] ?? null,
  }));
}

function buildProductsWhere({ q, categoryId, brand }: ProductListFilters): Prisma.ProductWhereInput {
  const where: Prisma.ProductWhereInput = {};

  if (q && q.trim()) {
    const query = q.trim();
    where.OR = [
      { name: { contains: query, mode: 'insensitive' } },
      { brand: { contains: query, mode: 'insensitive' } },
      { model: { contains: query, mode: 'insensitive' } },
    ];
  }

  if (categoryId) {
    where.categoryId = categoryId;
  }

  if (brand && brand.trim()) {
    where.brand = { equals: brand.trim(), mode: 'insensitive' };
  }

  return where;
}

export async function getProductsList({
  q = null,
  categoryId = null,
  brand = null,
  page = 1,
  pageSize = PRODUCTS_PAGE_SIZE,
}: ProductListFilters = {}): Promise<ProductListResult> {
  const safePage = Math.max(1, page);
  const safePageSize = Math.max(1, Math.min(pageSize, 100));
  const skip = (safePage - 1) * safePageSize;
  const where = buildProductsWhere({ q, categoryId, brand });

  const [items, total] = await Promise.all([
    prisma.product.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take: safePageSize,
      include: {
        category: { select: { id: true, name: true, path: true } },
        _count: { select: { items: true } },
      },
    }),
    prisma.product.count({ where }),
  ]);

  return {
    items: items.map((product) => ({
      id: product.id,
      name: product.name,
      brand: product.brand,
      model: product.model,
      imageUrls: product.imageUrls,
      category: product.category
        ? { id: product.category.id, name: product.category.name, path: product.category.path }
        : null,
      itemsCount: product._count.items,
      createdAt: product.createdAt.toISOString(),
    })),
    total,
    page: safePage,
    pageSize: safePageSize,
  };
}

export async function getProductDetail(productId: string): Promise<ProductDetailResult | null> {
  const product = await prisma.product.findUnique({
    where: { id: productId },
    include: {
      category: { select: { id: true, name: true, path: true } },
    },
  });

  if (!product) {
    return null;
  }

  const [items, soldItems] = await Promise.all([
    prisma.item.findMany({
      where: { productId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        serial: true,
        condition: true,
        status: true,
        purchaseToman: true,
        feesToman: true,
        refurbToman: true,
        listedPriceToman: true,
        soldPriceToman: true,
      },
    }),
    prisma.item.findMany({
      where: { productId, soldAt: { not: null }, status: ItemStatus.SOLD },
      orderBy: { soldAt: 'desc' },
      take: 25,
      select: {
        id: true,
        soldAt: true,
        soldPriceToman: true,
      },
    }),
  ]);

  return {
    product: {
      id: product.id,
      name: product.name,
      brand: product.brand,
      model: product.model,
      category: product.category
        ? { id: product.category.id, name: product.category.name, path: product.category.path }
        : null,
      imageUrls: product.imageUrls,
      specsJson: product.specsJson ?? null,
      createdAt: product.createdAt.toISOString(),
      updatedAt: product.updatedAt.toISOString(),
    },
    items: items.map((item) => ({
      id: item.id,
      serial: item.serial,
      condition: item.condition,
      status: item.status,
      purchaseToman: item.purchaseToman,
      feesToman: item.feesToman,
      refurbToman: item.refurbToman,
      listedPriceToman: item.listedPriceToman,
      soldPriceToman: item.soldPriceToman,
    })),
    soldItems: soldItems
      .filter((item): item is typeof item & { soldAt: Date; soldPriceToman: number } =>
        Boolean(item.soldAt && item.soldPriceToman != null),
      )
      .map((item) => ({
        id: item.id,
        soldAt: item.soldAt.toISOString(),
        soldPriceToman: item.soldPriceToman!,
      })),
  };
}
