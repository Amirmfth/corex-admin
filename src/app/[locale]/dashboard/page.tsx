import { notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { Suspense } from 'react';

import PageHeader from '@/components/PageHeader';
import { Badge } from '@/components/ui/badge';

import type { AppLocale } from '../../../../i18n/routing';
import { getMonthlyPnl } from '../../../../lib/analytics';

import ChartsSection from './_components/ChartsSection';
import KpiSection from './_components/KpiSection';
import ListsSection from './_components/ListsSection';
import {
  ChartsSectionSkeleton,
  KpiSectionSkeleton,
  ListsSectionSkeleton,
} from './_components/Skeletons';
import { ensureLocale } from './utils';

interface DashboardPageProps {
  params: Promise<{ locale: string }>;
}

export const revalidate = 60;

export default async function DashboardPage({ params }: DashboardPageProps) {
  const { locale } = await params;

  if (!ensureLocale(locale)) {
    notFound();
  }

  const typedLocale: AppLocale = locale;
  const t = await getTranslations({ locale: typedLocale, namespace: 'dashboard' });
  const monthlyPnlPromise = getMonthlyPnl({ months: 12 });

  return (
    <section className="flex flex-col gap-6">
      <PageHeader title={t('title')} description={t('subtitle')} />

      <Suspense fallback={<KpiSectionSkeleton />}>
        <KpiSection locale={typedLocale} />
      </Suspense>

      <Suspense
        fallback={<ChartsSectionSkeleton badge={<Badge>{t('charts.profitValue')}</Badge>} />}
      >
        <ChartsSection locale={typedLocale} monthlyPnlPromise={monthlyPnlPromise} />
      </Suspense>

      <Suspense fallback={<ListsSectionSkeleton />}>
        <ListsSection locale={typedLocale} />
      </Suspense>
    </section>
  );
}
