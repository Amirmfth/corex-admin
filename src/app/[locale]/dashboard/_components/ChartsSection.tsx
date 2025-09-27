import { getTranslations } from 'next-intl/server';

import GroupedBarChart from '@/components/dashboard/GroupedBarChart';
import MiniBarChart from '@/components/dashboard/MiniBarChart';
import { Badge } from '@/components/ui/badge';

import type { AppLocale } from '../../../../../i18n/routing';
import type { MonthlyPnlPoint } from '../../../../../lib/analytics';
import { formatMonthLabel } from '../utils';

interface ChartsSectionProps {
  locale: AppLocale;
  monthlyPnlPromise: Promise<MonthlyPnlPoint[]>;
}

export default async function ChartsSection({
  locale,
  monthlyPnlPromise,
}: ChartsSectionProps) {
  const t = await getTranslations({ locale, namespace: 'dashboard' });
  const monthlyPnl = await monthlyPnlPromise;

  const profitChartData = monthlyPnl.map((entry) => ({
    label: formatMonthLabel(entry.month, locale),
    value: entry.profitT,
  }));

  const pnlChartData = monthlyPnl.map((entry) => ({
    label: formatMonthLabel(entry.month, locale),
    revenueT: entry.revenueT,
    costT: entry.costT,
    profitT: entry.profitT,
  }));

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <div className="flex flex-col gap-3 rounded-2xl border border-[var(--surface-hover)] bg-white/80 p-5 shadow-sm">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-[var(--foreground)]">
            {t('charts.profitTitle')}
          </h2>
          <Badge>{t('charts.profitValue')}</Badge>
        </div>
        <MiniBarChart
          data={profitChartData}
          locale={locale}
          valueLabel={t('charts.profitValue')}
        />
      </div>
      <div className="flex flex-col gap-3 rounded-2xl border border-[var(--surface-hover)] bg-white/80 p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-[var(--foreground)]">{t('charts.pnlTitle')}</h2>
        <GroupedBarChart
          data={pnlChartData}
          locale={locale}
          labels={{
            revenue: t('charts.revenue'),
            cost: t('charts.cost'),
            profit: t('charts.profit'),
            currency: t('charts.valueLabel'),
          }}
        />
      </div>
    </div>
  );
}
