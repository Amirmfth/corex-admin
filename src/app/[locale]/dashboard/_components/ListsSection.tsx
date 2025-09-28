import { getTranslations } from 'next-intl/server';

import ItemListPanel from '@/components/dashboard/ItemListPanel';
import { Badge } from '@/components/ui/badge';

import type { AppLocale } from '../../../../../i18n/routing';
import {
  getAgingBuckets,
  getAgingWatchlist,
  getStaleListed,
} from '../../../../../lib/analytics';
import { getBusinessRulesSettings } from '@/lib/app-settings';
import { getNumberFormatter } from '../utils';

interface ListsSectionProps {
  locale: AppLocale;
}

export default async function ListsSection({ locale }: ListsSectionProps) {
  const t = await getTranslations({ locale, namespace: 'dashboard' });
  const numberFormatter = getNumberFormatter(locale);

  const businessRules = await getBusinessRulesSettings();
  const primaryStaleThreshold = businessRules.staleListingThresholdDays;
  const secondaryStaleThreshold = businessRules.staleListingThresholdDays * 2;

  const [agingSummary, agingWatchlist, stalePrimary, staleSecondary] = await Promise.all([
    getAgingBuckets(),
    getAgingWatchlist(),
    getStaleListed({ days: primaryStaleThreshold }),
    getStaleListed({ days: secondaryStaleThreshold }),
  ]);

  const agingWarningCount = agingSummary.buckets
    .filter((bucket) => bucket.minDays > agingWatchlist.warningThreshold)
    .reduce((total, bucket) => total + bucket.count, 0);
  const agingCriticalCount = agingSummary.buckets
    .filter((bucket) => bucket.minDays > agingWatchlist.criticalThreshold)
    .reduce((total, bucket) => total + bucket.count, 0);

  const stalePrimaryCount = stalePrimary.length;
  const staleSecondaryCount = staleSecondary.length;

  const agingItems = agingWatchlist.warning.map((item) => ({
    id: item.id,
    productName: item.productName,
    serial: item.serial,
    ageDays: item.daysInStock,
    costToman: item.costToman,
    listedPriceToman: item.listedPriceToman,
  }));

  const staleItems = stalePrimary.map((item) => ({
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
    <div className="grid gap-4 lg:grid-cols-2">
      <ItemListPanel
        locale={locale}
        title={t('lists.aging.title')}
        description={t('lists.aging.description', {
          warningCount: numberFormatter.format(agingWarningCount),
          warningDays: numberFormatter.format(agingWatchlist.warningThreshold),
          criticalCount: numberFormatter.format(agingCriticalCount),
          criticalDays: numberFormatter.format(agingWatchlist.criticalThreshold),
        })}
        emptyLabel={t('lists.aging.empty')}
        items={agingItems}
        headers={listHeaders}
        formatAge={ageFormatter}
        renderBadge={(item) =>
          item.ageDays > agingWatchlist.criticalThreshold ? (
            <Badge variant="warning">
              {t('lists.aging.criticalBadge', {
                days: numberFormatter.format(agingWatchlist.criticalThreshold),
              })}
            </Badge>
          ) : null
        }
      />
      <ItemListPanel
        locale={locale}
        title={t('lists.stale.title')}
        description={t('lists.stale.description', {
          primaryCount: numberFormatter.format(stalePrimaryCount),
          primaryDays: numberFormatter.format(primaryStaleThreshold),
          secondaryCount: numberFormatter.format(staleSecondaryCount),
          secondaryDays: numberFormatter.format(secondaryStaleThreshold),
        })}
        emptyLabel={t('lists.stale.empty')}
        items={staleItems}
        headers={listHeaders}
        formatAge={ageFormatter}
        renderBadge={(item) =>
          item.ageDays >= secondaryStaleThreshold ? (
            <Badge variant="warning">
              {t('lists.stale.criticalBadge', {
                days: numberFormatter.format(secondaryStaleThreshold),
              })}
            </Badge>
          ) : null
        }
      />
    </div>
  );
}
