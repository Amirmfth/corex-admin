import { Channel, ItemStatus } from '@prisma/client';
import { differenceInCalendarDays, subDays } from 'date-fns';

import { getBusinessRulesSettings } from '@/lib/app-settings';

import { totalCost } from './calc';
import { prisma } from './prisma';

const ACTIVE_STATUSES: ItemStatus[] = [
  ItemStatus.IN_STOCK,
  ItemStatus.LISTED,
  ItemStatus.RESERVED,
];

export type AlertItemBase = {
  id: string;
  productName: string;
  serial: string;
  status: ItemStatus;
  listedPriceToman: number | null;
  listedChannel: Channel | null;
  saleChannel: Channel | null;
  soldPriceToman: number | null;
  costToman: number;
};

export type AgingAlertItem = AlertItemBase & {
  acquiredAt: string;
  daysInStock: number;
};

export type StaleListingAlertItem = AlertItemBase & {
  listedAt: string | null;
  daysListed: number;
};

export type LowMarginAlertItem = AlertItemBase & {
  soldAt: string | null;
  marginPercent: number;
  marginToman: number;
};

export type AlertsSummary = {
  aging: {
    count: number;
    thresholdDays: number;
    items: AgingAlertItem[];
  };
  stale: {
    count: number;
    thresholdDays: number;
    items: StaleListingAlertItem[];
  };
  margin: {
    count: number;
    thresholdPercent: number;
    items: LowMarginAlertItem[];
  };
};

type SummaryOptions = {
  limit?: number;
};

export async function getAlertsSummary({ limit = 5 }: SummaryOptions = {}): Promise<AlertsSummary> {
  const sanitizedLimit = Math.max(1, Math.min(limit, 20));
  const [rules, now] = await Promise.all([getBusinessRulesSettings(), Promise.resolve(new Date())]);

  const agingThreshold = rules.agingThresholds[2];
  const staleThreshold = rules.staleListingThresholdDays;
  const minMarginPercent = rules.minimumMarginPercent;

  const agingWhere = {
    status: { in: ACTIVE_STATUSES },
    acquiredAt: { lte: subDays(now, agingThreshold) },
  } as const;

  const staleWhere = {
    status: ItemStatus.LISTED,
    listedAt: { not: null, lte: subDays(now, staleThreshold) },
  } as const;

  const [agingCount, agingItemsRaw, staleCount, staleItemsRaw] = await Promise.all([
    prisma.item.count({ where: agingWhere }),
    prisma.item.findMany({
      where: agingWhere,
      orderBy: { acquiredAt: 'asc' },
      take: sanitizedLimit,
      select: {
        id: true,
        serial: true,
        status: true,
        acquiredAt: true,
        listedPriceToman: true,
        listedChannel: true,
        saleChannel: true,
        soldPriceToman: true,
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
    }),
    prisma.item.count({ where: staleWhere }),
    prisma.item.findMany({
      where: staleWhere,
      orderBy: { listedAt: 'asc' },
      take: sanitizedLimit,
      select: {
        id: true,
        serial: true,
        status: true,
        listedAt: true,
        listedPriceToman: true,
        listedChannel: true,
        saleChannel: true,
        soldPriceToman: true,
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
    }),
  ]);

  const agingItems: AgingAlertItem[] = agingItemsRaw.map((item) => {
    const daysInStock = Math.max(0, differenceInCalendarDays(now, item.acquiredAt));
    const productParts = [item.product?.brand, item.product?.name, item.product?.model].filter(Boolean);
    const productName = productParts.join(' ').trim() || item.product?.name || '—';

    return {
      id: item.id,
      productName,
      serial: item.serial,
      status: item.status,
      listedPriceToman: item.listedPriceToman,
      listedChannel: item.listedChannel,
      saleChannel: item.saleChannel,
      soldPriceToman: item.soldPriceToman,
      costToman: totalCost(item),
      acquiredAt: item.acquiredAt.toISOString(),
      daysInStock,
    } satisfies AgingAlertItem;
  });

  const staleItems: StaleListingAlertItem[] = staleItemsRaw.map((item) => {
    const referenceDate = item.listedAt ?? now;
    const daysListed = Math.max(0, differenceInCalendarDays(now, referenceDate));
    const productParts = [item.product?.brand, item.product?.name, item.product?.model].filter(Boolean);
    const productName = productParts.join(' ').trim() || item.product?.name || '—';

    return {
      id: item.id,
      productName,
      serial: item.serial,
      status: item.status,
      listedPriceToman: item.listedPriceToman,
      listedChannel: item.listedChannel,
      saleChannel: item.saleChannel,
      soldPriceToman: item.soldPriceToman,
      costToman: totalCost(item),
      listedAt: item.listedAt ? item.listedAt.toISOString() : null,
      daysListed,
    } satisfies StaleListingAlertItem;
  });

  const soldItems = await prisma.item.findMany({
    where: {
      status: ItemStatus.SOLD,
      soldPriceToman: { not: null },
    },
    select: {
      id: true,
      serial: true,
      status: true,
      soldAt: true,
      soldPriceToman: true,
      saleChannel: true,
      listedPriceToman: true,
      listedChannel: true,
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

  const lowMarginItems = soldItems
    .map((item) => {
      const soldPrice = item.soldPriceToman ?? 0;
      if (soldPrice <= 0) {
        return null;
      }

      const cost = totalCost(item);
      const marginToman = soldPrice - cost;
      const marginPercent = (marginToman / soldPrice) * 100;
      const productParts = [item.product?.brand, item.product?.name, item.product?.model].filter(Boolean);
      const productName = productParts.join(' ').trim() || item.product?.name || '—';

      return {
        id: item.id,
        productName,
        serial: item.serial,
        status: item.status,
        listedPriceToman: item.listedPriceToman,
        listedChannel: item.listedChannel,
        saleChannel: item.saleChannel,
        soldPriceToman: item.soldPriceToman,
        costToman: cost,
        soldAt: item.soldAt ? item.soldAt.toISOString() : null,
        marginPercent,
        marginToman,
      } satisfies LowMarginAlertItem;
    })
    .filter((item): item is LowMarginAlertItem => item !== null)
    .filter((item) => item.marginPercent < minMarginPercent)
    .sort((a, b) => a.marginPercent - b.marginPercent);

  const marginCount = lowMarginItems.length;
  const marginItems = lowMarginItems.slice(0, sanitizedLimit);

  return {
    aging: {
      count: agingCount,
      thresholdDays: agingThreshold,
      items: agingItems,
    },
    stale: {
      count: staleCount,
      thresholdDays: staleThreshold,
      items: staleItems,
    },
    margin: {
      count: marginCount,
      thresholdPercent: minMarginPercent,
      items: marginItems,
    },
  } satisfies AlertsSummary;
}
