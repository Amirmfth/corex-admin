import { ArrowRight, ClipboardList, Receipt } from 'lucide-react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';

import { routing, type AppLocale } from '../../../../i18n/routing';
import { formatDate } from '../../../../lib/date';
import { getSalesList } from '../../../../lib/sales';
import PageHeader from '../../../components/PageHeader';
import DeleteSaleButton from '../../../components/sales/DeleteSaleButton';

export const dynamic = 'force-dynamic';

interface SalesPageProps {
  params: Promise<{ locale: string }>;
}

export default async function SalesPage({ params }: SalesPageProps) {
  const { locale } = await params;

  if (!(routing.locales as readonly string[]).includes(locale)) {
    notFound();
  }

  const typedLocale = locale as AppLocale;
  const [sales, t] = await Promise.all([
    getSalesList(),
    getTranslations({ locale: typedLocale, namespace: 'sales' }),
  ]);

  const intlLocale = typedLocale === 'fa' ? 'fa-IR' : 'en-US';
  const hasSales = sales.length > 0;

  return (
    <section className="flex flex-col gap-6">
      <PageHeader
        title={t('overviewTitle')}
        description={t('overviewSubtitle')}
        actions={
          <Link
            href={`/${typedLocale}/sales/new`}
            className="inline-flex items-center gap-2 rounded-full border border-transparent bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-[var(--accent-foreground)] transition hover:bg-[var(--accent-hover)] shadow-[0_8px_20px_var(--shadow-color)]"
          >
            <Receipt className="size-4" aria-hidden />
            <span>{t('submit')}</span>
          </Link>
        }
      />

      {hasSales ? (
        <div className="overflow-hidden rounded-3xl border border-[var(--border)] bg-[var(--surface)] shadow-sm">
          <table className="min-w-full divide-y divide-[var(--border)] text-sm text-center">
            <thead className="bg-[var(--surface-muted)] text-[var(--muted)]">
              <tr>
                <th className="px-4 py-3  font-medium">{t('tableCustomer')}</th>
                <th className="px-4 py-3  font-medium">{t('tableReference')}</th>
                <th className="px-4 py-3  font-medium">{t('tableTotalItems')}</th>
                <th className="px-4 py-3  font-medium">{t('tableFulfilled')}</th>
                <th className="px-4 py-3  font-medium">{t('tableCreated')}</th>
                <th className="px-4 py-3  font-medium" />
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {sales.map((sale) => {
                return (
                  <tr key={sale.id}>
                    <td className="px-4 py-3 text-[var(--foreground)]">
                      {sale.customerName ?? t('emptyCustomer')}
                    </td>
                    <td className="px-4 py-3 text-[var(--foreground)]">
                      {sale.reference ?? t('emptyReference')}
                    </td>
                    <td className="px-4 py-3 text-[var(--foreground)]">
                      {sale.totalItems.toLocaleString(intlLocale)}
                    </td>
                    <td className="px-4 py-3 text-[var(--foreground)]">
                      {sale.fulfilledItems.toLocaleString(intlLocale)} /{' '}
                      {sale.totalItems.toLocaleString(intlLocale)}
                    </td>
                    <td className="px-4 py-3 text-[var(--foreground)]">
                      {formatDate(sale.createdAt, intlLocale)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-3">
                        <Link
                          href={`/${typedLocale}/sales/${sale.id}`}
                          className="inline-flex items-center gap-1 text-xs font-medium text-[var(--accent)] transition hover:text-[var(--accent-hover)]"
                        >
                          <span>{t('viewDetails')}</span>
                          <ArrowRight className="size-3.5" aria-hidden />
                        </Link>
                        <DeleteSaleButton saleId={sale.id} />
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="rounded-3xl border border-dashed border-[var(--border)] bg-[var(--surface-muted)] p-10 text-center">
          <div className="mx-auto mb-4 flex size-16 items-center justify-center rounded-full bg-[var(--surface-hover)] text-[var(--accent)] shadow-inner">
            <ClipboardList className="size-7" aria-hidden />
          </div>
          <h2 className="text-lg font-semibold text-[var(--foreground)]">{t('emptyListTitle')}</h2>
          <p className="mt-2 text-sm text-[var(--muted)]">{t('emptyListBody')}</p>
          <Link
            href={`/${typedLocale}/sales/new`}
            className="mt-4 inline-flex items-center gap-2 rounded-full border border-transparent bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-[var(--accent-foreground)] transition hover:bg-[var(--accent-hover)] shadow-[0_8px_20px_var(--shadow-color)]"
          >
            <Receipt className="size-4" aria-hidden />
            <span>{t('submit')}</span>
          </Link>
        </div>
      )}
    </section>
  );
}
