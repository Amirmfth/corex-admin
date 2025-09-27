import { getLocale, getTranslations } from 'next-intl/server';

import PageHeader from '@/components/PageHeader';
import ReportsDashboard from '@/components/reports/ReportsDashboard';

import {
  ReportChannel,
  ReportFilters,
  SerializedFilters,
  defaultFilters,
  getAvailableFilters,
  getReportsAggregates,
  serializeFilters,
} from '../../../../lib/reporting-data';

export const dynamic = 'force-dynamic';

type ReportsPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function getParam(value: string | string[] | undefined) {
  if (Array.isArray(value)) {
    return value[0];
  }
  return value ?? null;
}

function parseChannels(
  value: string | string[] | undefined,
  available: ReportChannel[],
): ReportChannel[] {
  const raw = Array.isArray(value) ? value : value ? [value] : [];
  const normalized = raw.filter((channel): channel is ReportChannel =>
    available.includes(channel as ReportChannel),
  );
  return normalized.length > 0 ? normalized : available;
}

function parseCategory(value: string | string[] | undefined, categories: string[]) {
  const candidate = getParam(value);
  if (!candidate) {
    return null;
  }
  return categories.includes(candidate) ? candidate : null;
}

function parseDate(value: string | null, fallback: Date) {
  if (!value) return fallback;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? fallback : parsed;
}

function buildFilters(
  params: Record<string, string | string[] | undefined>,
  defaults: ReportFilters,
  availableChannels: ReportChannel[],
  categories: string[],
): ReportFilters {
  const start = parseDate(getParam(params.from), defaults.startDate);
  const end = parseDate(getParam(params.to), defaults.endDate);
  const channels = parseChannels(params['channels[]'], availableChannels);
  const category = parseCategory(params.categoryId, categories);

  return {
    startDate: start,
    endDate: end,
    channels,
    category,
  };
}

export default async function ReportsPage({ searchParams }: ReportsPageProps) {
  const locale = await getLocale();
  const t = await getTranslations({ locale, namespace: 'reportsDashboard' });
  const resolvedParams = await searchParams;

  const defaults = defaultFilters();
  const { channels, categories } = getAvailableFilters();
  const filters = buildFilters(resolvedParams, defaults, channels, categories);
  const aggregates = getReportsAggregates(filters);
  const serialized: SerializedFilters = serializeFilters(filters);
  const serializedDefaults: SerializedFilters = serializeFilters(defaults);

  return (
    <div className="space-y-6">
      <PageHeader title={t('title')} description={t('subtitle')} />
      <ReportsDashboard
        data={aggregates}
        filters={serialized}
        defaultFilters={serializedDefaults}
        channels={channels}
        categories={categories}
      />
    </div>
  );
}
