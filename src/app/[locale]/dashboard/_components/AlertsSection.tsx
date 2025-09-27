import { getTranslations } from 'next-intl/server';

import ItemQuickEditDialog from '@/components/items/ItemQuickEditDialog';
import StatusBadge from '@/components/StatusBadge';

import { Link, type AppLocale } from '../../../../../i18n/routing';
import { getAlertsSummary } from '../../../../../lib/alerts';
import { getNumberFormatter } from '../utils';

type AlertsSectionProps = {
  locale: AppLocale;
};

export default async function AlertsSection({ locale }: AlertsSectionProps) {
  const [t, summary] = await Promise.all([
    getTranslations({ locale, namespace: 'dashboard.alerts' }),
    getAlertsSummary({ limit: 5 }),
  ]);

  const numberFormatter = getNumberFormatter(locale);
  const percentFormatter = new Intl.NumberFormat(locale === 'fa' ? 'fa-IR' : 'en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 1,
  });
  const isRTL = locale === 'fa';

  const sections = [
    {
      key: 'aging' as const,
      title: t('aging.title'),
      countLabel: t('aging.count', {
        count: numberFormatter.format(summary.aging.count),
        threshold: numberFormatter.format(summary.aging.thresholdDays),
      }),
      emptyLabel: t('aging.empty'),
      items: summary.aging.items.map((item) => ({
        id: item.id,
        productName: item.productName,
        serial: item.serial,
        status: item.status,
        metricLabel: t('aging.item', {
          days: numberFormatter.format(item.daysInStock),
        }),
        listedPriceToman: item.listedPriceToman,
        listedChannel: item.listedChannel,
        saleChannel: item.saleChannel,
        soldPriceToman: item.soldPriceToman,
      })),
    },
    {
      key: 'stale' as const,
      title: t('stale.title'),
      countLabel: t('stale.count', {
        count: numberFormatter.format(summary.stale.count),
        threshold: numberFormatter.format(summary.stale.thresholdDays),
      }),
      emptyLabel: t('stale.empty'),
      items: summary.stale.items.map((item) => ({
        id: item.id,
        productName: item.productName,
        serial: item.serial,
        status: item.status,
        metricLabel: t('stale.item', {
          days: numberFormatter.format(item.daysListed),
        }),
        listedPriceToman: item.listedPriceToman,
        listedChannel: item.listedChannel,
        saleChannel: item.saleChannel,
        soldPriceToman: item.soldPriceToman,
      })),
    },
    {
      key: 'margin' as const,
      title: t('margin.title'),
      countLabel: t('margin.count', {
        count: numberFormatter.format(summary.margin.count),
        threshold: percentFormatter.format(summary.margin.thresholdPercent),
      }),
      emptyLabel: t('margin.empty'),
      items: summary.margin.items.map((item) => ({
        id: item.id,
        productName: item.productName,
        serial: item.serial,
        status: item.status,
        metricLabel: t('margin.item', {
          percent: percentFormatter.format(item.marginPercent),
        }),
        listedPriceToman: item.listedPriceToman,
        listedChannel: item.listedChannel,
        saleChannel: item.saleChannel,
        soldPriceToman: item.soldPriceToman,
      })),
    },
  ];

  const totalAlerts = summary.aging.count + summary.stale.count + summary.margin.count;

  return (
    <section className="rounded-2xl border border-[var(--surface-hover)] bg-white/80 p-5 shadow-sm">
      <header className="flex flex-col gap-1">
        <h3 className="text-lg font-semibold text-[var(--foreground)]">{t('title')}</h3>
        <p className="text-sm text-[var(--muted)]">{t('subtitle')}</p>
        {totalAlerts === 0 ? (
          <p className="text-xs text-[var(--muted-strong)]">{t('empty')}</p>
        ) : null}
      </header>

      <div className="mt-5 grid gap-4 lg:grid-cols-3">
        {sections.map((section) => (
          <div
            key={section.key}
            className="flex flex-col gap-4 rounded-2xl border border-[var(--surface-hover)] bg-[var(--surface)]/60 p-4"
          >
            <div className="space-y-1">
              <h4 className="text-base font-semibold text-[var(--foreground)]">{section.title}</h4>
              <p className="text-xs text-[var(--muted-strong)]">{section.countLabel}</p>
            </div>
            <div className="space-y-3">
              {section.items.length === 0 ? (
                <p className="text-sm text-[var(--muted)]">{section.emptyLabel}</p>
              ) : (
                section.items.map((item) => (
                  <div
                    key={item.id}
                    className="flex flex-col gap-2 rounded-xl border border-[var(--surface-hover)] bg-white/80 p-3 shadow-sm"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1">
                        <p className="text-sm font-semibold text-[var(--foreground)]">{item.productName}</p>
                        <p className="text-xs text-[var(--muted)]">{item.serial}</p>
                        <p className="mt-1 text-xs font-medium text-[var(--muted-strong)]">{item.metricLabel}</p>
                      </div>
                      <StatusBadge status={item.status} />
                    </div>
                    <div className={`flex flex-wrap gap-2 ${isRTL ? 'justify-end' : ''}`}>
                      <ItemQuickEditDialog
                        locale={locale}
                        itemId={item.id}
                        productName={item.productName}
                        serial={item.serial}
                        initialStatus={item.status}
                        initialListedPriceToman={item.listedPriceToman}
                        initialListedChannel={item.listedChannel}
                        initialSaleChannel={item.saleChannel}
                        initialSoldPriceToman={item.soldPriceToman}
                        trigger={
                          <button
                            type="button"
                            className="rounded-full border border-transparent bg-[var(--accent)] px-3 py-1 text-xs font-semibold text-[var(--accent-foreground)] transition hover:bg-[var(--accent-hover)]"
                          >
                            {t('actions.adjust')}
                          </button>
                        }
                      />
                      <Link
                        href={`/items/${item.id}`}
                        locale={locale}
                        className="inline-flex items-center rounded-full border border-[var(--border)] px-3 py-1 text-xs font-medium text-[var(--muted-strong)] transition hover:border-[var(--accent)] hover:text-[var(--foreground)]"
                      >
                        {t('actions.open')}
                      </Link>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
