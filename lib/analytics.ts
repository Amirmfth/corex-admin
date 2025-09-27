import { Channel, ItemStatus } from '@prisma/client';
import {
  addMonths,
  differenceInCalendarDays,
  endOfMonth,
  format,
  startOfMonth,
  subDays,
  subMonths,
} from 'date-fns';
import { cache as reactCache } from 'react';

import { getBusinessRulesSettings, buildAgingBucketDefinitions } from '@/lib/app-settings';
import { prisma } from './prisma';

const cache: <T extends (...args: any[]) => any>(fn: T) => T =
  typeof reactCache === 'function'
    ? reactCache
    : ((fn) => fn);

function serializeFilter(value: unknown): string {
  if (value === null || typeof value !== 'object') {
    return JSON.stringify(value);
  }

  if (Array.isArray(value)) {
    return `[${value.map((entry) => serializeFilter(entry)).join(',')}]`;
  }

  const entries = Object.entries(value as Record<string, unknown>)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, entry]) => `${JSON.stringify(key)}:${serializeFilter(entry)}`);

  return `{${entries.join(',')}}`;
}

function createFilterKey(namespace: string, filter?: unknown): string {
  if (typeof filter === 'undefined') {
    return namespace;
  }

  return `${namespace}:${serializeFilter(filter)}`;
}

const ACTIVE_STATUSES: ItemStatus[] = [
  ItemStatus.IN_STOCK,
  ItemStatus.LISTED,
  ItemStatus.RESERVED,
];

const INVENTORY_STATUS_KEYS = [
  ItemStatus.IN_STOCK,
  ItemStatus.LISTED,
  ItemStatus.RESERVED,
] as const;

type InventoryStatusKey = (typeof INVENTORY_STATUS_KEYS)[number];

type StatusSummary = { count: number; totalCostT: number };

export type InventoryBreakdownRow = {
  categoryId: string | null;
  categoryName: string;
  statuses: Record<InventoryStatusKey, StatusSummary>;
  totalCount: number;
  totalCostT: number;
};

export type InventoryBreakdown = {
  rows: InventoryBreakdownRow[];
  grandTotals: {
    statuses: Record<InventoryStatusKey, StatusSummary>;
    totalCount: number;
    totalCostT: number;
  };
};

export type ChannelMixRequest = {
  from: Date;
  to: Date;
};

export type ChannelMixEntry = {
  channel: Channel | 'UNKNOWN';
  count: number;
  revenueT: number;
};

export type TopProductsByProfitRequest = {
  from: Date;
  to: Date;
  limit?: number;
};

export type TopProductByProfit = {
  productId: string;
  productName: string;
  unitsSold: number;
  totalProfitT: number;
  averageProfitT: number;
  medianSoldPriceT: number;
};

export type RepairRoiRequest = {
  from: Date;
  to: Date;
};

export type RepairRoiSummary = {
  refurbCount: number;
  totalRefurbCostT: number;
  totalRefurbProfitT: number;
  peerBaselineProfitT: number;
  extraMarginT: number;
  averageExtraMarginPerItemT: number;
};

export type SellThroughRequest = {
  from: Date;
  to: Date;
};

export type SellThroughEntry = {
  categoryId: string | null;
  categoryName: string;
  soldUnits: number;
  endingInventoryUnits: number;
  sellThroughRate: number;
};

export type AgingHistogramBucket = {
  label: string;
  minDays: number;
  maxDays: number | null;
  count: number;
  totalCostT: number;
};

export type PriceVsMarginSampleRequest = {
  limit?: number;
};

export type PriceVsMarginPoint = {
  soldPriceT: number;
  marginT: number;
  productId: string;
};

export type ListingFunnelSnapshot = {
  from: Date;
  inStock: number;
  listed: number;
  sold: number;
};

export type RollingAverages = {
  days30: {
    averageDailyProfitT: number;
    averageDailyUnits: number;
  };
  days60: {
    averageDailyProfitT: number;
    averageDailyUnits: number;
  };
};

export type AgingBucketSummary = {
  key: string;
  label: string;
  minDays: number;
  maxDays: number | null;
  count: number;
  totalT: number;
};

export type AgingBuckets = {
  buckets: AgingBucketSummary[];
  thresholds: [number, number, number];
};

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

function createEmptyStatusSummary(): Record<InventoryStatusKey, StatusSummary> {
  return INVENTORY_STATUS_KEYS.reduce((acc, status) => {
    acc[status] = { count: 0, totalCostT: 0 };
    return acc;
  }, {} as Record<InventoryStatusKey, StatusSummary>);
}

export async function getInventoryBreakdown(): Promise<InventoryBreakdown> {
  const items = await prisma.item.findMany({
    where: {
      status: { in: INVENTORY_STATUS_KEYS },
    },
    select: {
      status: true,
      purchaseToman: true,
      feesToman: true,
      refurbToman: true,
      product: {
        select: {
          categoryId: true,
          category: {
            select: {
              name: true,
            },
          },
        },
      },
    },
  });

  const categoryMap = new Map<string, InventoryBreakdownRow>();

  items.forEach((item) => {
    const status = item.status as InventoryStatusKey;
    const categoryId = item.product?.categoryId ?? null;
    const key = categoryId ?? 'uncategorized';
    const categoryName = item.product?.category?.name ?? 'Uncategorized';
    const cost = computeCost(item);

    let row = categoryMap.get(key);
    if (!row) {
      row = {
        categoryId,
        categoryName,
        statuses: createEmptyStatusSummary(),
        totalCount: 0,
        totalCostT: 0,
      };
      categoryMap.set(key, row);
    }

    row.totalCount += 1;
    row.totalCostT += cost;
    row.statuses[status].count += 1;
    row.statuses[status].totalCostT += cost;
  });

  const sortedRows = Array.from(categoryMap.values()).sort(
    (a, b) => b.totalCostT - a.totalCostT,
  );

  const topRows = sortedRows.slice(0, 10);
  const otherRows = sortedRows.slice(10);

  if (otherRows.length > 0) {
    const otherRow: InventoryBreakdownRow = {
      categoryId: null,
      categoryName: 'Other',
      statuses: createEmptyStatusSummary(),
      totalCount: 0,
      totalCostT: 0,
    };

    otherRows.forEach((row) => {
      otherRow.totalCount += row.totalCount;
      otherRow.totalCostT += row.totalCostT;
      INVENTORY_STATUS_KEYS.forEach((status) => {
        otherRow.statuses[status].count += row.statuses[status].count;
        otherRow.statuses[status].totalCostT += row.statuses[status].totalCostT;
      });
    });

    topRows.push(otherRow);
  }

  const grandTotals = sortedRows.reduce<InventoryBreakdown['grandTotals']>(
    (totals, row) => {
      totals.totalCount += row.totalCount;
      totals.totalCostT += row.totalCostT;
      INVENTORY_STATUS_KEYS.forEach((status) => {
        totals.statuses[status].count += row.statuses[status].count;
        totals.statuses[status].totalCostT += row.statuses[status].totalCostT;
      });
      return totals;
    },
    {
      statuses: createEmptyStatusSummary(),
      totalCount: 0,
      totalCostT: 0,
    },
  );

  return {
    rows: topRows,
    grandTotals,
  };
}

export async function getChannelMix({ from, to }: ChannelMixRequest): Promise<ChannelMixEntry[]> {
  const grouped = await prisma.item.groupBy({
    by: ['saleChannel'],
    where: {
      status: ItemStatus.SOLD,
      soldAt: {
        gte: from,
        lte: to,
      },
      soldPriceToman: {
        not: null,
      },
    },
    _count: {
      _all: true,
    },
    _sum: {
      soldPriceToman: true,
    },
  });

  return grouped
    .map((entry) => ({
      channel: entry.saleChannel ?? 'UNKNOWN',
      count: entry._count._all,
      revenueT: entry._sum.soldPriceToman ?? 0,
    }))
    .sort((a, b) => b.revenueT - a.revenueT);
}

export async function getTopProductsByProfit({
  from,
  to,
  limit = 10,
}: TopProductsByProfitRequest): Promise<TopProductByProfit[]> {
  const soldItems = await prisma.item.findMany({
    where: {
      status: ItemStatus.SOLD,
      soldAt: {
        gte: from,
        lte: to,
      },
      soldPriceToman: {
        not: null,
      },
    },
    select: {
      productId: true,
      soldPriceToman: true,
      purchaseToman: true,
      feesToman: true,
      refurbToman: true,
      product: {
        select: {
          name: true,
        },
      },
    },
  });

  const productMap = new Map<
    string,
    {
      productName: string;
      profits: number[];
      soldPrices: number[];
    }
  >();

  soldItems.forEach((item) => {
    if (item.soldPriceToman == null) {
      return;
    }
    const profit = item.soldPriceToman - computeCost(item);
    const existing = productMap.get(item.productId);
    if (existing) {
      existing.profits.push(profit);
      existing.soldPrices.push(item.soldPriceToman);
      return;
    }

    productMap.set(item.productId, {
      productName: item.product?.name ?? 'Unknown Product',
      profits: [profit],
      soldPrices: [item.soldPriceToman],
    });
  });

  const results = Array.from(productMap.entries()).map(([productId, data]) => {
    const unitsSold = data.profits.length;
    const totalProfitT = data.profits.reduce((sum, value) => sum + value, 0);
    const averageProfitT = unitsSold > 0 ? Math.round(totalProfitT / unitsSold) : 0;
    const sortedPrices = [...data.soldPrices].sort((a, b) => a - b);
    const mid = Math.floor(sortedPrices.length / 2);
    let medianSoldPriceT = 0;
    if (sortedPrices.length > 0) {
      if (sortedPrices.length % 2 === 0) {
        medianSoldPriceT = Math.round(
          (sortedPrices[mid - 1]! + sortedPrices[mid]!) / 2,
        );
      } else {
        medianSoldPriceT = sortedPrices[mid]!;
      }
    }

    return {
      productId,
      productName: data.productName,
      unitsSold,
      totalProfitT,
      averageProfitT,
      medianSoldPriceT,
    } satisfies TopProductByProfit;
  });

  return results
    .sort((a, b) => b.totalProfitT - a.totalProfitT)
    .slice(0, limit);
}

export async function getRepairRoi({ from, to }: RepairRoiRequest): Promise<RepairRoiSummary> {
  const soldItems = await prisma.item.findMany({
    where: {
      status: ItemStatus.SOLD,
      soldAt: {
        gte: from,
        lte: to,
      },
      soldPriceToman: {
        not: null,
      },
    },
    select: {
      productId: true,
      soldPriceToman: true,
      purchaseToman: true,
      feesToman: true,
      refurbToman: true,
    },
  });

  const refurbItems: { productId: string; refurbToman: number; profit: number }[] = [];
  const nonRefurbProfit = new Map<string, { total: number; count: number }>();

  soldItems.forEach((item) => {
    if (item.soldPriceToman == null) {
      return;
    }
    const profit = item.soldPriceToman - computeCost(item);
    if (item.refurbToman > 0) {
      refurbItems.push({
        productId: item.productId,
        refurbToman: item.refurbToman,
        profit,
      });
      return;
    }

    const baseline = nonRefurbProfit.get(item.productId) ?? { total: 0, count: 0 };
    baseline.total += profit;
    baseline.count += 1;
    nonRefurbProfit.set(item.productId, baseline);
  });

  let totalRefurbCostT = 0;
  let totalRefurbProfitT = 0;
  let peerBaselineProfitT = 0;

  refurbItems.forEach((item) => {
    totalRefurbCostT += item.refurbToman;
    totalRefurbProfitT += item.profit;
    const baseline = nonRefurbProfit.get(item.productId);
    if (baseline && baseline.count > 0) {
      peerBaselineProfitT += Math.round(baseline.total / baseline.count);
    }
  });

  const extraMarginT = totalRefurbProfitT - peerBaselineProfitT;
  const averageExtraMarginPerItemT =
    refurbItems.length > 0 ? Math.round(extraMarginT / refurbItems.length) : 0;

  return {
    refurbCount: refurbItems.length,
    totalRefurbCostT,
    totalRefurbProfitT,
    peerBaselineProfitT,
    extraMarginT,
    averageExtraMarginPerItemT,
  };
}

export async function getSellThrough({
  from,
  to,
}: SellThroughRequest): Promise<SellThroughEntry[]> {
  const soldItems = await prisma.item.findMany({
    where: {
      status: ItemStatus.SOLD,
      soldAt: {
        gte: from,
        lte: to,
      },
      soldPriceToman: {
        not: null,
      },
    },
    select: {
      product: {
        select: {
          categoryId: true,
          category: {
            select: {
              name: true,
            },
          },
        },
      },
    },
  });

  const inventoryItems = await prisma.item.findMany({
    where: {
      status: { in: INVENTORY_STATUS_KEYS },
      acquiredAt: {
        lte: to,
      },
    },
    select: {
      product: {
        select: {
          categoryId: true,
          category: {
            select: {
              name: true,
            },
          },
        },
      },
    },
  });

  const categoryTotals = new Map<
    string,
    {
      categoryId: string | null;
      categoryName: string;
      soldUnits: number;
      endingInventoryUnits: number;
    }
  >();

  const ensureCategory = (categoryId: string | null, categoryName: string) => {
    const key = categoryId ?? 'uncategorized';
    let entry = categoryTotals.get(key);
    if (!entry) {
      entry = {
        categoryId,
        categoryName,
        soldUnits: 0,
        endingInventoryUnits: 0,
      };
      categoryTotals.set(key, entry);
    }
    return entry;
  };

  soldItems.forEach((item) => {
    const categoryId = item.product?.categoryId ?? null;
    const categoryName = item.product?.category?.name ?? 'Uncategorized';
    const entry = ensureCategory(categoryId, categoryName);
    entry.soldUnits += 1;
  });

  inventoryItems.forEach((item) => {
    const categoryId = item.product?.categoryId ?? null;
    const categoryName = item.product?.category?.name ?? 'Uncategorized';
    const entry = ensureCategory(categoryId, categoryName);
    entry.endingInventoryUnits += 1;
  });

  return Array.from(categoryTotals.values())
    .map((entry) => {
      const denominator = entry.soldUnits + entry.endingInventoryUnits;
      const sellThroughRate = denominator > 0 ? entry.soldUnits / denominator : 0;
      return {
        ...entry,
        sellThroughRate,
      } satisfies SellThroughEntry;
    })
    .sort((a, b) => b.sellThroughRate - a.sellThroughRate || b.soldUnits - a.soldUnits);
}

export async function getAgingHistogram(): Promise<AgingHistogramBucket[]> {
  const items = await prisma.item.findMany({
    where: {
      status: { in: INVENTORY_STATUS_KEYS },
    },
    select: {
      acquiredAt: true,
      purchaseToman: true,
      feesToman: true,
      refurbToman: true,
    },
  });

  const now = new Date();
  const bucketSize = 10;
  const maxDays = 240;
  const bucketCount = maxDays / bucketSize;

  const buckets: AgingHistogramBucket[] = Array.from({ length: bucketCount }, (_, index) => {
    const minDays = index * bucketSize;
    const maxDaysForBucket = minDays + bucketSize - 1;
    return {
      label: `${minDays}-${maxDaysForBucket}`,
      minDays,
      maxDays: maxDaysForBucket,
      count: 0,
      totalCostT: 0,
    } satisfies AgingHistogramBucket;
  });

  const overflowBucket: AgingHistogramBucket = {
    label: `${maxDays}+`,
    minDays: maxDays,
    maxDays: null,
    count: 0,
    totalCostT: 0,
  };

  items.forEach((item) => {
    const age = Math.max(0, differenceInCalendarDays(now, item.acquiredAt));
    const cost = computeCost(item);
    const bucketIndex = Math.min(Math.floor(age / bucketSize), bucketCount);
    if (bucketIndex >= bucketCount) {
      overflowBucket.count += 1;
      overflowBucket.totalCostT += cost;
      return;
    }

    const bucket = buckets[bucketIndex]!;
    bucket.count += 1;
    bucket.totalCostT += cost;
  });

  return [...buckets, overflowBucket];
}

export async function getPriceVsMarginSample({
  limit = 500,
}: PriceVsMarginSampleRequest): Promise<PriceVsMarginPoint[]> {
  const safeLimit = Math.max(1, Math.min(limit, 1000));
  const soldItems = await prisma.item.findMany({
    where: {
      status: ItemStatus.SOLD,
      soldPriceToman: {
        not: null,
      },
    },
    orderBy: {
      soldAt: 'desc',
    },
    take: safeLimit,
    select: {
      productId: true,
      soldPriceToman: true,
      purchaseToman: true,
      feesToman: true,
      refurbToman: true,
    },
  });

  return soldItems
    .filter((item) => item.soldPriceToman != null)
    .map((item) => {
      const soldPriceT = item.soldPriceToman ?? 0;
      const marginT = soldPriceT - computeCost(item);
      return {
        soldPriceT,
        marginT,
        productId: item.productId,
      } satisfies PriceVsMarginPoint;
    });
}

export async function getListingFunnel(): Promise<ListingFunnelSnapshot> {
  const now = new Date();
  const windowStart = subDays(now, 90);

  const [inStock, listed, sold] = await Promise.all([
    prisma.item.count({
      where: {
        status: ItemStatus.IN_STOCK,
        acquiredAt: {
          gte: windowStart,
          lte: now,
        },
      },
    }),
    prisma.item.count({
      where: {
        listedAt: {
          not: null,
          gte: windowStart,
          lte: now,
        },
      },
    }),
    prisma.item.count({
      where: {
        status: ItemStatus.SOLD,
        soldAt: {
          not: null,
          gte: windowStart,
          lte: now,
        },
        soldPriceToman: {
          not: null,
        },
      },
    }),
  ]);

  return {
    from: windowStart,
    inStock,
    listed,
    sold,
  };
}

export async function getRollingAverages(): Promise<RollingAverages> {
  const now = new Date();
  const start60 = subDays(now, 59);
  const start30 = subDays(now, 29);

  const soldItems = await prisma.item.findMany({
    where: {
      status: ItemStatus.SOLD,
      soldAt: {
        not: null,
        gte: start60,
        lte: now,
      },
      soldPriceToman: {
        not: null,
      },
    },
    select: {
      soldAt: true,
      soldPriceToman: true,
      purchaseToman: true,
      feesToman: true,
      refurbToman: true,
    },
  });

  const totals60 = { profit: 0, units: 0 };
  const totals30 = { profit: 0, units: 0 };

  soldItems.forEach((item) => {
    if (!item.soldAt || item.soldPriceToman == null) {
      return;
    }

    const profit = item.soldPriceToman - computeCost(item);
    totals60.profit += profit;
    totals60.units += 1;

    if (item.soldAt >= start30) {
      totals30.profit += profit;
      totals30.units += 1;
    }
  });

  return {
    days30: {
      averageDailyProfitT: totals30.profit / 30,
      averageDailyUnits: totals30.units / 30,
    },
    days60: {
      averageDailyProfitT: totals60.profit / 60,
      averageDailyUnits: totals60.units / 60,
    },
  } satisfies RollingAverages;
}

const getInventoryValueCached = cache(async () => {
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
});

export async function getInventoryValue(): Promise<number> {
  return getInventoryValueCached();
}

const getProfitMtdCached = cache(async (_cacheKey: string) => {
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
});

export async function getProfitMTD(): Promise<number> {
  return getProfitMtdCached(createFilterKey('analytics:get-profit-mtd'));
}

const getItemsInStockCountCached = cache(async () => {
  return prisma.item.count({
    where: {
      status: ItemStatus.IN_STOCK,
    },
  });
});

export async function getItemsInStockCount(): Promise<number> {
  return getItemsInStockCountCached();
}

const getAvgDaysInStockCached = cache(async () => {
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
});

export async function getAvgDaysInStock(): Promise<number> {
  return getAvgDaysInStockCached();
}

const getMonthlyPnlCached = cache(async (_cacheKey: string, months: number) => {
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
});

export async function getMonthlyPnl({ months }: { months: number }): Promise<MonthlyPnlPoint[]> {
  return getMonthlyPnlCached(createFilterKey('analytics:get-monthly-pnl', { months }), months);
}

export async function getAgingBuckets(): Promise<AgingBuckets> {
  const [rules, items] = await Promise.all([
    getBusinessRulesSettings(),
    prisma.item.findMany({
      where: {
        status: { in: ACTIVE_STATUSES },
      },
      select: {
        acquiredAt: true,
        purchaseToman: true,
        feesToman: true,
        refurbToman: true,
      },
    }),
  ]);

  const definitions = buildAgingBucketDefinitions(rules.agingThresholds);
  const now = new Date();

  const buckets = definitions.map((definition) => ({
    ...definition,
    count: 0,
    totalT: 0,
  }));

  items.forEach((item) => {
    const age = differenceInCalendarDays(now, item.acquiredAt);
    const cost = computeCost(item);
    const bucket = buckets.find((entry) => {
      if (entry.maxDays == null) {
        return age >= entry.minDays;
      }
      return age >= entry.minDays && age <= entry.maxDays;
    });
    if (bucket) {
      bucket.count += 1;
      bucket.totalT += cost;
    }
  });

  return { buckets, thresholds: rules.agingThresholds };
}

export async function getAgingWatchlist(): Promise<{
  warning: WatchlistItem[];
  critical: WatchlistItem[];
  warningThreshold: number;
  criticalThreshold: number;
}> {
  const [rules, items] = await Promise.all([
    getBusinessRulesSettings(),
    prisma.item.findMany({
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
    }),
  ]);

  const now = new Date();
  const warningThreshold = rules.agingThresholds[1];
  const criticalThreshold = rules.agingThresholds[2];

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

  const warning = watchlist.filter((item) => item.daysInStock > warningThreshold).slice(0, 10);
  const critical = watchlist.filter((item) => item.daysInStock > criticalThreshold).slice(0, 10);

  return { warning, critical, warningThreshold, criticalThreshold };
}

export async function getStaleListed({ days }: { days: number }): Promise<StaleListedItem[]> {
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
