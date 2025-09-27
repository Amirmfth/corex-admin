import { ItemStatus } from '@prisma/client';
import {
  addMonths,
  differenceInCalendarDays,
  endOfMonth,
  format,
  startOfMonth,
  subDays,
  subMonths,
} from 'date-fns';

import { prisma } from './prisma';

const ACTIVE_STATUSES: ItemStatus[] = [
  ItemStatus.IN_STOCK,
  ItemStatus.LISTED,
  ItemStatus.RESERVED,
];

export type AgingBucketKey = '0-30' | '31-90' | '91-180' | '181+';

export type AgingBuckets = Record<AgingBucketKey, { count: number; totalT: number }>;

export type MonthlyPnlPoint = {
  month: string;
  revenueT: number;
  costT: number;
  profitT: number;
};

export type WatchlistItem = {
  id: string;
  productName: string;
  serial: string;
  acquiredAt: string;
  costToman: number;
  listedPriceToman: number | null;
  daysInStock: number;
};

export type StaleListedItem = {
  id: string;
  productName: string;
  serial: string;
  listedAt: string;
  listedPriceToman: number | null;
  costToman: number;
  daysListed: number;
};

function computeCost(item: {
  purchaseToman: number;
  feesToman: number;
  refurbToman: number;
}): number {
  return (item.purchaseToman ?? 0) + (item.feesToman ?? 0) + (item.refurbToman ?? 0);
}

export async function getInventoryValue(): Promise<number> {
  const aggregate = await prisma.item.aggregate({
    where: {
      status: { in: ACTIVE_STATUSES },
    },
    _sum: {
      purchaseToman: true,
      feesToman: true,
      refurbToman: true,
    },
  });

  const purchase = aggregate._sum.purchaseToman ?? 0;
  const fees = aggregate._sum.feesToman ?? 0;
  const refurb = aggregate._sum.refurbToman ?? 0;

  return purchase + fees + refurb;
}

export async function getProfitMTD(): Promise<number> {
  const now = new Date();
  const start = startOfMonth(now);
  const end = endOfMonth(now);

  const soldItems = await prisma.item.findMany({
    where: {
      status: ItemStatus.SOLD,
      soldAt: {
        gte: start,
        lte: end,
      },
      soldPriceToman: { not: null },
    },
    select: {
      soldPriceToman: true,
      purchaseToman: true,
      feesToman: true,
      refurbToman: true,
    },
  });

  return soldItems.reduce((total, item) => {
    const sale = item.soldPriceToman ?? 0;
    const cost = computeCost(item);
    return total + (sale - cost);
  }, 0);
}

export async function getItemsInStockCount(): Promise<number> {
  return prisma.item.count({
    where: {
      status: ItemStatus.IN_STOCK,
    },
  });
}

export async function getAvgDaysInStock(): Promise<number> {
  const items = await prisma.item.findMany({
    where: {
      status: { in: ACTIVE_STATUSES },
    },
    select: {
      acquiredAt: true,
    },
  });

  if (items.length === 0) {
    return 0;
  }

  const now = new Date();
  const totalDays = items.reduce((total, item) => {
    return total + differenceInCalendarDays(now, item.acquiredAt);
  }, 0);

  return totalDays / items.length;
}

export async function getMonthlyPnl({ months }: { months: number }): Promise<MonthlyPnlPoint[]> {
  const now = new Date();
  const start = startOfMonth(subMonths(now, months - 1));
  const end = endOfMonth(now);

  const soldItems = await prisma.item.findMany({
    where: {
      status: ItemStatus.SOLD,
      soldAt: {
        gte: start,
        lte: end,
      },
      soldPriceToman: { not: null },
    },
    select: {
      soldAt: true,
      soldPriceToman: true,
      purchaseToman: true,
      feesToman: true,
      refurbToman: true,
    },
  });

  const buckets = new Map<string, MonthlyPnlPoint>();

  for (let i = 0; i < months; i += 1) {
    const monthDate = startOfMonth(addMonths(start, i));
    const key = format(monthDate, 'yyyy-MM');
    buckets.set(key, {
      month: key,
      revenueT: 0,
      costT: 0,
      profitT: 0,
    });
  }

  soldItems.forEach((item) => {
    if (!item.soldAt) {
      return;
    }
    const key = format(startOfMonth(item.soldAt), 'yyyy-MM');
    const bucket = buckets.get(key);
    if (!bucket) {
      return;
    }
    const sale = item.soldPriceToman ?? 0;
    const cost = computeCost(item);
    bucket.revenueT += sale;
    bucket.costT += cost;
    bucket.profitT += sale - cost;
  });

  return Array.from(buckets.values()).sort((a, b) => a.month.localeCompare(b.month));
}

export async function getAgingBuckets(): Promise<AgingBuckets> {
  const items = await prisma.item.findMany({
    where: {
      status: { in: ACTIVE_STATUSES },
    },
    select: {
      acquiredAt: true,
      purchaseToman: true,
      feesToman: true,
      refurbToman: true,
    },
  });

  const now = new Date();

  const result: AgingBuckets = {
    '0-30': { count: 0, totalT: 0 },
    '31-90': { count: 0, totalT: 0 },
    '91-180': { count: 0, totalT: 0 },
    '181+': { count: 0, totalT: 0 },
  };

  items.forEach((item) => {
    const age = differenceInCalendarDays(now, item.acquiredAt);
    const cost = computeCost(item);
    if (age <= 30) {
      result['0-30'].count += 1;
      result['0-30'].totalT += cost;
    } else if (age <= 90) {
      result['31-90'].count += 1;
      result['31-90'].totalT += cost;
    } else if (age <= 180) {
      result['91-180'].count += 1;
      result['91-180'].totalT += cost;
    } else {
      result['181+'].count += 1;
      result['181+'].totalT += cost;
    }
  });

  return result;
}

export async function getAgingWatchlist(): Promise<{
  over90: WatchlistItem[];
  over180: WatchlistItem[];
}> {
  const items = await prisma.item.findMany({
    where: {
      status: { in: ACTIVE_STATUSES },
    },
    select: {
      id: true,
      acquiredAt: true,
      purchaseToman: true,
      feesToman: true,
      refurbToman: true,
      listedPriceToman: true,
      product: {
        select: {
          name: true,
          brand: true,
          model: true,
        },
      },
      serial: true,
    },
  });

  const now = new Date();
  const watchlist = items
    .map((item) => {
      const days = differenceInCalendarDays(now, item.acquiredAt);
      const productParts = [item.product?.brand, item.product?.name, item.product?.model].filter(Boolean);
      const productName = productParts.join(' ');
      return {
        id: item.id,
        productName: productName || item.product?.name || '—',
        serial: item.serial,
        acquiredAt: item.acquiredAt.toISOString(),
        costToman: computeCost(item),
        listedPriceToman: item.listedPriceToman,
        daysInStock: days,
      };
    })
    .sort((a, b) => b.daysInStock - a.daysInStock);

  const over90 = watchlist.filter((item) => item.daysInStock > 90).slice(0, 10);
  const over180 = watchlist.filter((item) => item.daysInStock > 180).slice(0, 10);

  return { over90, over180 };
}

export async function getStaleListed({ days }: { days: 30 | 60 }): Promise<StaleListedItem[]> {
  const now = new Date();
  const minDate = subDays(now, days);

  const items = await prisma.item.findMany({
    where: {
      status: ItemStatus.LISTED,
      listedAt: {
        not: null,
        lte: minDate,
      },
    },
    orderBy: {
      listedAt: 'asc',
    },
    take: 10,
    select: {
      id: true,
      serial: true,
      listedAt: true,
      listedPriceToman: true,
      purchaseToman: true,
      feesToman: true,
      refurbToman: true,
      product: {
        select: {
          name: true,
          brand: true,
          model: true,
        },
      },
    },
  });

  return items.map((item) => {
    const productParts = [item.product?.brand, item.product?.name, item.product?.model].filter(Boolean);
    const productName = productParts.join(' ');
    const listedAt = item.listedAt ?? now;
    const daysListed = differenceInCalendarDays(now, listedAt);

    return {
      id: item.id,
      productName: productName || item.product?.name || '—',
      serial: item.serial,
      listedAt: listedAt.toISOString(),
      listedPriceToman: item.listedPriceToman,
      costToman: computeCost(item),
      daysListed,
    };
  });
}
