import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';

import { routing, type AppLocale } from '../../../../i18n/routing';
import { formatToman } from '../../../../lib/money';
import { getAgingBuckets, getInventorySummary, getMonthlyProfit } from '../../../../lib/reports';
import PageHeader from '../../../components/PageHeader';

export const dynamic = 'force-dynamic';

type ReportsPageProps = {
  params: Promise<{ locale: string }>;
};

function formatMonthLabel(locale: AppLocale, date: Date) {
  const formatter = new Intl.DateTimeFormat(locale === 'fa' ? 'fa-IR' : 'en-US', {
    month: 'short',
    year: '2-digit',
  });
  return formatter.format(date);
}

export default async function ReportsPage({ params }: ReportsPageProps) {
  const { locale } = await params;

  if (!(routing.locales as readonly string[]).includes(locale)) {
    notFound();
  }

  const typedLocale = locale as AppLocale;
  const intlLocale = typedLocale === 'fa' ? 'fa-IR' : 'en-US';

  const tReports = await getTranslations({ locale: typedLocale, namespace: 'reports' });
  const tSale = await getTranslations({ locale: typedLocale, namespace: 'saleNew' });

  const [inventory, monthlyProfit, agingBuckets] = await Promise.all([
    getInventorySummary(),
    getMonthlyProfit(),
    getAgingBuckets(),
  ]);

  const monthData = monthlyProfit.map((point) => ({
    label: formatMonthLabel(typedLocale, point.monthStart),
    value: point.profit,
  }));

  const maxAbsProfit = Math.max(1, ...monthData.map((entry) => Math.abs(entry.value)));

  const agingLabels = tReports('agingBucketLabels').split(',').map((s) => s.trim());

  console.log({agingBuckets,agingLabels})
  return (
    <section className="flex flex-col gap-6">
      <PageHeader
        title={tReports('title')}
        description={tReports('inventorySubtitle')}
        actions={
          <Link
            href={`/${typedLocale}/sales/new`}
            className="inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--surface)] px-4 py-2 text-sm font-medium text-[var(--muted-strong)] transition hover:border-[var(--accent)] hover:text-[var(--foreground)]"
          >
            {tSale('title')}
          </Link>
        }
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-sm">
          <h2 className="text-sm font-semibold uppercase text-[var(--muted)]">
            {tReports('inventoryTitle')}
          </h2>
          <p className="mt-4 text-3xl font-semibold text-[var(--foreground)]">
            {formatToman(inventory.totalCost, intlLocale as 'fa-IR' | 'en-US')}
          </p>
          <p className="mt-2 text-sm text-[var(--muted)]">
            {tReports('inventoryCount')}: {inventory.itemCount.toLocaleString(intlLocale)}
          </p>
        </div>
      </div>

      <div className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-[var(--foreground)]">
          {tReports('profitTitle')}
        </h2>
        {monthData.length === 0 ? (
          <p className="mt-2 text-sm text-[var(--muted)]">{tReports('noData')}</p>
        ) : (
          <div className="mt-6">
            <div className="flex items-end gap-3">
              {monthData.map((entry) => {
                const height = (Math.abs(entry.value) / maxAbsProfit) * 100;
                const positive = entry.value >= 0;
                return (
                  <div
                    key={entry.label}
                    className="flex flex-1 flex-col items-center gap-2 text-xs"
                  >
                    <div className="flex h-32 w-full items-end justify-center rounded-full bg-[var(--surface-hover)]">
                      <div
                        className={`w-3 rounded-full ${positive ? 'bg-emerald-500' : 'bg-rose-500'}`}
                        style={{ height: `${height}%` }}
                        title={formatToman(entry.value, intlLocale as 'fa-IR' | 'en-US')}
                      />
                    </div>
                    <span className="text-[var(--muted)]">{entry.label}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      <div className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-[var(--foreground)]">{tReports('agingTitle')}</h2>
        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full divide-y divide-[var(--border)] text-sm text-center">
            <thead className="bg-[var(--surface-muted)] text-[var(--muted)]">
              <tr>
                <th className="px-4 py-2  font-medium">{tReports('agingTitle')}</th>
                <th className="px-4 py-2  font-medium">{tReports('inventoryCount')}</th>
                <th className="px-4 py-2  font-medium">{tReports('inventoryTotal')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {agingBuckets.map((bucket, index) => (
                <tr key={bucket.label}>
                  <td className="px-4 py-3 text-[var(--muted-strong)]">
                    {agingLabels[index] ?? bucket.label}
                  </td>
                  <td className="px-4 py-3 text-[var(--muted-strong)]">
                    {bucket.count.toLocaleString(intlLocale)}
                  </td>
                  <td className="px-4 py-3 text-[var(--muted-strong)]">
                    {formatToman(bucket.totalCost, intlLocale as 'fa-IR' | 'en-US')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
