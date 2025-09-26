import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';

import { ArrowRight, ClipboardList, PackageSearch } from 'lucide-react';

import { routing, type AppLocale } from '../../../../i18n/routing';
import { formatDate } from '../../../../lib/date';
import { getPurchasesList } from '../../../../lib/purchases';
import PageHeader from '../../../components/PageHeader';

export const dynamic = 'force-dynamic';

interface PurchasesPageProps {
  params: Promise<{ locale: string }>;
}

export default async function PurchasesPage({ params }: PurchasesPageProps) {
  const { locale } = await params;

  if (!(routing.locales as readonly string[]).includes(locale)) {
    notFound();
  }

  const typedLocale = locale as AppLocale;
  const [purchases, t] = await Promise.all([
    getPurchasesList(),
    getTranslations({ locale: typedLocale, namespace: 'purchases' }),
  ]);

  const intlLocale = typedLocale === 'fa' ? 'fa-IR' : 'en-US';

  const hasPurchases = purchases.length > 0;

  return (
    <section className="flex flex-col gap-6">
      <PageHeader
        title={t('overviewTitle')}
        description={t('overviewSubtitle')}
        actions={
          <Link
            href={`/${typedLocale}/purchases/new`}
            className="inline-flex items-center gap-2 rounded-full border border-transparent bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-[var(--accent-foreground)] transition hover:bg-[var(--accent-hover)] shadow-[0_8px_20px_var(--shadow-color)]"
          >
            <PackageSearch className="size-4" aria-hidden />
            <span>{t('submit')}</span>
          </Link>
        }
      />

      {hasPurchases ? (
        <div className="overflow-hidden rounded-3xl border border-[var(--border)] bg-[var(--surface)] shadow-sm">
          <table className="min-w-full divide-y divide-[var(--border)] text-sm">
            <thead className="bg-[var(--surface-muted)] text-[var(--muted)]">
              <tr>
                <th className="px-4 py-3 text-left font-medium">{t('tableSupplier')}</th>
                <th className="px-4 py-3 text-left font-medium">{t('tableReference')}</th>
                <th className="px-4 py-3 text-left font-medium">{t('tableTotalItems')}</th>
                <th className="px-4 py-3 text-left font-medium">{t('tableReceived')}</th>
                <th className="px-4 py-3 text-left font-medium">{t('tableCreated')}</th>
                <th className="px-4 py-3 text-left font-medium" />
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {purchases.map((purchase) => {
                const fullyReceived =
                  purchase.totalItems > 0 && purchase.receivedItems >= purchase.totalItems;
                const statusLabel = fullyReceived ? t('statusReceived') : t('statusPending');

                return (
                  <tr key={purchase.id}>
                    <td className="px-4 py-3 text-[var(--foreground)]">{purchase.supplierName}</td>
                    <td className="px-4 py-3 text-[var(--foreground)]">
                      {purchase.reference ?? t('emptyReference')}
                    </td>
                    <td className="px-4 py-3 text-[var(--foreground)]">
                      {purchase.totalItems.toLocaleString(intlLocale)}
                    </td>
                    <td className="px-4 py-3 text-[var(--foreground)]">
                      {purchase.receivedItems.toLocaleString(intlLocale)} /{' '}
                      {purchase.totalItems.toLocaleString(intlLocale)}
                    </td>
                    <td className="px-4 py-3 text-[var(--foreground)]">
                      {formatDate(purchase.createdAt, intlLocale)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-3">
                        <span
                          className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-medium ${fullyReceived ? 'bg-emerald-500/15 text-emerald-400' : 'bg-amber-500/15 text-amber-500'}`}
                        >
                          <span
                            className={`size-2 rounded-full ${fullyReceived ? 'bg-emerald-400' : 'bg-amber-500'}`}
                            aria-hidden
                          />
                          {statusLabel}
                        </span>
                        <Link
                          href={`/${typedLocale}/purchases/${purchase.id}`}
                          className="inline-flex items-center gap-1 text-xs font-medium text-[var(--accent)] transition hover:text-[var(--accent-hover)]"
                        >
                          <span>{t('viewDetails')}</span>
                          <ArrowRight className="size-3.5" aria-hidden />
                        </Link>
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
            href={`/${typedLocale}/purchases/new`}
            className="mt-4 inline-flex items-center gap-2 rounded-full border border-transparent bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-[var(--accent-foreground)] transition hover:bg-[var(--accent-hover)] shadow-[0_8px_20px_var(--shadow-color)]"
          >
            <PackageSearch className="size-4" aria-hidden />
            <span>{t('submit')}</span>
          </Link>
        </div>
      )}
    </section>
  );
}
