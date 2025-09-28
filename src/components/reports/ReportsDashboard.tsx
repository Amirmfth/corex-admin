'use client';

import { useRouter } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { useCallback, useMemo } from 'react';

import { formatToman } from '../../../lib/money';
import {
  AgingBucketEntry,
  CategoryInventoryEntry,
  InventoryByStatusEntry,
  ListingFunnelEntry,
  MonthlyFinancial,
  PriceMarginPoint,
  ProductProfitEntry,
  ReportChannel,
  ReportsAggregates,
  SerializedFilters,
} from '../../../lib/reporting-data';

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  CurrencyTooltip,
  CurrencyYAxis,
  DateXAxis,
  LabelList,
  Legend,
  Line,
  LineChart,
  PercentTooltip,
  PercentYAxis,
  Pie,
  PieChart,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
} from './ChartWrappers';
import DataTable, { ColumnDef } from './DataTable';
import FilterBar, { FilterState } from './FilterBar';

const STATUS_COLORS: Record<string, string> = {
  IN_STOCK: '#3b82f6',
  LISTED: '#22c55e',
  RESERVED: '#f97316',
  REPAIR: '#a855f7',
};

const PIE_COLORS = ['#2563eb', '#14b8a6', '#f59e0b', '#ef4444', '#8b5cf6'];

type ReportsDashboardProps = {
  data: ReportsAggregates;
  filters: SerializedFilters;
  defaultFilters: SerializedFilters;
  channels: ReportChannel[];
  categories: string[];
};

function buildFilterState(filters: SerializedFilters): FilterState {
  return {
    from: filters.from,
    to: filters.to,
    channels: filters.channels,
    categoryId: filters.categoryId,
  };
}

function formatDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

function getMonthRange(month: string) {
  const [yearString, monthString] = month.split('-');
  const year = Number.parseInt(yearString ?? '', 10);
  const monthIndex = Number.parseInt(monthString ?? '', 10) - 1;

  if (!Number.isFinite(year) || !Number.isFinite(monthIndex) || monthIndex < 0 || monthIndex > 11) {
    return null;
  }

  const start = new Date(Date.UTC(year, monthIndex, 1));
  const end = new Date(Date.UTC(year, monthIndex + 1, 0));

  return {
    from: formatDate(start),
    to: formatDate(end),
  };
}

function toCsv(rows: string[][]) {
  return rows
    .map((row) =>
      row
        .map((cell) => {
          if (cell == null) return '';
          const value = String(cell);
          if (/[,"\n]/.test(value)) {
            return `"${value.replace(/"/g, '""')}"`;
          }
          return value;
        })
        .join(','),
    )
    .join('\n');
}

function downloadCsv(filename: string, rows: string[][]) {
  const csv = toCsv(rows);
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function formatCurrency(locale: 'fa-IR' | 'en-US', value: number) {
  return formatToman(Math.round(value), locale);
}

function formatPercent(locale: string, value: number) {
  return new Intl.NumberFormat(locale, {
    style: 'percent',
    maximumFractionDigits: 1,
  }).format(value);
}

export default function ReportsDashboard({
  data,
  filters,
  defaultFilters,
  channels,
  categories,
}: ReportsDashboardProps) {
  const locale = useLocale();
  const router = useRouter();
  const t = useTranslations('reportsDashboard');
  const tSections = useTranslations('reportsDashboard.sections');
  const tCharts = useTranslations('reportsDashboard.charts');
  const tTables = useTranslations('reportsDashboard.tables');
  const tFilters = useTranslations('reportsDashboard.filters');
  const intlLocale = locale === 'fa' ? 'fa-IR' : 'en-US';
  const minimumMarginPercent = data.meta.minimumMarginPercent;
  const minimumMarginLabel = useMemo(
    () =>
      new Intl.NumberFormat(intlLocale, {
        maximumFractionDigits: 1,
      }).format(minimumMarginPercent),
    [intlLocale, minimumMarginPercent],
  );
  const renderMarginPoint = useCallback(
    (props: any) => {
      const { cx, cy, payload } = props;
      const point = payload as PriceMarginPoint;
      const fill = point.isBelowMinimumMargin ? '#f97316' : '#0ea5e9';
      return <circle cx={cx} cy={cy} r={5} fill={fill} stroke="var(--surface)" strokeWidth={1.5} />;
    },
    [],
  );

  const channelPieData = useMemo(
    () =>
      data.channelMix.map((entry, index) => ({
        name: entry.channel,
        value: entry.revenue,
        percentage: entry.percentage,
        color: PIE_COLORS[index % PIE_COLORS.length],
      })),
    [data.channelMix],
  );

  const inventoryStatusKeys = Object.keys(STATUS_COLORS) as (keyof typeof STATUS_COLORS)[];

  const productColumns: ColumnDef<ProductProfitEntry>[] = useMemo(
    () => [
      {
        id: 'product',
        header: tTables('product'),
        cell: (row) => (
          <div className="flex flex-col">
            <span className="font-semibold text-[var(--foreground)]">{row.productName}</span>
            <span className="text-xs text-[var(--muted)]">{row.productId}</span>
          </div>
        ),
      },
      {
        id: 'category',
        header: tTables('category'),
        accessorKey: 'category',
      },
      {
        id: 'channels',
        header: tTables('channels'),
        cell: (row) => row.channels.join(', '),
      },
      {
        id: 'revenue',
        header: tTables('revenue'),
        cell: (row) => formatCurrency(intlLocale, row.revenue),
        enableSorting: true,
        sortingFn: (a, b) => a.revenue - b.revenue,
        meta: { align: 'right' },
      },
      {
        id: 'cost',
        header: tTables('cost'),
        cell: (row) => formatCurrency(intlLocale, row.cost),
        enableSorting: true,
        sortingFn: (a, b) => a.cost - b.cost,
        meta: { align: 'right' },
      },
      {
        id: 'profit',
        header: tTables('profit'),
        cell: (row) => formatCurrency(intlLocale, row.profit),
        enableSorting: true,
        sortingFn: (a, b) => a.profit - b.profit,
        meta: { align: 'right' },
      },
    ],
    [intlLocale, tTables],
  );

  const handleProductClick = useCallback(
    (row: ProductProfitEntry) => {
      router.push(`/products/${row.productId}`);
    },
    [router],
  );

  const handleMonthClick = useCallback(
    (entry: MonthlyFinancial) => {
      const range = getMonthRange(entry.month);
      if (!range) {
        return;
      }
      const params = new URLSearchParams();
      params.set('status', 'SOLD');
      params.set('from', range.from);
      params.set('to', range.to);
      filters.channels.forEach((channel) => params.append('channels[]', channel));
      if (filters.categoryId) {
        params.set('categoryId', filters.categoryId);
      }
      router.push(`/items?${params.toString()}`);
    },
    [filters.categoryId, filters.channels, router],
  );

  const handleCategoryClick = useCallback(
    (entry: CategoryInventoryEntry) => {
      const params = new URLSearchParams();
      params.set('categoryId', entry.category);
      router.push(`/products?${params.toString()}`);
    },
    [router],
  );

  const handleAgingBarClick = useCallback(
    (entry: AgingBucketEntry) => {
      const params = new URLSearchParams();
      params.set('status', 'IN_STOCK,LISTED,RESERVED');
      params.set('ageBin', entry.label);
      router.push(`/items?${params.toString()}`);
    },
    [router],
  );

  const handleScatterClick = useCallback(
    (point: PriceMarginPoint) => {
      router.push(`/items/${point.itemId}`);
    },
    [router],
  );

  const handleExportCurrent = useCallback(() => {
    const rows: string[][] = [];
    rows.push([tSections('composition'), tCharts('channelMix')]);
    rows.push([tTables('channel'), tTables('revenue'), tTables('share')]);
    data.channelMix.forEach((entry) => {
      rows.push([
        entry.channel,
        formatCurrency(intlLocale, entry.revenue),
        `${entry.percentage.toFixed(1)}%`,
      ]);
    });
    rows.push([]);
    rows.push([tSections('performance'), tCharts('topProducts')]);
    rows.push([
      tTables('product'),
      tTables('category'),
      tTables('channels'),
      tTables('revenue'),
      tTables('cost'),
      tTables('profit'),
    ]);
    data.topProducts.forEach((product) => {
      rows.push([
        `${product.productName} (${product.productId})`,
        product.category,
        product.channels.join(', '),
        formatCurrency(intlLocale, product.revenue),
        formatCurrency(intlLocale, product.cost),
        formatCurrency(intlLocale, product.profit),
      ]);
    });
    downloadCsv('reports-current.csv', rows);
  }, [data.channelMix, data.topProducts, intlLocale, tCharts, tSections, tTables]);

  const handleExportAll = useCallback(async () => {
    const params = new URLSearchParams();
    params.set('from', filters.from);
    params.set('to', filters.to);
    filters.channels.forEach((channel) => params.append('channels[]', channel));
    if (filters.categoryId) {
      params.set('categoryId', filters.categoryId);
    }
    const response = await fetch(`/api/reports/export?${params.toString()}`);
    if (!response.ok) {
      return;
    }
    const payload = await response.json();
    const exportData = payload.aggregates as ReportsAggregates;
    const rows: string[][] = [];
    rows.push([t('title'), tFilters('dateRange'), `${filters.from} - ${filters.to}`]);
    rows.push([]);
    rows.push([tSections('financial'), tCharts('profitByMonth')]);
    rows.push([tCharts('month'), tTables('revenue'), tTables('cost'), tTables('profit')]);
    exportData.monthly.forEach((entry: ReportsAggregates['monthly'][number]) => {
      rows.push([
        entry.month,
        entry.revenue.toString(),
        entry.cost.toString(),
        entry.profit.toString(),
      ]);
    });
    rows.push([]);
    rows.push([tSections('performance'), tCharts('topProducts')]);
    rows.push([
      tTables('product'),
      tTables('category'),
      tTables('channels'),
      tTables('revenue'),
      tTables('cost'),
      tTables('profit'),
    ]);
    exportData.topProducts.forEach((product: ProductProfitEntry) => {
      rows.push([
        `${product.productName} (${product.productId})`,
        product.category,
        product.channels.join(', '),
        product.revenue.toString(),
        product.cost.toString(),
        product.profit.toString(),
      ]);
    });
    downloadCsv('reports-full.csv', rows);
  }, [filters, t, tCharts, tFilters, tSections, tTables]);

  const filterState = useMemo(() => buildFilterState(filters), [filters]);
  const defaultFilterState = useMemo(() => buildFilterState(defaultFilters), [defaultFilters]);

  const listingLookup = useMemo(() => {
    const map = new Map<ListingFunnelEntry['stage'], number>();
    data.listingFunnel.forEach((entry) => map.set(entry.stage, entry.count));
    return map;
  }, [data.listingFunnel]);

  const inStockCount = listingLookup.get('IN_STOCK') ?? 0;
  const listedCount = listingLookup.get('LISTED') ?? 0;
  const soldCount = listingLookup.get('SOLD') ?? 0;

  const listedRate = inStockCount > 0 ? listedCount / inStockCount : 0;
  const soldRate = listedCount > 0 ? soldCount / listedCount : 0;

  return (
    <div className="space-y-6">
      <FilterBar
        channels={channels}
        categories={categories}
        initialFilters={filterState}
        defaultFilters={defaultFilterState}
        onExportCurrent={handleExportCurrent}
        onExportAll={handleExportAll}
      />

      <section className="space-y-4">
        <header>
          <h2 className="text-lg font-semibold text-[var(--foreground)]">
            {tSections('financial')}
          </h2>
          <p className="text-sm text-[var(--muted)]">{t('financialDescription')}</p>
        </header>
        <div className="grid gap-4 lg:grid-cols-3">
          <div className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-sm">
            <h3 className="text-sm font-semibold text-[var(--muted-strong)]">
              {tCharts('profitByMonth')}
            </h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.monthly}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <DateXAxis dataKey="month" variant="month" />
                  <CurrencyYAxis />
                  <CurrencyTooltip variant="month" />
                  <Bar
                    dataKey="profit"
                    radius={[12, 12, 0, 0]}
                    fill="#22c55e"
                    cursor="pointer"
                    onClick={(event) => {
                      const payload = (event as { payload?: unknown })?.payload;
                      if (!payload) return;
                      handleMonthClick(payload as MonthlyFinancial);
                    }}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-sm">
            <h3 className="text-sm font-semibold text-[var(--muted-strong)]">
              {tCharts('revenueCostProfit')}
            </h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.monthly}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <DateXAxis dataKey="month" variant="month" />
                  <CurrencyYAxis />
                  <CurrencyTooltip variant="month" />
                  <Legend />
                  <Bar dataKey="revenue" fill="#2563eb" radius={[10, 10, 0, 0]} />
                  <Bar dataKey="cost" fill="#f97316" radius={[10, 10, 0, 0]} />
                  <Bar dataKey="profit" fill="#22c55e" radius={[10, 10, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-sm">
            <h3 className="text-sm font-semibold text-[var(--muted-strong)]">
              {tCharts('rollingAverages')}
            </h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data.rolling}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <DateXAxis dataKey="date" />
                  <CurrencyYAxis />
                  <CurrencyTooltip />
                  <Legend />
                  <Line type="monotone" dataKey="rolling30" stroke="#2563eb" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="rolling60" stroke="#ef4444" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <header>
          <h2 className="text-lg font-semibold text-[var(--foreground)]">
            {tSections('composition')}
          </h2>
          <p className="text-sm text-[var(--muted)]">{t('compositionDescription')}</p>
        </header>
        <div className="grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
          <div className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-sm">
            <h3 className="text-sm font-semibold text-[var(--muted-strong)]">
              {tCharts('channelMix')}
            </h3>
            <div className="mt-2 flex items-center gap-4">
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={channelPieData} dataKey="value" nameKey="name" innerRadius={60} outerRadius={110}>
                      {channelPieData.map((entry) => (
                        <Cell key={entry.name} fill={entry.color} stroke="var(--surface)" />
                      ))}
                      <LabelList
                        dataKey="percentage"
                        position="outside"
                        formatter={(value: unknown) => {
                          const numeric =
                            typeof value === 'number' ? value : Number(value);
                          if (Number.isFinite(numeric)) {
                            return `${numeric.toFixed(1)}%`;
                          }
                          return value == null ? '' : String(value);
                        }}
                      />
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
            <div className="mt-4 rounded-2xl border border-[var(--border)] p-3 text-sm">
              <div className="grid grid-cols-3 gap-2 text-xs font-semibold uppercase text-[var(--muted)]">
                <span>{tTables('channel')}</span>
                <span>{tTables('share')}</span>
                <span className="text-right">{tTables('revenue')}</span>
              </div>
              <div className="mt-2 space-y-1 text-sm">
                {data.channelMix.map((entry) => (
                  <div key={entry.channel} className="grid grid-cols-3 items-center gap-2">
                    <span>{entry.channel}</span>
                    <span>{entry.percentage.toFixed(1)}%</span>
                    <span className="text-right">{formatCurrency(intlLocale, entry.revenue)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-sm">
              <h3 className="text-sm font-semibold text-[var(--muted-strong)]">
                {tCharts('inventoryStatus')}
              </h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.inventoryByStatus}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                    <XAxis dataKey="channel" />
                    <CurrencyYAxis />
                    <CurrencyTooltip />
                    <Legend />
                    {inventoryStatusKeys.map((status) => (
                      <Bar
                        key={status}
                        dataKey={(entry) => {
                          const typedEntry = entry as InventoryByStatusEntry | undefined;
                          const statuses = typedEntry?.statuses as Record<string, unknown> | undefined;
                          const value = statuses?.[status];
                          if (typeof value === 'number') {
                            return value;
                          }
                          const numeric = Number(value);
                          return Number.isFinite(numeric) ? numeric : 0;
                        }}
                        stackId="1"
                        fill={STATUS_COLORS[status]}
                        name={t(`status.${status}`)}
                      />
                    ))}
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-sm">
              <h3 className="text-sm font-semibold text-[var(--muted-strong)]">
                {tCharts('topCategories')}
              </h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.topCategories}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                    <XAxis dataKey="category" />
                    <CurrencyYAxis />
                    <CurrencyTooltip />
                    <Bar
                      dataKey="value"
                      fill="#8b5cf6"
                      radius={[12, 12, 0, 0]}
                      cursor="pointer"
                      onClick={(event) => {
                        const payload = (event as { payload?: unknown })?.payload;
                        if (!payload) return;
                        handleCategoryClick(payload as CategoryInventoryEntry);
                      }}
                    >
                      <LabelList
                        dataKey="value"
                        position="top"
                        formatter={(value: unknown) => {
                          const numericValue = typeof value === 'number' ? value : Number(value);
                          return formatCurrency(intlLocale, Number.isFinite(numericValue) ? numericValue : 0);
                        }}
                      />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <header>
          <h2 className="text-lg font-semibold text-[var(--foreground)]">
            {tSections('performance')}
          </h2>
          <p className="text-sm text-[var(--muted)]">{t('performanceDescription')}</p>
        </header>
        <div className="grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
          <div className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-sm">
            <h3 className="text-sm font-semibold text-[var(--muted-strong)]">
              {tCharts('topProducts')}
            </h3>
            <DataTable
              data={data.topProducts}
              columns={productColumns}
              pageSize={5}
              onRowClick={handleProductClick}
              emptyMessage={tTables('noProducts')}
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-sm">
              <h3 className="text-sm font-semibold text-[var(--muted-strong)]">
                {tCharts('sellThrough')}
              </h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.sellThrough}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                    <XAxis dataKey="category" />
                    <PercentYAxis />
                    <PercentTooltip />
                    <Bar dataKey="rate" fill="#2563eb" radius={[12, 12, 0, 0]}>
                      <LabelList
                        dataKey="rate"
                        position="top"
                        formatter={(value: unknown) => {
                          const numericValue = typeof value === 'number' ? value : Number(value);
                          return formatPercent(locale, Number.isFinite(numericValue) ? numericValue : 0);
                        }}
                      />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="flex flex-col gap-3 rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-sm">
              <h3 className="text-sm font-semibold text-[var(--muted-strong)]">
                {tCharts('listingFunnel')}
              </h3>
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-2xl bg-[var(--surface-muted)] p-3">
                  <p className="text-xs uppercase text-[var(--muted)]">{t('funnel.inStock')}</p>
                  <p className="text-2xl font-semibold text-[var(--foreground)]">{inStockCount}</p>
                </div>
                <div className="rounded-2xl bg-[var(--surface-muted)] p-3">
                  <p className="text-xs uppercase text-[var(--muted)]">{t('funnel.listed')}</p>
                  <p className="text-2xl font-semibold text-[var(--foreground)]">{listedCount}</p>
                  <p className="text-xs text-[var(--muted)]">{formatPercent(locale, listedRate)}</p>
                </div>
                <div className="rounded-2xl bg-[var(--surface-muted)] p-3">
                  <p className="text-xs uppercase text-[var(--muted)]">{t('funnel.sold')}</p>
                  <p className="text-2xl font-semibold text-[var(--foreground)]">{soldCount}</p>
                  <p className="text-xs text-[var(--muted)]">{formatPercent(locale, soldRate)}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <header>
          <h2 className="text-lg font-semibold text-[var(--foreground)]">
            {tSections('riskOpportunity')}
          </h2>
          <p className="text-sm text-[var(--muted)]">{t('riskDescription')}</p>
        </header>
        <div className="grid gap-4 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
          <div className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-sm">
            <h3 className="text-sm font-semibold text-[var(--muted-strong)]">
              {tCharts('agingHistogram')}
            </h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.aging}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="label" />
                  <CurrencyYAxis />
                  <CurrencyTooltip />
                  <Bar
                    dataKey="totalValue"
                    fill="#0ea5e9"
                    radius={[12, 12, 0, 0]}
                    cursor="pointer"
                    onClick={(event) => {
                      const payload = (event as { payload?: unknown })?.payload;
                      if (!payload) return;
                      handleAgingBarClick(payload as AgingBucketEntry);
                    }}
                  >
                    <LabelList dataKey="count" position="top" />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-1">
            <div className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-sm">
              <h3 className="text-sm font-semibold text-[var(--muted-strong)]">
                {tCharts('repairRoi')}
              </h3>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl bg-[var(--surface-muted)] p-3">
                  <p className="text-xs uppercase text-[var(--muted)]">{t('repair.refurbished')}</p>
                  <p className="text-lg font-semibold text-[var(--foreground)]">
                    {formatCurrency(intlLocale, data.repair.refurbished.profit)}
                  </p>
                  <p className="text-xs text-[var(--muted)]">
                    {formatPercent(locale, data.repair.refurbished.margin)}
                  </p>
                </div>
                <div className="rounded-2xl bg-[var(--surface-muted)] p-3">
                  <p className="text-xs uppercase text-[var(--muted)]">{t('repair.standard')}</p>
                  <p className="text-lg font-semibold text-[var(--foreground)]">
                    {formatCurrency(intlLocale, data.repair.nonRefurbished.profit)}
                  </p>
                  <p className="text-xs text-[var(--muted)]">
                    {formatPercent(locale, data.repair.nonRefurbished.margin)}
                  </p>
                </div>
              </div>
              <div className="mt-4 h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={[
                      {
                        label: t('repair.refurbished'),
                        margin: data.repair.refurbished.margin,
                      },
                      {
                        label: t('repair.standard'),
                        margin: data.repair.nonRefurbished.margin,
                      },
                    ]}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                    <XAxis dataKey="label" />
                    <PercentYAxis />
                    <PercentTooltip />
                    <Bar dataKey="margin" fill="#22c55e" radius={[12, 12, 0, 0]}>
                      <LabelList
                        dataKey="margin"
                        position="top"
                        formatter={(value: unknown) => {
                          const numericValue = typeof value === 'number' ? value : Number(value);
                          return formatPercent(locale, Number.isFinite(numericValue) ? numericValue : 0);
                        }}
                      />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-sm">
              <h3 className="text-sm font-semibold text-[var(--muted-strong)]">
                {tCharts('priceVsMargin')}
              </h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <ScatterChart>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                    <XAxis
                      type="number"
                      dataKey="price"
                      tickFormatter={(value: unknown) => {
                        const numeric = typeof value === 'number' ? value : Number(value);
                        if (Number.isFinite(numeric)) {
                          return formatCurrency(intlLocale, numeric);
                        }
                        return value == null ? '' : String(value);
                      }}
                    />
                    <PercentYAxis type="number" dataKey="margin" />
                    <Tooltip
                      formatter={(rawValue: unknown, name, payload) => {
                        const numericValue = typeof rawValue === 'number' ? rawValue : Number(rawValue);
                        if (name === 'margin') {
                          return [formatPercent(locale, Number.isFinite(numericValue) ? numericValue : 0), tTables('margin')];
                        }
                        if (name === 'price') {
                          return [
                            formatCurrency(intlLocale, Number.isFinite(numericValue) ? numericValue : 0),
                            tTables('price'),
                          ];
                        }
                        const pointRecord = (payload as { payload?: unknown } | undefined)?.payload;
                        const point = (pointRecord ?? {}) as Partial<PriceMarginPoint>;
                        const profit = typeof point.profit === 'number' ? point.profit : Number(point.profit ?? 0);
                        return [formatCurrency(intlLocale, Number.isFinite(profit) ? profit : 0), tTables('profit')];
                      }}
                      labelFormatter={(_, payload) => {
                        if (!Array.isArray(payload) || payload.length === 0) return '';
                        const [first] = payload;
                        const point = (first?.payload ?? {}) as Partial<PriceMarginPoint>;
                        const name = point.productName ?? '';
                        const itemId = point.itemId ?? '';
                        if (!name && !itemId) {
                          return '';
                        }
                        if (!name) {
                          return itemId;
                        }
                        if (!itemId) {
                          return name;
                        }
                        return `${name} • ${itemId}`;
                      }}
                    />
                    <Scatter
                      data={data.priceVsMargin}
                      shape={renderMarginPoint}
                      onClick={(event) => {
                        const payload = (event as { payload?: unknown })?.payload;
                        if (!payload) return;
                        handleScatterClick(payload as PriceMarginPoint);
                      }}
                    />
                  </ScatterChart>
                </ResponsiveContainer>
              </div>
              <p className="mt-2 text-xs text-[var(--muted)]">
                {tCharts('priceVsMarginThreshold', { value: minimumMarginLabel })}
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
