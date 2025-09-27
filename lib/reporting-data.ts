import {
  addDays,
  differenceInCalendarDays,
  eachDayOfInterval,
  eachMonthOfInterval,
  endOfDay,
  formatISO,
  isWithinInterval,
  startOfDay,
  startOfMonth,
} from 'date-fns';

export type ReportChannel =
  | 'Online Store'
  | 'Retail Shop'
  | 'Marketplace'
  | 'Wholesale'
  | 'Social Commerce';

export type InventoryStatus = 'IN_STOCK' | 'LISTED' | 'RESERVED' | 'REPAIR' | 'SOLD';

export type ReportRecord = {
  itemId: string;
  productId: string;
  productName: string;
  category: string;
  channel: ReportChannel;
  status: InventoryStatus;
  acquiredAt: string;
  listedAt?: string | null;
  soldAt?: string | null;
  price: number;
  cost: number;
  refurbCost: number;
};

export type ReportFilters = {
  startDate: Date;
  endDate: Date;
  channels: ReportChannel[];
  category: string | null;
};

export type SerializedFilters = {
  from: string;
  to: string;
  channels: ReportChannel[];
  categoryId: string | null;
};

export type MonthlyFinancial = {
  month: string;
  revenue: number;
  cost: number;
  profit: number;
};

export type RollingTrendPoint = {
  date: string;
  rolling30: number;
  rolling60: number;
};

export type ChannelMixEntry = {
  channel: ReportChannel;
  revenue: number;
  percentage: number;
};

export type InventoryByStatusEntry = {
  channel: ReportChannel;
  statuses: Record<Exclude<InventoryStatus, 'SOLD'>, number>;
};

export type CategoryInventoryEntry = {
  category: string;
  value: number;
};

export type ProductProfitEntry = {
  productId: string;
  productName: string;
  category: string;
  channels: ReportChannel[];
  revenue: number;
  cost: number;
  profit: number;
};

export type SellThroughEntry = {
  category: string;
  sold: number;
  total: number;
  rate: number;
};

export type ListingStage = 'IN_STOCK' | 'LISTED' | 'SOLD';

export type ListingFunnelEntry = {
  stage: ListingStage;
  count: number;
};

export type AgingBucketEntry = {
  label: string;
  rangeStart: number;
  rangeEnd: number | null;
  count: number;
  totalValue: number;
};

export type RepairStats = {
  label: 'Refurbished' | 'Standard';
  count: number;
  revenue: number;
  cost: number;
  profit: number;
  margin: number;
};

export type RepairRoi = {
  refurbished: RepairStats;
  nonRefurbished: RepairStats;
};

export type PriceMarginPoint = {
  itemId: string;
  productId: string;
  productName: string;
  category: string;
  channel: ReportChannel;
  price: number;
  profit: number;
  margin: number;
};

export type ReportsAggregates = {
  monthly: MonthlyFinancial[];
  rolling: RollingTrendPoint[];
  channelMix: ChannelMixEntry[];
  inventoryByStatus: InventoryByStatusEntry[];
  topCategories: CategoryInventoryEntry[];
  topProducts: ProductProfitEntry[];
  sellThrough: SellThroughEntry[];
  listingFunnel: ListingFunnelEntry[];
  aging: AgingBucketEntry[];
  repair: RepairRoi;
  priceVsMargin: PriceMarginPoint[];
};

const NOW = startOfDay(new Date('2024-12-31T00:00:00Z'));

const CHANNELS: ReportChannel[] = [
  'Online Store',
  'Retail Shop',
  'Marketplace',
  'Wholesale',
  'Social Commerce',
];

const PRODUCT_TEMPLATES = [
  {
    productId: 'PRD-001',
    productName: '4K Drone Explorer',
    category: 'Electronics',
    baseCost: 7_600_000,
    basePrice: 12_800_000,
  },
  {
    productId: 'PRD-002',
    productName: 'Smart Air Purifier',
    category: 'Home',
    baseCost: 3_900_000,
    basePrice: 7_200_000,
  },
  {
    productId: 'PRD-003',
    productName: 'Performance Running Shoes',
    category: 'Apparel',
    baseCost: 1_450_000,
    basePrice: 3_100_000,
  },
  {
    productId: 'PRD-004',
    productName: 'Collector Vinyl Set',
    category: 'Collectibles',
    baseCost: 2_100_000,
    basePrice: 5_000_000,
  },
  {
    productId: 'PRD-005',
    productName: 'Compact Espresso Maker',
    category: 'Home',
    baseCost: 2_650_000,
    basePrice: 5_200_000,
  },
  {
    productId: 'PRD-006',
    productName: 'Hybrid Smartwatch',
    category: 'Electronics',
    baseCost: 2_500_000,
    basePrice: 4_600_000,
  },
];

function buildSoldRecords(): ReportRecord[] {
  const records: ReportRecord[] = [];

  for (let monthIndex = 0; monthIndex < 12; monthIndex += 1) {
    const monthStart = startOfMonth(new Date(2024, monthIndex, 1));
    PRODUCT_TEMPLATES.slice(0, 3).forEach((template, templateIndex) => {
      const soldDate = addDays(monthStart, 12 + templateIndex * 5);
      const acquiredDate = addDays(soldDate, -14 - templateIndex);
      const listedDate = addDays(soldDate, -8);
      const channel = CHANNELS[(monthIndex + templateIndex) % CHANNELS.length];
      const priceAdjustment = (monthIndex + 1) * 120_000 + templateIndex * 85_000;
      const costAdjustment = monthIndex * 75_000 + templateIndex * 65_000;
      const refurbCost = templateIndex % 2 === 0 ? 380_000 + monthIndex * 8_000 : 0;

      records.push({
        itemId: `ITM-${(monthIndex + 1).toString().padStart(2, '0')}${templateIndex + 1}`,
        productId: template.productId,
        productName: template.productName,
        category: template.category,
        channel,
        status: 'SOLD',
        acquiredAt: formatISO(acquiredDate, { representation: 'date' }),
        listedAt: formatISO(listedDate, { representation: 'date' }),
        soldAt: formatISO(soldDate, { representation: 'date' }),
        price: template.basePrice + priceAdjustment,
        cost: template.baseCost + costAdjustment,
        refurbCost,
      });
    });
  }

  return records;
}

function buildInventoryRecords(): ReportRecord[] {
  const records: ReportRecord[] = [];
  const statuses: Exclude<InventoryStatus, 'SOLD'>[] = ['IN_STOCK', 'LISTED', 'RESERVED', 'REPAIR'];

  PRODUCT_TEMPLATES.forEach((template, index) => {
    const baseDate = addDays(NOW, -45 - index * 7);
    const status = statuses[index % statuses.length];
    const channel = CHANNELS[(index + 2) % CHANNELS.length];

    records.push({
      itemId: `INV-${index + 1}`,
      productId: `${template.productId}-INV`,
      productName: `${template.productName} (Bundle)`,
      category: template.category,
      channel,
      status,
      acquiredAt: formatISO(addDays(baseDate, -18), { representation: 'date' }),
      listedAt: status === 'IN_STOCK' ? null : formatISO(addDays(baseDate, -7), { representation: 'date' }),
      soldAt: null,
      price: template.basePrice + 450_000 + index * 70_000,
      cost: template.baseCost + 160_000 + index * 45_000,
      refurbCost: index % 3 === 0 ? 320_000 : 0,
    });
  });

  // Add a few older inventory items for aging distribution
  records.push(
    {
      itemId: 'INV-OLD-1',
      productId: 'PRD-004-RARE',
      productName: 'Collector Vinyl (Limited)',
      category: 'Collectibles',
      channel: 'Marketplace',
      status: 'LISTED',
      acquiredAt: formatISO(addDays(NOW, -210), { representation: 'date' }),
      listedAt: formatISO(addDays(NOW, -170), { representation: 'date' }),
      soldAt: null,
      price: 6_400_000,
      cost: 2_800_000,
      refurbCost: 0,
    },
    {
      itemId: 'INV-OLD-2',
      productId: 'PRD-007',
      productName: 'Vintage Camera Lens',
      category: 'Collectibles',
      channel: 'Online Store',
      status: 'RESERVED',
      acquiredAt: formatISO(addDays(NOW, -120), { representation: 'date' }),
      listedAt: formatISO(addDays(NOW, -90), { representation: 'date' }),
      soldAt: null,
      price: 9_800_000,
      cost: 5_700_000,
      refurbCost: 640_000,
    },
    {
      itemId: 'INV-OLD-3',
      productId: 'PRD-008',
      productName: 'Studio Lighting Kit',
      category: 'Electronics',
      channel: 'Wholesale',
      status: 'IN_STOCK',
      acquiredAt: formatISO(addDays(NOW, -310), { representation: 'date' }),
      listedAt: null,
      soldAt: null,
      price: 18_400_000,
      cost: 11_200_000,
      refurbCost: 0,
    },
  );

  return records;
}

const SOLD_RECORDS = buildSoldRecords();
const INVENTORY_RECORDS = buildInventoryRecords();
const ALL_RECORDS: ReportRecord[] = [...SOLD_RECORDS, ...INVENTORY_RECORDS];

export function getAvailableFilters() {
  const categories = Array.from(new Set(ALL_RECORDS.map((record) => record.category))).sort();
  return {
    channels: CHANNELS,
    categories,
  };
}

function parseISODate(value: string | null | undefined) {
  if (!value) return null;
  return startOfDay(new Date(value));
}

function normalizeFilters(filters: ReportFilters): ReportFilters {
  const start = startOfDay(filters.startDate);
  const end = endOfDay(filters.endDate);
  const safeChannels = filters.channels.length > 0 ? filters.channels : CHANNELS;

  return {
    startDate: start,
    endDate: end,
    channels: safeChannels,
    category: filters.category,
  };
}

function filterRecords(baseFilters: ReportFilters) {
  const filters = normalizeFilters(baseFilters);

  const matchesChannel = (record: ReportRecord) => filters.channels.includes(record.channel);
  const matchesCategory = (record: ReportRecord) =>
    !filters.category || record.category === filters.category;

  const acquiredRecords = ALL_RECORDS.filter(
    (record) =>
      matchesChannel(record) &&
      matchesCategory(record) &&
      isWithinInterval(parseISODate(record.acquiredAt) ?? NOW, {
        start: filters.startDate,
        end: filters.endDate,
      }),
  );

  const soldRecords = SOLD_RECORDS.filter((record) => {
    if (!matchesChannel(record) || !matchesCategory(record)) {
      return false;
    }
    const soldDate = parseISODate(record.soldAt ?? null);
    if (!soldDate) return false;
    return isWithinInterval(soldDate, { start: filters.startDate, end: filters.endDate });
  });

  return { filters, acquiredRecords, soldRecords };
}

function computeMonthlyFinancials(
  soldRecords: ReportRecord[],
  filters: ReportFilters,
): MonthlyFinancial[] {
  const monthKeys = eachMonthOfInterval({
    start: startOfMonth(filters.startDate),
    end: startOfMonth(filters.endDate),
  }).map((date) => formatISO(date, { representation: 'date' }));

  const aggregate = new Map<string, MonthlyFinancial>();
  monthKeys.forEach((month) => {
    aggregate.set(month, { month, revenue: 0, cost: 0, profit: 0 });
  });

  soldRecords.forEach((record) => {
    const soldDate = parseISODate(record.soldAt ?? null);
    if (!soldDate) return;
    const monthKey = formatISO(startOfMonth(soldDate), { representation: 'date' });
    const bucket = aggregate.get(monthKey);
    const totalCost = record.cost + record.refurbCost;
    if (bucket) {
      bucket.revenue += record.price;
      bucket.cost += totalCost;
      bucket.profit += record.price - totalCost;
    } else {
      aggregate.set(monthKey, {
        month: monthKey,
        revenue: record.price,
        cost: totalCost,
        profit: record.price - totalCost,
      });
    }
  });

  return Array.from(aggregate.values()).sort((a, b) => a.month.localeCompare(b.month));
}

function computeRollingTrends(
  soldRecords: ReportRecord[],
  filters: ReportFilters,
): RollingTrendPoint[] {
  const intervalDays = eachDayOfInterval({ start: filters.startDate, end: filters.endDate });
  const dailyProfit = intervalDays.map((day) => {
    const key = formatISO(day, { representation: 'date' });
    const profitForDay = soldRecords
      .filter((record) => record.soldAt === key)
      .reduce((sum, record) => sum + (record.price - record.cost - record.refurbCost), 0);
    return { key, profit: profitForDay };
  });

  return dailyProfit.map((entry, index) => {
    const window30 = dailyProfit.slice(Math.max(0, index - 29), index + 1);
    const window60 = dailyProfit.slice(Math.max(0, index - 59), index + 1);

    const total30 = window30.reduce((sum, point) => sum + point.profit, 0);
    const total60 = window60.reduce((sum, point) => sum + point.profit, 0);

    return {
      date: entry.key,
      rolling30: window30.length ? total30 / window30.length : 0,
      rolling60: window60.length ? total60 / window60.length : 0,
    };
  });
}

function computeChannelMix(soldRecords: ReportRecord[]): ChannelMixEntry[] {
  const totalRevenue = soldRecords.reduce((sum, record) => sum + record.price, 0);
  const aggregate = new Map<ReportChannel, number>();

  soldRecords.forEach((record) => {
    aggregate.set(record.channel, (aggregate.get(record.channel) ?? 0) + record.price);
  });

  return CHANNELS.map((channel) => {
    const revenue = aggregate.get(channel) ?? 0;
    return {
      channel,
      revenue,
      percentage: totalRevenue > 0 ? (revenue / totalRevenue) * 100 : 0,
    };
  }).filter((entry) => entry.revenue > 0 || soldRecords.length === 0 ? true : false);
}

function computeInventoryByStatus(
  acquiredRecords: ReportRecord[],
): InventoryByStatusEntry[] {
  const entries = new Map<ReportChannel, InventoryByStatusEntry>();

  acquiredRecords.forEach((record) => {
    if (record.status === 'SOLD') {
      return;
    }
    const value = record.cost + record.refurbCost;
    const entry = entries.get(record.channel);
    if (entry) {
      entry.statuses[record.status] = (entry.statuses[record.status] ?? 0) + value;
    } else {
      entries.set(record.channel, {
        channel: record.channel,
        statuses: {
          IN_STOCK: record.status === 'IN_STOCK' ? value : 0,
          LISTED: record.status === 'LISTED' ? value : 0,
          RESERVED: record.status === 'RESERVED' ? value : 0,
          REPAIR: record.status === 'REPAIR' ? value : 0,
        },
      });
    }
  });

  return Array.from(entries.values()).sort((a, b) => a.channel.localeCompare(b.channel));
}

function computeTopCategories(acquiredRecords: ReportRecord[]): CategoryInventoryEntry[] {
  const totals = new Map<string, number>();
  acquiredRecords.forEach((record) => {
    if (record.status === 'SOLD') return;
    totals.set(
      record.category,
      (totals.get(record.category) ?? 0) + record.cost + record.refurbCost,
    );
  });

  return Array.from(totals.entries())
    .map(([category, value]) => ({ category, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 8);
}

function computeTopProducts(soldRecords: ReportRecord[]): ProductProfitEntry[] {
  const totals = new Map<
    string,
    {
      productId: string;
      productName: string;
      category: string;
      channels: Set<ReportChannel>;
      revenue: number;
      cost: number;
      profit: number;
    }
  >();

  soldRecords.forEach((record) => {
    const current = totals.get(record.productId) ?? {
      productId: record.productId,
      productName: record.productName,
      category: record.category,
      channels: new Set<ReportChannel>(),
      revenue: 0,
      cost: 0,
      profit: 0,
    };
    const totalCost = record.cost + record.refurbCost;
    current.revenue += record.price;
    current.cost += totalCost;
    current.profit += record.price - totalCost;
    current.channels.add(record.channel);
    totals.set(record.productId, current);
  });

  return Array.from(totals.values())
    .map((value) => ({
      productId: value.productId,
      productName: value.productName,
      category: value.category,
      channels: Array.from(value.channels),
      revenue: value.revenue,
      cost: value.cost,
      profit: value.profit,
    }))
    .sort((a, b) => b.profit - a.profit)
    .slice(0, 10);
}

function computeSellThrough(
  acquiredRecords: ReportRecord[],
  soldRecords: ReportRecord[],
): SellThroughEntry[] {
  const totals = new Map<string, { total: number; sold: number }>();

  acquiredRecords.forEach((record) => {
    const entry = totals.get(record.category) ?? { total: 0, sold: 0 };
    entry.total += 1;
    totals.set(record.category, entry);
  });

  soldRecords.forEach((record) => {
    const entry = totals.get(record.category) ?? { total: 0, sold: 0 };
    entry.sold += 1;
    entry.total += entry.total === 0 ? 1 : 0;
    totals.set(record.category, entry);
  });

  return Array.from(totals.entries())
    .map(([category, value]) => ({
      category,
      sold: value.sold,
      total: value.total,
      rate: value.total > 0 ? value.sold / value.total : 0,
    }))
    .sort((a, b) => b.rate - a.rate);
}

function computeListingFunnel(acquiredRecords: ReportRecord[]): ListingFunnelEntry[] {
  const counts: Record<ListingStage, number> = {
    IN_STOCK: 0,
    LISTED: 0,
    SOLD: 0,
  };

  acquiredRecords.forEach((record) => {
    if (record.status === 'SOLD') {
      counts.SOLD += 1;
    } else if (record.status === 'IN_STOCK') {
      counts.IN_STOCK += 1;
    } else {
      counts.LISTED += 1;
    }
  });

  return [
    { stage: 'IN_STOCK', count: counts.IN_STOCK },
    { stage: 'LISTED', count: counts.LISTED },
    { stage: 'SOLD', count: counts.SOLD },
  ];
}

function computeAging(acquiredRecords: ReportRecord[]): AgingBucketEntry[] {
  const buckets = new Map<number, { count: number; total: number }>();

  acquiredRecords.forEach((record) => {
    const acquiredDate = parseISODate(record.acquiredAt) ?? NOW;
    const completedDate = parseISODate(record.soldAt ?? null) ?? NOW;
    const days = Math.max(differenceInCalendarDays(completedDate, acquiredDate), 0);
    const bucketIndex = Math.min(Math.floor(days / 10), 11);
    const bucket = buckets.get(bucketIndex) ?? { count: 0, total: 0 };
    bucket.count += 1;
    bucket.total += record.cost + record.refurbCost;
    buckets.set(bucketIndex, bucket);
  });

  return Array.from({ length: 12 }).map((_, index) => {
    const bucket = buckets.get(index) ?? { count: 0, total: 0 };
    const start = index * 10;
    const end = index === 11 ? null : start + 9;
    return {
      label: end == null ? `${start}+` : `${start}-${end}`,
      rangeStart: start,
      rangeEnd: end,
      count: bucket.count,
      totalValue: bucket.total,
    };
  });
}

function computeRepairRoi(soldRecords: ReportRecord[]): RepairRoi {
  const refurbished = soldRecords.filter((record) => record.refurbCost > 0);
  const standard = soldRecords.filter((record) => record.refurbCost === 0);

  const summarize = (records: ReportRecord[], label: RepairStats['label']): RepairStats => {
    const revenue = records.reduce((sum, record) => sum + record.price, 0);
    const cost = records.reduce((sum, record) => sum + record.cost + record.refurbCost, 0);
    const profit = revenue - cost;
    return {
      label,
      count: records.length,
      revenue,
      cost,
      profit,
      margin: revenue > 0 ? profit / revenue : 0,
    };
  };

  return {
    refurbished: summarize(refurbished, 'Refurbished'),
    nonRefurbished: summarize(standard, 'Standard'),
  };
}

function computePriceVsMargin(soldRecords: ReportRecord[]): PriceMarginPoint[] {
  return soldRecords.map((record) => {
    const profit = record.price - record.cost - record.refurbCost;
    const margin = record.price > 0 ? profit / record.price : 0;
    return {
      itemId: record.itemId,
      productId: record.productId,
      productName: record.productName,
      category: record.category,
      channel: record.channel,
      price: record.price,
      profit,
      margin,
    };
  });
}

export function getReportsAggregates(filters: ReportFilters): ReportsAggregates {
  const { filters: normalized, acquiredRecords, soldRecords } = filterRecords(filters);

  return {
    monthly: computeMonthlyFinancials(soldRecords, normalized),
    rolling: computeRollingTrends(soldRecords, normalized),
    channelMix: computeChannelMix(soldRecords),
    inventoryByStatus: computeInventoryByStatus(acquiredRecords),
    topCategories: computeTopCategories(acquiredRecords),
    topProducts: computeTopProducts(soldRecords),
    sellThrough: computeSellThrough(acquiredRecords, soldRecords),
    listingFunnel: computeListingFunnel(acquiredRecords),
    aging: computeAging(acquiredRecords),
    repair: computeRepairRoi(soldRecords),
    priceVsMargin: computePriceVsMargin(soldRecords),
  };
}

export function serializeFilters(filters: ReportFilters): SerializedFilters {
  return {
    from: formatISO(filters.startDate, { representation: 'date' }),
    to: formatISO(filters.endDate, { representation: 'date' }),
    channels: filters.channels,
    categoryId: filters.category,
  };
}

export function deserializeFilters(value: SerializedFilters): ReportFilters {
  return {
    startDate: startOfDay(new Date(value.from)),
    endDate: endOfDay(new Date(value.to)),
    channels: value.channels,
    category: value.categoryId,
  };
}

export function getAllRecords() {
  return ALL_RECORDS;
}

export function defaultFilters(): ReportFilters {
  const end = NOW;
  const start = addDays(end, -89);
  return {
    startDate: start,
    endDate: end,
    channels: CHANNELS,
    category: null,
  };
}
