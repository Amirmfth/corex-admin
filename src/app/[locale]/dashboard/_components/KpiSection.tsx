import { getTranslations } from 'next-intl/server';

import KpiCard from '@/components/dashboard/KpiCard';

import type { AppLocale } from '../../../../../i18n/routing';
import {
  getAvgDaysInStock,
  getAgingBuckets,
  getInventoryValue,
  getItemsInStockCount,
  getProfitMTD,
} from '../../../../../lib/analytics';
import {
  getCurrencyFormatter,
  getMonthToDateLabel,
  getNumberFormatter,
} from '../utils';

interface KpiSectionProps {
  locale: AppLocale;
}

export default async function KpiSection({ locale }: KpiSectionProps) {
  const t = await getTranslations({ locale, namespace: 'dashboard' });
  const [inventoryValue, profitMTD, itemsInStock, avgDaysInStock, agingBuckets] = await Promise.all([
    getInventoryValue(),
    getProfitMTD(),
    getItemsInStockCount(),
    getAvgDaysInStock(),
    getAgingBuckets(),
  ]);

  const numberFormatter = getNumberFormatter(locale);
  const currencyFormatter = getCurrencyFormatter(locale);
  const monthToDateLabel = getMonthToDateLabel(locale);

  const activeCount = agingBuckets.reduce((sum, bucket) => sum + bucket.count, 0);

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <KpiCard
        label={t('kpi.inventoryValue')}
        value={currencyFormatter(inventoryValue)}
        helper={t('kpi.inventoryHelper', { count: numberFormatter.format(activeCount) })}
      />
      <KpiCard
        label={t('kpi.profitMtd')}
        value={currencyFormatter(profitMTD)}
        helper={t('kpi.profitHelper', { month: monthToDateLabel })}
        accent={profitMTD >= 0 ? 'positive' : 'warning'}
      />
      <KpiCard
        label={t('kpi.itemsInStock')}
        value={numberFormatter.format(itemsInStock)}
        helper={t('kpi.itemsInStockHelper')}
      />
      <KpiCard
        label={t('kpi.avgDays')}
        value={numberFormatter.format(Math.round(avgDaysInStock))}
        helper={t('kpi.avgDaysHelper')}
      />
    </div>
  );
}
