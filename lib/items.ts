import type { Prisma } from '@prisma/client';
import { Channel, ItemCondition, ItemStatus } from '@prisma/client';

import { prisma } from './prisma';

export const ITEMS_PAGE_SIZE = 20;

export type ItemsListFilters = {
  statuses?: ItemStatus[];
  conditions?: ItemCondition[];
  categoryId?: string | null;
  search?: string | null;
  page?: number;
};

export type ItemsListItem = {
  id: string;
  product: {
    id: string;
    name: string;
    imageUrls: string[];
    brand: string | null;
    model: string | null;
    categoryId: string | null;
    categoryName: string | null;
  };
  serial: string;
  condition: ItemCondition;
  status: ItemStatus;
  purchaseToman: number;
  feesToman: number;
  refurbToman: number;
  listedPriceToman: number | null;
  listedChannel: Channel | null;
  imageUrls: string[];
  acquiredAt: string;
  location: string | null;
};

export type ItemsListResult = {
  items: ItemsListItem[];
  total: number;
  categories: {
    id: string;
    name: string;
  }[];
};

function buildSearchWhere(term: string): Prisma.ItemWhereInput['OR'] | undefined {
  const normalized = term.trim();
  if (!normalized) {
    return undefined;
  }

  return [
    { serial: { contains: normalized, mode: 'insensitive' } },
    { product: { name: { contains: normalized, mode: 'insensitive' } } },
    { product: { model: { contains: normalized, mode: 'insensitive' } } },
    { product: { brand: { contains: normalized, mode: 'insensitive' } } },
  ];
}

export async function getItemsList({
  statuses,
  conditions,
  categoryId,
  search,
  page = 1,
}: ItemsListFilters): Promise<ItemsListResult> {
  const where: Prisma.ItemWhereInput = {};

  if (statuses && statuses.length > 0) {
    where.status = { in: statuses };
  }

  if (conditions && conditions.length > 0) {
    where.condition = { in: conditions };
  }

  if (categoryId) {
    where.product = {
      is: {
        categoryId,
      },
    };
  }

  const searchOr = search ? buildSearchWhere(search) : undefined;
  if (searchOr) {
    where.OR = searchOr;
  }

  const skip = (Math.max(page, 1) - 1) * ITEMS_PAGE_SIZE;

  const [items, total, categories] = await Promise.all([
    prisma.item.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take: ITEMS_PAGE_SIZE,
      include: {
        product: {
          select: {
            id: true,
            name: true,
            imageUrls: true,
            brand: true,
            model: true,
            categoryId: true,
            category: {
              select: {
                name: true,
              },
            },
          },
        },
      },
    }),
    prisma.item.count({ where }),
    prisma.category.findMany({
      orderBy: { name: 'asc' },
      select: {
        id: true,
        name: true,
      },
    }),
  ]);

  return {
    items: items.map((item) => ({
      id: item.id,
      product: {
        id: item.product.id,
        name: item.product.name,
        imageUrls: item.product.imageUrls,
        brand: item.product.brand,
        model: item.product.model,
        categoryId: item.product.categoryId,
        categoryName: item.product.category?.name ?? null,
      },
      serial: item.serial,
      condition: item.condition,
      status: item.status,
      purchaseToman: item.purchaseToman,
      feesToman: item.feesToman,
      refurbToman: item.refurbToman,
      listedPriceToman: item.listedPriceToman,
      listedChannel: item.listedChannel,
      imageUrls: item.images,
      acquiredAt: item.acquiredAt.toISOString(),
      location: item.location,
    })),
    total,
    categories,
  };
}

export async function getItemDetail(id: string) {
  return prisma.item.findUnique({
    where: { id },
    include: {
      product: {
        select: {
          id: true,
          name: true,
          brand: true,
          model: true,
          imageUrls: true,
          specsJson: true,
          category: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      },
      movements: {
        orderBy: { createdAt: 'desc' },
      },
    },
  });
}

export async function getSellableItems(search?: string) {
  const where: Prisma.ItemWhereInput = {
    status: { in: [ItemStatus.IN_STOCK, ItemStatus.LISTED] },
  };

  if (search && search.trim()) {
    const term = search.trim();
    where.OR = [
      { serial: { contains: term, mode: 'insensitive' } },
      { product: { name: { contains: term, mode: 'insensitive' } } },
      { product: { brand: { contains: term, mode: 'insensitive' } } },
      { product: { model: { contains: term, mode: 'insensitive' } } },
    ];
  }

  return prisma.item.findMany({
    where,
    take: 20,
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      serial: true,
      status: true,
      listedPriceToman: true,
      listedChannel: true,
      purchaseToman: true,
      feesToman: true,
      refurbToman: true,
      images: true,
      product: {
        select: {
          id: true,
          name: true,
          brand: true,
          model: true,
          imageUrls: true,
        },
      },
    },
  });
}
