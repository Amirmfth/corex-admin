import { getTranslations } from 'next-intl/server';

import ItemListPanel from '@/components/dashboard/ItemListPanel';
import { Badge } from '@/components/ui/badge';

import type { AppLocale } from '../../../../../i18n/routing';
import {
  getAgingBuckets,
  getAgingWatchlist,
  getStaleListed,
} from '../../../../../lib/analytics';
import { getNumberFormatter } from '../utils';

interface ListsSectionProps {
  locale: AppLocale;
}

export default async function ListsSection({ locale }: ListsSectionProps) {
  const t = await getTranslations({ locale, namespace: 'dashboard' });
  const numberFormatter = getNumberFormatter(locale);

  const [agingBuckets, agingWatchlist, stale30, stale60] = await Promise.all([
    getAgingBuckets(),
    getAgingWatchlist(),
    getStaleListed({ days: 30 }),
    getStaleListed({ days: 60 }),
  ]);

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
    <div className="grid gap-4 lg:grid-cols-2">
      <ItemListPanel
        locale={locale}
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
        locale={locale}
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
  );
}
