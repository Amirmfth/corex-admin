import { ItemStatus } from '@prisma/client';
import { endOfMonth, startOfMonth, subMonths } from "date-fns";


import { prisma } from "./prisma";

export type InventorySummary = {
  totalCost: number;
  itemCount: number;
};

export type MonthlyProfitPoint = {
  monthStart: Date;
  profit: number;
};

export type AgingBucket = {
  label: string;
  count: number;
  totalCost: number;
};

const ACTIVE_STATUSES = [
  ItemStatus.IN_STOCK,
  ItemStatus.LISTED,
  ItemStatus.RESERVED,
];

export async function getInventorySummary(): Promise<InventorySummary> {
  const aggregate = await prisma.item.aggregate({
    where: {
      status: { in: ACTIVE_STATUSES },
    },
    _sum: {
      purchaseToman: true,
      feesToman: true,
      refurbToman: true,
    },
    _count: true,
  });

  const purchase = aggregate._sum.purchaseToman ?? 0;
  const fees = aggregate._sum.feesToman ?? 0;
  const refurb = aggregate._sum.refurbToman ?? 0;

  return {
    totalCost: purchase + fees + refurb,
    itemCount: aggregate._count ?? 0,
  };
}

export async function getMonthlyProfit(): Promise<MonthlyProfitPoint[]> {
  const end = endOfMonth(new Date());
  const start = startOfMonth(subMonths(end, 11));

  const soldItems = await prisma.item.findMany({
    where: {
      status: ItemStatus.SOLD,
      soldAt: {
        gte: start,
        lte: end,
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

  const buckets = new Map<string, { monthStart: Date; profit: number }>();

  for (let i = 0; i < 12; i += 1) {
    const monthStart = startOfMonth(subMonths(end, 11 - i));
    buckets.set(monthStart.toISOString(), { monthStart, profit: 0 });
  }

  soldItems.forEach((item) => {
    if (!item.soldAt || item.soldPriceToman == null) {
      return;
    }
    const monthStart = startOfMonth(item.soldAt);
    const key = monthStart.toISOString();
    const bucket = buckets.get(key);
    const profitValue =
      item.soldPriceToman - (item.purchaseToman + item.feesToman + item.refurbToman);
    if (bucket) {
      bucket.profit += profitValue;
    } else {
      buckets.set(key, { monthStart, profit: profitValue });
    }
  });

  return Array.from(buckets.values()).sort(
    (a, b) => a.monthStart.getTime() - b.monthStart.getTime(),
  );
}

const AGING_BUCKETS: { label: string; min: number; max: number | null }[] = [
  { label: "0-30", min: 0, max: 30 },
  { label: "31-90", min: 31, max: 90 },
  { label: "91-180", min: 91, max: 180 },
  { label: "181+", min: 181, max: null },
];

export async function getAgingBuckets(): Promise<AgingBucket[]> {
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

  const totals = AGING_BUCKETS.map((bucket) => ({
    label: bucket.label,
    count: 0,
    totalCost: 0,
  }));

  items.forEach((item) => {
    const days = Math.floor((now.getTime() - item.acquiredAt.getTime()) / (1000 * 60 * 60 * 24));
    const cost = item.purchaseToman + item.feesToman + item.refurbToman;

    const index = AGING_BUCKETS.findIndex((bucket) => {
      if (bucket.max == null) {
        return days >= bucket.min;
      }
      return days >= bucket.min && days <= bucket.max;
    });

    if (index >= 0) {
      totals[index].count += 1;
      totals[index].totalCost += cost;
    }
  });

  return totals;
}
