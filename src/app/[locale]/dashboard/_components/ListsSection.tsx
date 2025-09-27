import { getTranslations } from 'next-intl/server';

import ItemListPanel from '@/components/dashboard/ItemListPanel';
import { Badge } from '@/components/ui/badge';

import type { AppLocale } from '../../../../../i18n/routing';
import {
  getAgingBuckets,
  getAgingWatchlist,
  getStaleListed,
} from '../../../../../lib/analytics';
import { getBusinessRulesSettings } from '../../../../../lib/settings';
import { getNumberFormatter } from '../utils';

interface ListsSectionProps {
  locale: AppLocale;
}

export default async function ListsSection({ locale }: ListsSectionProps) {
  const t = await getTranslations({ locale, namespace: 'dashboard' });
  const numberFormatter = getNumberFormatter(locale);

  const businessRules = await getBusinessRulesSettings();
  const [agingBuckets, agingWatchlist, staleWarning, staleCritical] = await Promise.all([
    getAgingBuckets(),
    getAgingWatchlist(),
    getStaleListed({ days: businessRules.staleListingThresholds.warning }),
    getStaleListed({ days: businessRules.staleListingThresholds.critical }),
  ]);

  const agingWarningThreshold = agingWatchlist.thresholds.warning;
  const agingCriticalThreshold = agingWatchlist.thresholds.critical;

  const agingOverWarningCount = agingBuckets
    .filter((bucket) => bucket.minDays > agingWarningThreshold)
    .reduce((sum, bucket) => sum + bucket.count, 0);
  const agingOverCriticalCount = agingBuckets
    .filter((bucket) => bucket.minDays > agingCriticalThreshold)
    .reduce((sum, bucket) => sum + bucket.count, 0);

  const staleWarningThreshold = businessRules.staleListingThresholds.warning;
  const staleCriticalThreshold = businessRules.staleListingThresholds.critical;
  const staleOverWarningCount = staleWarning.length;
  const staleOverCriticalCount = staleCritical.length;

  const agingItems = agingWatchlist.warning.map((item) => ({
    id: item.id,
    productName: item.productName,
    serial: item.serial,
    ageDays: item.daysInStock,
    costToman: item.costToman,
    listedPriceToman: item.listedPriceToman,
  }));

  const staleItems = staleWarning.map((item) => ({
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
          warningCount: numberFormatter.format(agingOverWarningCount),
          warningDays: numberFormatter.format(agingWarningThreshold),
          criticalCount: numberFormatter.format(agingOverCriticalCount),
          criticalDays: numberFormatter.format(agingCriticalThreshold),
        })}
        emptyLabel={t('lists.aging.empty')}
        items={agingItems}
        headers={listHeaders}
        formatAge={ageFormatter}
        renderBadge={(item) =>
          item.ageDays > agingCriticalThreshold ? (
            <Badge variant="warning">
              {t('lists.aging.badgeCritical', {
                days: numberFormatter.format(agingCriticalThreshold),
              })}
            </Badge>
          ) : null
        }
      />
      <ItemListPanel
        locale={locale}
        title={t('lists.stale.title')}
        description={t('lists.stale.description', {
          warningCount: numberFormatter.format(staleOverWarningCount),
          warningDays: numberFormatter.format(staleWarningThreshold),
          criticalCount: numberFormatter.format(staleOverCriticalCount),
          criticalDays: numberFormatter.format(staleCriticalThreshold),
        })}
        emptyLabel={t('lists.stale.empty')}
        items={staleItems}
        headers={listHeaders}
        formatAge={ageFormatter}
        renderBadge={(item) =>
          item.ageDays > staleCriticalThreshold ? (
            <Badge variant="warning">
              {t('lists.stale.badgeCritical', {
                days: numberFormatter.format(staleCriticalThreshold),
              })}
            </Badge>
          ) : null
        }
      />
    </div>
  );
}
