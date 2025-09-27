import { Channel, ItemStatus } from '@prisma/client';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  getAgingHistogram,
  getChannelMix,
  getInventoryBreakdown,
  getListingFunnel,
  getPriceVsMarginSample,
  getRepairRoi,
  getRollingAverages,
  getSellThrough,
  getTopProductsByProfit,
} from '../lib/analytics';
import { prisma } from '../lib/prisma';

const TEST_NOW = new Date('2024-10-01T00:00:00.000Z');
const dayInMs = 24 * 60 * 60 * 1000;
const daysAgo = (days: number) => new Date(TEST_NOW.getTime() - days * dayInMs);

type CategoryRecord = { id: string; name: string };
type ProductRecord = { id: string; name: string; categoryId: string | null };
type ItemRecord = {
  id: string;
  productId: string;
  status: ItemStatus;
  purchaseToman: number;
  feesToman: number;
  refurbToman: number;
  acquiredAt: Date;
  listedAt: Date | null;
  soldAt: Date | null;
  soldPriceToman: number | null;
  saleChannel: Channel | null;
};

const categories: CategoryRecord[] = [
  { id: 'cat-laptops', name: 'Laptops Analytics' },
  { id: 'cat-phones', name: 'Phones Analytics' },
  { id: 'cat-accessories', name: 'Accessories Analytics' },
  { id: 'cat-audio', name: 'Audio Analytics' },
  { id: 'cat-cameras', name: 'Cameras Analytics' },
  { id: 'cat-gaming', name: 'Gaming Analytics' },
  { id: 'cat-appliances', name: 'Appliances Analytics' },
  { id: 'cat-drones', name: 'Drones Analytics' },
  { id: 'cat-smarthome', name: 'Smart Home Analytics' },
  { id: 'cat-wearables', name: 'Wearables Analytics' },
  { id: 'cat-networking', name: 'Networking Analytics' },
  { id: 'cat-storage', name: 'Storage Analytics' },
];

const products: ProductRecord[] = [
  { id: 'prod-laptop', name: 'Laptop Ultra Test', categoryId: 'cat-laptops' },
  { id: 'prod-phone', name: 'Phone Prime Test', categoryId: 'cat-phones' },
  { id: 'prod-accessory', name: 'Accessory Elite Test', categoryId: 'cat-accessories' },
  { id: 'prod-audio', name: 'Audio Product', categoryId: 'cat-audio' },
  { id: 'prod-cameras', name: 'Cameras Product', categoryId: 'cat-cameras' },
  { id: 'prod-gaming', name: 'Gaming Product', categoryId: 'cat-gaming' },
  { id: 'prod-appliances', name: 'Appliances Product', categoryId: 'cat-appliances' },
  { id: 'prod-drones', name: 'Drones Product', categoryId: 'cat-drones' },
  { id: 'prod-smarthome', name: 'Smart Home Product', categoryId: 'cat-smarthome' },
  { id: 'prod-wearables', name: 'Wearables Product', categoryId: 'cat-wearables' },
  { id: 'prod-networking', name: 'Networking Product', categoryId: 'cat-networking' },
  { id: 'prod-storage', name: 'Storage Product', categoryId: 'cat-storage' },
];

const items: ItemRecord[] = [
  {
    id: 'item-laptop-stock',
    productId: 'prod-laptop',
    status: ItemStatus.IN_STOCK,
    purchaseToman: 40_000_000,
    feesToman: 2_000_000,
    refurbToman: 0,
    acquiredAt: daysAgo(5),
    listedAt: null,
    soldAt: null,
    soldPriceToman: null,
    saleChannel: null,
  },
  {
    id: 'item-laptop-listed',
    productId: 'prod-laptop',
    status: ItemStatus.LISTED,
    purchaseToman: 38_000_000,
    feesToman: 2_000_000,
    refurbToman: 1_000_000,
    acquiredAt: daysAgo(35),
    listedAt: daysAgo(20),
    soldAt: null,
    soldPriceToman: null,
    saleChannel: null,
  },
  {
    id: 'item-laptop-sold-refurb',
    productId: 'prod-laptop',
    status: ItemStatus.SOLD,
    purchaseToman: 40_000_000,
    feesToman: 5_000_000,
    refurbToman: 5_000_000,
    acquiredAt: daysAgo(55),
    listedAt: daysAgo(15),
    soldAt: daysAgo(10),
    soldPriceToman: 70_000_000,
    saleChannel: Channel.ONLINE,
  },
  {
    id: 'item-laptop-sold-base',
    productId: 'prod-laptop',
    status: ItemStatus.SOLD,
    purchaseToman: 45_000_000,
    feesToman: 3_000_000,
    refurbToman: 0,
    acquiredAt: daysAgo(70),
    listedAt: daysAgo(50),
    soldAt: daysAgo(40),
    soldPriceToman: 65_000_000,
    saleChannel: Channel.DIRECT,
  },
  {
    id: 'item-phone-stock',
    productId: 'prod-phone',
    status: ItemStatus.IN_STOCK,
    purchaseToman: 19_000_000,
    feesToman: 1_000_000,
    refurbToman: 0,
    acquiredAt: daysAgo(35),
    listedAt: null,
    soldAt: null,
    soldPriceToman: null,
    saleChannel: null,
  },
  {
    id: 'item-phone-sold-a',
    productId: 'prod-phone',
    status: ItemStatus.SOLD,
    purchaseToman: 18_000_000,
    feesToman: 2_000_000,
    refurbToman: 0,
    acquiredAt: daysAgo(50),
    listedAt: daysAgo(30),
    soldAt: daysAgo(15),
    soldPriceToman: 30_000_000,
    saleChannel: Channel.DIRECT,
  },
  {
    id: 'item-phone-sold-b',
    productId: 'prod-phone',
    status: ItemStatus.SOLD,
    purchaseToman: 19_000_000,
    feesToman: 2_000_000,
    refurbToman: 0,
    acquiredAt: daysAgo(60),
    listedAt: daysAgo(35),
    soldAt: daysAgo(25),
    soldPriceToman: 32_000_000,
    saleChannel: Channel.ONLINE,
  },
  {
    id: 'item-accessory-listed',
    productId: 'prod-accessory',
    status: ItemStatus.LISTED,
    purchaseToman: 4_500_000,
    feesToman: 500_000,
    refurbToman: 0,
    acquiredAt: daysAgo(60),
    listedAt: daysAgo(50),
    soldAt: null,
    soldPriceToman: null,
    saleChannel: null,
  },
  {
    id: 'item-accessory-stock',
    productId: 'prod-accessory',
    status: ItemStatus.IN_STOCK,
    purchaseToman: 3_000_000,
    feesToman: 200_000,
    refurbToman: 0,
    acquiredAt: daysAgo(120),
    listedAt: null,
    soldAt: null,
    soldPriceToman: null,
    saleChannel: null,
  },
  {
    id: 'item-accessory-sold-refurb',
    productId: 'prod-accessory',
    status: ItemStatus.SOLD,
    purchaseToman: 6_000_000,
    feesToman: 1_000_000,
    refurbToman: 1_000_000,
    acquiredAt: daysAgo(45),
    listedAt: daysAgo(20),
    soldAt: daysAgo(5),
    soldPriceToman: 12_000_000,
    saleChannel: Channel.OTHER,
  },
  {
    id: 'item-accessory-sold-base',
    productId: 'prod-accessory',
    status: ItemStatus.SOLD,
    purchaseToman: 6_000_000,
    feesToman: 1_000_000,
    refurbToman: 0,
    acquiredAt: daysAgo(80),
    listedAt: daysAgo(60),
    soldAt: daysAgo(55),
    soldPriceToman: 10_000_000,
    saleChannel: Channel.ONLINE,
  },
  {
    id: 'item-audio-stock',
    productId: 'prod-audio',
    status: ItemStatus.IN_STOCK,
    purchaseToman: 5_000_000,
    feesToman: 0,
    refurbToman: 0,
    acquiredAt: daysAgo(250),
    listedAt: null,
    soldAt: null,
    soldPriceToman: null,
    saleChannel: null,
  },
  {
    id: 'item-cameras-reserved',
    productId: 'prod-cameras',
    status: ItemStatus.RESERVED,
    purchaseToman: 2_000_000,
    feesToman: 200_000,
    refurbToman: 0,
    acquiredAt: daysAgo(80),
    listedAt: null,
    soldAt: null,
    soldPriceToman: null,
    saleChannel: null,
  },
  {
    id: 'item-gaming-listed',
    productId: 'prod-gaming',
    status: ItemStatus.LISTED,
    purchaseToman: 3_000_000,
    feesToman: 150_000,
    refurbToman: 0,
    acquiredAt: daysAgo(20),
    listedAt: daysAgo(18),
    soldAt: null,
    soldPriceToman: null,
    saleChannel: null,
  },
  {
    id: 'item-appliances-reserved',
    productId: 'prod-appliances',
    status: ItemStatus.RESERVED,
    purchaseToman: 2_500_000,
    feesToman: 100_000,
    refurbToman: 0,
    acquiredAt: daysAgo(45),
    listedAt: null,
    soldAt: null,
    soldPriceToman: null,
    saleChannel: null,
  },
  {
    id: 'item-drones-stock',
    productId: 'prod-drones',
    status: ItemStatus.IN_STOCK,
    purchaseToman: 3_200_000,
    feesToman: 100_000,
    refurbToman: 0,
    acquiredAt: daysAgo(100),
    listedAt: null,
    soldAt: null,
    soldPriceToman: null,
    saleChannel: null,
  },
  {
    id: 'item-smarthome-stock',
    productId: 'prod-smarthome',
    status: ItemStatus.IN_STOCK,
    purchaseToman: 3_500_000,
    feesToman: 120_000,
    refurbToman: 0,
    acquiredAt: daysAgo(140),
    listedAt: null,
    soldAt: null,
    soldPriceToman: null,
    saleChannel: null,
  },
  {
    id: 'item-wearables-stock',
    productId: 'prod-wearables',
    status: ItemStatus.IN_STOCK,
    purchaseToman: 3_800_000,
    feesToman: 150_000,
    refurbToman: 0,
    acquiredAt: daysAgo(200),
    listedAt: null,
    soldAt: null,
    soldPriceToman: null,
    saleChannel: null,
  },
  {
    id: 'item-networking-stock',
    productId: 'prod-networking',
    status: ItemStatus.IN_STOCK,
    purchaseToman: 4_200_000,
    feesToman: 100_000,
    refurbToman: 0,
    acquiredAt: daysAgo(15),
    listedAt: null,
    soldAt: null,
    soldPriceToman: null,
    saleChannel: null,
  },
  {
    id: 'item-storage-stock',
    productId: 'prod-storage',
    status: ItemStatus.IN_STOCK,
    purchaseToman: 4_500_000,
    feesToman: 150_000,
    refurbToman: 0,
    acquiredAt: daysAgo(25),
    listedAt: null,
    soldAt: null,
    soldPriceToman: null,
    saleChannel: null,
  },
];

const categoryById = new Map(categories.map((category) => [category.id, category]));
const productById = new Map(products.map((product) => [product.id, product]));

type WhereInput = Parameters<typeof prisma.item.findMany>[0] extends { where: infer W } ? W : never;

function matchesWhereClause(item: ItemRecord, where?: WhereInput): boolean {
  if (!where) {
    return true;
  }

  if (where.status) {
    if (typeof where.status === 'string') {
      if (item.status !== where.status) {
        return false;
      }
    } else if (Array.isArray(where.status.in)) {
      if (!where.status.in.includes(item.status)) {
        return false;
      }
    }
  }

  if (where.soldAt) {
    const soldAt = item.soldAt;
    if (where.soldAt.not !== undefined) {
      if (where.soldAt.not === null && soldAt == null) {
        return false;
      }
      if (where.soldAt.not !== null && soldAt === where.soldAt.not) {
        return false;
      }
    }
    if (where.soldAt.gte && (!soldAt || soldAt < where.soldAt.gte)) {
      return false;
    }
    if (where.soldAt.lte && (!soldAt || soldAt > where.soldAt.lte)) {
      return false;
    }
  }

  if (where.listedAt) {
    const listedAt = item.listedAt;
    if (where.listedAt.not !== undefined) {
      if (where.listedAt.not === null && listedAt == null) {
        return false;
      }
    }
    if (where.listedAt.gte && (!listedAt || listedAt < where.listedAt.gte)) {
      return false;
    }
    if (where.listedAt.lte && (!listedAt || listedAt > where.listedAt.lte)) {
      return false;
    }
  }

  if (where.soldPriceToman) {
    const soldPrice = item.soldPriceToman;
    if (where.soldPriceToman.not !== undefined) {
      if (where.soldPriceToman.not === null && soldPrice == null) {
        return false;
      }
      if (where.soldPriceToman.not !== null && soldPrice === where.soldPriceToman.not) {
        return false;
      }
    }
  }

  if (where.acquiredAt) {
    if (where.acquiredAt.gte && item.acquiredAt < where.acquiredAt.gte) {
      return false;
    }
    if (where.acquiredAt.lte && item.acquiredAt > where.acquiredAt.lte) {
      return false;
    }
  }

  return true;
}

function buildProductSelection(productId: string, select: Record<string, unknown>): unknown {
  const product = productById.get(productId);
  if (!product) {
    return null;
  }
  const category = product.categoryId ? categoryById.get(product.categoryId) ?? null : null;
  const result: Record<string, unknown> = {};
  for (const key of Object.keys(select)) {
    if (key === 'categoryId') {
      result.categoryId = product.categoryId ?? null;
    } else if (key === 'name') {
      result.name = product.name;
    } else if (key === 'category') {
      const value = select.category;
      if (value === true) {
        result.category = category;
      } else if (value && typeof value === 'object' && 'select' in value) {
        const categorySelect = (value as { select?: Record<string, boolean> }).select ?? {};
        if (categorySelect.name) {
          result.category = category ? { name: category.name } : null;
        }
      }
    }
  }
  return result;
}

function selectItemFields(item: ItemRecord, select: Record<string, unknown>): unknown {
  const result: Record<string, unknown> = {};
  for (const key of Object.keys(select)) {
    if (key === 'product') {
      const value = select.product;
      if (value === true) {
        const product = productById.get(item.productId);
        result.product = product
          ? {
              ...product,
              category: product.categoryId ? categoryById.get(product.categoryId) ?? null : null,
            }
          : null;
      } else if (value && typeof value === 'object' && 'select' in value) {
        result.product = buildProductSelection(item.productId, (value as { select: Record<string, unknown> }).select);
      }
    } else {
      result[key] = (item as Record<string, unknown>)[key];
    }
  }
  return result;
}

function setupPrismaMocks() {
  vi.spyOn(prisma.item, 'findMany').mockImplementation(async (args?: Parameters<typeof prisma.item.findMany>[0]) => {
    const where = args?.where;
    let result = items.filter((item) => matchesWhereClause(item, where));

    if (args?.orderBy && 'soldAt' in args.orderBy) {
      const direction = args.orderBy.soldAt;
      result = [...result].sort((a, b) => {
        const left = a.soldAt ? a.soldAt.getTime() : 0;
        const right = b.soldAt ? b.soldAt.getTime() : 0;
        return direction === 'desc' ? right - left : left - right;
      });
    }

    if (typeof args?.take === 'number') {
      result = result.slice(0, args.take);
    }

    if (args?.select) {
      return result.map((item) => selectItemFields(item, args.select as Record<string, unknown>));
    }

    return result.map((item) => ({
      ...item,
      product: buildProductSelection(item.productId, { categoryId: true, category: { select: { name: true } }, name: true }),
    }));
  });

  vi.spyOn(prisma.item, 'groupBy').mockImplementation(async (args: Parameters<typeof prisma.item.groupBy>[0]) => {
    const filtered = items.filter((item) => matchesWhereClause(item, args.where as WhereInput));
    const groups = new Map<string, { saleChannel: Channel | null; _count: { _all: number }; _sum: { soldPriceToman: number | null } }>();

    filtered.forEach((item) => {
      const key = item.saleChannel ?? null;
      if (key == null && !args.by.includes('saleChannel')) {
        return;
      }
      const mapKey = key ?? 'null';
      const existing = groups.get(mapKey) ?? {
        saleChannel: key,
        _count: { _all: 0 },
        _sum: { soldPriceToman: 0 },
      };
      existing._count._all += 1;
      if (item.soldPriceToman != null) {
        existing._sum.soldPriceToman = (existing._sum.soldPriceToman ?? 0) + item.soldPriceToman;
      }
      groups.set(mapKey, existing);
    });

    return Array.from(groups.values());
  });

  vi.spyOn(prisma.item, 'count').mockImplementation(async (args?: Parameters<typeof prisma.item.count>[0]) => {
    return items.filter((item) => matchesWhereClause(item, args?.where as WhereInput)).length;
  });
}

beforeAll(() => {
  vi.useFakeTimers();
  vi.setSystemTime(TEST_NOW);
});

afterAll(() => {
  vi.useRealTimers();
});

beforeEach(() => {
  setupPrismaMocks();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('advanced analytics queries', () => {
  it('summarises inventory by status and category with other bucket', async () => {
    const breakdown = await getInventoryBreakdown();

    expect(breakdown.rows.length).toBe(11);

    const laptopsRow = breakdown.rows.find((row) => row.categoryName.includes('Laptops'));
    expect(laptopsRow?.statuses.IN_STOCK.count).toBe(1);
    expect(laptopsRow?.statuses.LISTED.count).toBe(1);
    expect(laptopsRow?.totalCount).toBe(2);

    const otherRow = breakdown.rows[breakdown.rows.length - 1];
    const otherTotalCount =
      otherRow.statuses.IN_STOCK.count +
      otherRow.statuses.LISTED.count +
      otherRow.statuses.RESERVED.count;
    expect(otherRow.categoryName).toBe('Other');
    expect(otherTotalCount).toBe(2);

    expect(breakdown.grandTotals.totalCount).toBeGreaterThan(0);
  });

  it('computes channel mix with revenue totals', async () => {
    const mix = await getChannelMix({ from: daysAgo(120), to: TEST_NOW });

    expect(mix).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ channel: Channel.DIRECT, count: 2, revenueT: 95_000_000 }),
        expect.objectContaining({ channel: Channel.ONLINE, count: 3, revenueT: 112_000_000 }),
        expect.objectContaining({ channel: Channel.OTHER, count: 1, revenueT: 12_000_000 }),
      ]),
    );
  });

  it('ranks top products by profit with median pricing', async () => {
    const productsByProfit = await getTopProductsByProfit({ from: daysAgo(120), to: TEST_NOW, limit: 10 });
    const laptop = productsByProfit.find((product) => product.productName.includes('Laptop Ultra'));
    const phone = productsByProfit.find((product) => product.productName.includes('Phone Prime'));

    expect(laptop).toMatchObject({
      unitsSold: 2,
      totalProfitT: 37_000_000,
      averageProfitT: 18_500_000,
      medianSoldPriceT: 67_500_000,
    });
    expect(phone).toMatchObject({
      unitsSold: 2,
      totalProfitT: 21_000_000,
      averageProfitT: 10_500_000,
      medianSoldPriceT: 31_000_000,
    });
  });

  it('calculates repair ROI versus non-refurbished peers', async () => {
    const roi = await getRepairRoi({ from: daysAgo(120), to: TEST_NOW });

    expect(roi).toEqual({
      refurbCount: 2,
      totalRefurbCostT: 6_000_000,
      totalRefurbProfitT: 24_000_000,
      peerBaselineProfitT: 20_000_000,
      extraMarginT: 4_000_000,
      averageExtraMarginPerItemT: 2_000_000,
    });
  });

  it('computes sell-through per category', async () => {
    const sellThrough = await getSellThrough({ from: daysAgo(90), to: TEST_NOW });

    const laptops = sellThrough.find((entry) => entry.categoryName.includes('Laptops'));
    const phones = sellThrough.find((entry) => entry.categoryName.includes('Phones'));
    const accessories = sellThrough.find((entry) => entry.categoryName.includes('Accessories'));

    expect(laptops?.sellThroughRate ?? 0).toBeCloseTo(0.5, 5);
    expect(phones?.sellThroughRate ?? 0).toBeCloseTo(2 / 3, 5);
    expect(accessories?.sellThroughRate ?? 0).toBeCloseTo(0.5, 5);
  });

  it('returns aging histogram with 10-day bins', async () => {
    const histogram = await getAgingHistogram();

    const zeroToNine = histogram.find((bucket) => bucket.label === '0-9');
    expect(zeroToNine?.count).toBe(1);

    const thirtyToThirtyNine = histogram.find((bucket) => bucket.label === '30-39');
    expect(thirtyToThirtyNine?.count).toBe(2);

    const overflow = histogram[histogram.length - 1];
    expect(overflow.label).toBe('240+');
    expect(overflow.count).toBeGreaterThanOrEqual(1);
  });

  it('provides price vs margin sampling capped by limit', async () => {
    const sample = await getPriceVsMarginSample({ limit: 5 });
    expect(sample).toHaveLength(5);
    expect(sample[0]).toMatchObject({ soldPriceT: 12_000_000, marginT: 4_000_000 });
  });

  it('summarises listing funnel for last 90 days', async () => {
    const funnel = await getListingFunnel();

    expect(funnel.from).toEqual(daysAgo(90));
    expect(funnel.inStock).toBeGreaterThanOrEqual(4);
    expect(funnel.listed).toBeGreaterThanOrEqual(3);
    expect(funnel.sold).toBe(6);
  });

  it('computes rolling averages for 30 and 60 days', async () => {
    const rolling = await getRollingAverages();

    expect(rolling.days30.averageDailyProfitT).toBeCloseTo(45_000_000 / 30, 5);
    expect(rolling.days30.averageDailyUnits).toBeCloseTo(4 / 30, 5);
    expect(rolling.days60.averageDailyProfitT).toBeCloseTo(65_000_000 / 60, 5);
    expect(rolling.days60.averageDailyUnits).toBeCloseTo(6 / 60, 5);
  });
});

