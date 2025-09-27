import { parse } from 'date-fns';
import { notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';

import GroupedBarChart from '@/components/dashboard/GroupedBarChart';
import ItemListPanel from '@/components/dashboard/ItemListPanel';
import KpiCard from '@/components/dashboard/KpiCard';
import MiniBarChart from '@/components/dashboard/MiniBarChart';
import PageHeader from '@/components/PageHeader';
import { Badge } from '@/components/ui/badge';

import { routing, type AppLocale } from '../../../../../i18n/routing';
import {
  getAvgDaysInStock,
  getAgingBuckets,
  getAgingWatchlist,
  getInventoryValue,
  getItemsInStockCount,
  getMonthlyPnl,
  getProfitMTD,
  getStaleListed,
} from '../../../../../lib/analytics';
import { formatToman } from '../../../../../lib/money';

interface DashboardPageProps {
  params: Promise<{ locale: string }>;
}

export const dynamic = 'force-dynamic';

function ensureLocale(locale: string): locale is AppLocale {
  return (routing.locales as readonly string[]).includes(locale);
}

function getNumberFormatter(locale: AppLocale) {
  return new Intl.NumberFormat(locale === 'fa' ? 'fa-IR' : 'en-US');
}

function getCurrencyFormatter(locale: AppLocale) {
  return (value: number) => formatToman(Math.round(value), locale === 'fa' ? 'fa-IR' : 'en-US');
}

function formatMonthLabel(monthKey: string, locale: AppLocale) {
  const reference = parse(monthKey, 'yyyy-MM', new Date());
  return new Intl.DateTimeFormat(locale === 'fa' ? 'fa-IR' : 'en-US', {
    month: 'short',
    year: '2-digit',
  }).format(reference);
}

export default async function DashboardPage({ params }: DashboardPageProps) {
  const { locale } = await params;

  if (!ensureLocale(locale)) {
    notFound();
  }

  const typedLocale = locale as AppLocale;
  const t = await getTranslations({ locale: typedLocale, namespace: 'dashboard' });

  const [
    inventoryValue,
    profitMTD,
    itemsInStock,
    avgDaysInStock,
    monthlyPnl,
    agingBuckets,
    agingWatchlist,
    stale30,
    stale60,
  ] = await Promise.all([
    getInventoryValue(),
    getProfitMTD(),
    getItemsInStockCount(),
    getAvgDaysInStock(),
    getMonthlyPnl({ months: 12 }),
    getAgingBuckets(),
    getAgingWatchlist(),
    getStaleListed({ days: 30 }),
    getStaleListed({ days: 60 }),
  ]);

  const numberFormatter = getNumberFormatter(typedLocale);
  const currencyFormatter = getCurrencyFormatter(typedLocale);
  const now = new Date();
  const monthToDateLabel = new Intl.DateTimeFormat(typedLocale === 'fa' ? 'fa-IR' : 'en-US', {
    month: 'long',
    year: 'numeric',
  }).format(now);

  const activeCount =
    agingBuckets['0-30'].count +
    agingBuckets['31-90'].count +
    agingBuckets['91-180'].count +
    agingBuckets['181+'].count;

  const profitChartData = monthlyPnl.map((entry) => ({
    label: formatMonthLabel(entry.month, typedLocale),
    value: entry.profitT,
  }));

  const pnlChartData = monthlyPnl.map((entry) => ({
    label: formatMonthLabel(entry.month, typedLocale),
    revenueT: entry.revenueT,
    costT: entry.costT,
    profitT: entry.profitT,
  }));

  const agingOver90Count = agingBuckets['91-180'].count + agingBuckets['181+'].count;
  const agingOver180Count = agingBuckets['181+'].count;

  const staleOver30Count = stale30.length;
  const staleOver60Count = stale60.length;

  const agingItems = agingWatchlist.over90.map((item) => ({
    id: item.id,
    productName: item.productName,
    serial: item.serial,
    ageDays: item.daysInStock,
    costToman: item.costToman,
    listedPriceToman: item.listedPriceToman,
  }));

  const staleItems = stale30.map((item) => ({
    id: item.id,
    productName: item.productName,
    serial: item.serial,
    ageDays: item.daysListed,
    costToman: item.costToman,
    listedPriceToman: item.listedPriceToman,
  }));

  const ageFormatter = (days: number) =>
    t('lists.ageLabel', { count: numberFormatter.format(Math.max(days, 0)) });
  const listHeaders = t.raw('lists.headers') as {
    product: string;
    serial: string;
    age: string;
    cost: string;
    price: string;
  };

  return (
    <section className="flex flex-col gap-6">
      <PageHeader title={t('title')} description={t('subtitle')} />

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

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="flex flex-col gap-3 rounded-2xl border border-[var(--surface-hover)] bg-white/80 p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-[var(--foreground)]">{t('charts.profitTitle')}</h2>
            <Badge>{t('charts.profitValue')}</Badge>
          </div>
          <MiniBarChart data={profitChartData} locale={typedLocale} valueLabel={t('charts.profitValue')} />
        </div>
        <div className="flex flex-col gap-3 rounded-2xl border border-[var(--surface-hover)] bg-white/80 p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-[var(--foreground)]">{t('charts.pnlTitle')}</h2>
          <GroupedBarChart
            data={pnlChartData}
            locale={typedLocale}
            labels={{
              revenue: t('charts.revenue'),
              cost: t('charts.cost'),
              profit: t('charts.profit'),
              currency: t('charts.valueLabel'),
            }}
          />
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <ItemListPanel
          locale={typedLocale}
          title={t('lists.aging.title')}
          description={t('lists.aging.description', {
            over90: numberFormatter.format(agingOver90Count),
            over180: numberFormatter.format(agingOver180Count),
          })}
          emptyLabel={t('lists.aging.empty')}
          items={agingItems}
          headers={listHeaders}
          formatAge={ageFormatter}
          renderBadge={(item) =>
            item.ageDays >= 180 ? <Badge variant="warning">{t('lists.aging.badge180')}</Badge> : null
          }
        />
        <ItemListPanel
          locale={typedLocale}
          title={t('lists.stale.title')}
          description={t('lists.stale.description', {
            over30: numberFormatter.format(staleOver30Count),
            over60: numberFormatter.format(staleOver60Count),
          })}
          emptyLabel={t('lists.stale.empty')}
          items={staleItems}
          headers={listHeaders}
          formatAge={ageFormatter}
          renderBadge={(item) =>
            item.ageDays >= 60 ? <Badge variant="warning">{t('lists.stale.badge60')}</Badge> : null
          }
        />
      </div>
    </section>
  );
}
