import { ItemStatus } from '@prisma/client';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';


import { routing, type AppLocale } from '../../../../../i18n/routing';
import { profit, totalCost } from '../../../../../lib/calc';
import { formatDate } from '../../../../../lib/date';
import { getItemDetail } from '../../../../../lib/items';
import ItemDetailForm from '../../../../components/items/ItemDetailForm';
import ItemImageCarousel from '../../../../components/items/ItemImageCarousel';
import StatusBadge from '../../../../components/StatusBadge';
import Toman from '../../../../components/Toman';






interface ItemDetailPageProps {
  params: Promise<{ locale: string; id: string }>;
}

export const dynamic = 'force-dynamic';

export default async function ItemDetailPage({ params }: ItemDetailPageProps) {
  const { locale, id } = await params;

  if (!(routing.locales as readonly string[]).includes(locale)) {
    notFound();
  }

  const typedLocale = locale as AppLocale;

  const t = await getTranslations({ locale: typedLocale, namespace: 'itemDetail' });

  const item = await getItemDetail(id);

  if (!item) {
    notFound();
  }

  const cost = totalCost({
    purchaseToman: item.purchaseToman,

    feesToman: item.feesToman,

    refurbToman: item.refurbToman,
  });

  const grossProfit = profit({
    purchaseToman: item.purchaseToman,

    feesToman: item.feesToman,

    refurbToman: item.refurbToman,

    soldPriceToman: item.soldPriceToman ?? undefined,
  });

  const intlLocale = typedLocale === 'fa' ? 'fa-IR' : 'en-US';

  return (
    <div className="flex flex-col gap-6">
      <Link
        href={`/${typedLocale}/items`}
        className="inline-flex items-center gap-2 text-sm font-medium text-[var(--muted)] hover:text-[var(--foreground)]"
      >
        {t('back')}
      </Link>

      <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        <div className="space-y-6">
          <div className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-sm">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:gap-8">
              <div className="lg:w-1/2">
                <ItemImageCarousel
                  images={item.images.length > 0 ? item.images : (item.product.imageUrls ?? [])}
                  title={item.product.name}
                />
              </div>

              <div className="flex flex-1 flex-col gap-4">
                <div>
                  <h1 className="text-2xl font-semibold text-[var(--foreground)]">{item.product.name}</h1>

                  <p className="text-sm text-[var(--muted)]">
                    {[item.product.brand, item.product.model].filter(Boolean).join(' - ')}
                  </p>

                  {item.product.category ? (
                    <p className="text-xs text-[var(--muted)]">{item.product.category.name}</p>
                  ) : null}
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <span className="text-xs uppercase text-[var(--muted)]">{t('serial')}</span>

                    <p className="font-medium text-[var(--foreground)]">{item.serial}</p>
                  </div>

                  <div>
                    <span className="text-xs uppercase text-[var(--muted)]">{t('condition')}</span>

                    <p className="font-medium text-[var(--foreground)]">{item.condition}</p>
                  </div>

                  <div>
                    <span className="text-xs uppercase text-[var(--muted)]">{t('status')}</span>

                    <div className="mt-1">
                      <StatusBadge status={item.status} />
                    </div>
                  </div>

                  <div>
                    <span className="text-xs uppercase text-[var(--muted)]">{t('acquired')}</span>

                    <p className="font-medium text-[var(--foreground)]">
                      {formatDate(item.acquiredAt, intlLocale)}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-[var(--foreground)]">{t('costBreakdown')}</h2>

            <dl className="mt-4 grid gap-3 text-sm text-[var(--muted)] sm:grid-cols-2">
              <div className="flex items-center justify-between">
                <dt>{t('purchase')}</dt>

                <dd className="font-medium text-[var(--foreground)]">
                  <Toman value={item.purchaseToman} locale={intlLocale} />
                </dd>
              </div>

              <div className="flex items-center justify-between">
                <dt>{t('fees')}</dt>

                <dd className="font-medium text-[var(--foreground)]">
                  <Toman value={item.feesToman} locale={intlLocale} />
                </dd>
              </div>

              <div className="flex items-center justify-between">
                <dt>{t('refurb')}</dt>

                <dd className="font-medium text-[var(--foreground)]">
                  <Toman value={item.refurbToman} locale={intlLocale} />
                </dd>
              </div>

              <div className="flex items-center justify-between">
                <dt>Total</dt>

                <dd className="font-semibold text-[var(--foreground)]">
                  <Toman value={cost} locale={intlLocale} />
                </dd>
              </div>

              {item.status === ItemStatus.SOLD ? (
                <div className="flex items-center justify-between sm:col-span-2">
                  <dt>{t('profit')}</dt>

                  <dd
                    className={`font-semibold ${grossProfit >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}
                  >
                    <Toman value={grossProfit} locale={intlLocale} showSign />
                  </dd>
                </div>
              ) : null}
            </dl>
          </div>

          <div className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-[var(--foreground)]">{t('movements')}</h2>

            <ul className="mt-4 space-y-3">
              {item.movements.length === 0 ? (
                <li className="text-sm text-[var(--muted)]">{t('emptyMovements')}</li>
              ) : (
                item.movements.map((movement: (typeof item.movements)[number]) => (
                  <li
                    key={movement.id}
                    className="rounded-2xl border border-[var(--border)] bg-[var(--surface-muted)] px-4 py-3"
                  >
                    <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex items-center gap-2 text-sm font-medium text-[var(--foreground)]">
                        <span>{movement.movement}</span>

                        <span className="text-xs text-[var(--muted)]">{movement.qty}</span>
                      </div>

                      <span className="text-xs text-[var(--muted)]">
                        {formatDate(movement.createdAt, intlLocale)}
                      </span>
                    </div>

                    {movement.reference ? (
                      <p className="mt-1 text-xs text-[var(--muted)]">Ref: {movement.reference}</p>
                    ) : null}

                    {movement.notes ? (
                      <p className="mt-1 text-sm text-[var(--muted)]">{movement.notes}</p>
                    ) : null}
                  </li>
                ))
              )}
            </ul>
          </div>
        </div>

        <div className="space-y-6">
          <ItemDetailForm
            itemId={item.id}
            location={item.location ?? ''}
            notes={item.notes ?? ''}
            listedPriceToman={item.listedPriceToman ?? undefined}
            listedChannel={item.listedChannel}
            status={item.status}
            saleChannel={item.saleChannel}
            soldPriceToman={item.soldPriceToman ?? undefined}
          />
        </div>
      </div>
    </div>
  );
}
