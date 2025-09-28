import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';

import { routing, type AppLocale } from '../../../../../i18n/routing';
import { getPurchaseDetail } from '../../../../../lib/purchases';
import PageHeader from '../../../../components/PageHeader';
import DeletePurchaseButton from '../../../../components/purchases/DeletePurchaseButton';
import PurchaseReceivePanel from '../../../../components/purchases/PurchaseReceivePanel';

export const dynamic = 'force-dynamic';

type PurchaseDetailPageProps = {
  params: Promise<{ locale: string; id: string }>;
};

function isReceived(purchase: Awaited<ReturnType<typeof getPurchaseDetail>>) {
  if (!purchase) {
    return false;
  }

  return purchase.lines.every((line) => line.createdItemIds.length >= line.quantity);
}

export default async function PurchaseDetailPage({ params }: PurchaseDetailPageProps) {
  const { locale, id } = await params;

  if (!(routing.locales as readonly string[]).includes(locale)) {
    notFound();
  }

  const typedLocale = locale as AppLocale;

  const [purchase, t] = await Promise.all([
    getPurchaseDetail(id),
    getTranslations({ locale: typedLocale, namespace: 'purchases' }),
  ]);

  if (!purchase) {
    notFound();
  }

  const received = isReceived(purchase);

  return (
    <section className="flex flex-col gap-6">
      <PageHeader
        title={t('detailTitle')}
        description={received ? t('detailReceivedSubtitle') : t('detailPendingSubtitle')}
        actions={
          <div className="flex flex-wrap items-center gap-3">
            <Link
              href={`/${typedLocale}/items`}
              className="inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--surface)] px-4 py-2 text-sm font-medium text-[var(--muted-strong)] transition hover:border-[var(--accent)] hover:text-[var(--foreground)]"
            >
              {t('itemsLink')}
            </Link>
            <DeletePurchaseButton purchaseId={purchase.id} locale={typedLocale} />
          </div>
        }
      />

      <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        <div className="space-y-6">
          <div className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-[var(--foreground)]">{t('summaryTitle')}</h2>
            <dl className="mt-4 grid gap-4 text-sm text-[var(--muted)] sm:grid-cols-2">
              <div className="flex flex-col gap-1">
                <dt className="text-xs uppercase text-[var(--muted)]">{t('supplierLabel')}</dt>
                <dd className="font-medium text-[var(--foreground)]">{purchase.supplierName}</dd>
              </div>
              <div className="flex flex-col gap-1">
                <dt className="text-xs uppercase text-[var(--muted)]">{t('referenceLabel')}</dt>
                <dd className="font-medium text-[var(--foreground)]">
                  {purchase.reference ?? t('emptyReference')}
                </dd>
              </div>
              <div className="flex flex-col gap-1">
                <dt className="text-xs uppercase text-[var(--muted)]">{t('statusLabel')}</dt>
                <dd className={`font-semibold ${received ? 'text-emerald-600' : 'text-amber-600'}`}>
                  {received ? t('statusReceived') : t('statusPending')}
                </dd>
              </div>
              <div className="flex flex-col gap-1">
                <dt className="text-xs uppercase text-[var(--muted)]">{t('totalLabel')}</dt>
                <dd className="font-semibold text-[var(--foreground)]">
                  {purchase.totalToman.toLocaleString()}
                </dd>
              </div>
            </dl>
          </div>

          <div className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-sm">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-lg font-semibold text-[var(--foreground)]">{t('linesTitle')}</h2>
              <span className="text-xs text-[var(--muted)]">{t('feesHint')}</span>
            </div>
            <div className="mt-4 overflow-x-auto">
              <table className="min-w-full divide-y divide-[var(--border)] text-sm">
                <thead className="bg-[var(--surface-muted)] text-xs uppercase text-[var(--muted)]">
                  <tr>
                    <th className="px-4 py-2 text-left font-medium">{t('productLabel')}</th>
                    <th className="px-4 py-2 text-left font-medium">{t('quantityLabel')}</th>
                    <th className="px-4 py-2 text-left font-medium">{t('unitLabel')}</th>
                    <th className="px-4 py-2 text-left font-medium">{t('feesLabel')}</th>
                    <th className="px-4 py-2 text-left font-medium">{t('createdLabel')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border)]">
                  {purchase.lines.map((line) => (
                    <tr key={line.id}>
                      <td className="px-4 py-3 text-[var(--foreground)]">
                        <div className="flex flex-col">
                          <span className="font-medium">{line.product.name}</span>
                          <span className="text-xs text-[var(--muted)]">
                            {[line.product.brand, line.product.model].filter(Boolean).join(' Â· ')}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-[var(--foreground)]">{line.quantity}</td>
                      <td className="px-4 py-3 text-[var(--foreground)]">
                        {line.unitToman.toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-[var(--foreground)]">
                        {line.feesToman.toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-[var(--foreground)]">
                        {line.createdItemIds.length}/{line.quantity}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <PurchaseReceivePanel purchaseId={purchase.id} alreadyReceived={received} />
      </div>
    </section>
  );
}
