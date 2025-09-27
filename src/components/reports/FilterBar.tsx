'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { useEffect, useMemo, useState } from 'react';

import type { ReportChannel } from '../../../lib/reporting-data';

export type FilterState = {
  from: string;
  to: string;
  channels: ReportChannel[];
  categoryId: string | null;
};

type FilterBarProps = {
  channels: ReportChannel[];
  categories: string[];
  initialFilters: FilterState;
  defaultFilters: FilterState;
  onExportCurrent: () => Promise<void> | void;
  onExportAll: () => Promise<void> | void;
};

function formatRangeLabel(locale: string, from: string, to: string) {
  const formatter = new Intl.DateTimeFormat(locale === 'fa' ? 'fa-IR' : 'en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
  const fromDate = from ? formatter.format(new Date(from)) : '—';
  const toDate = to ? formatter.format(new Date(to)) : '—';
  const arrow = locale === 'fa' ? '←' : '→';
  return `${fromDate} ${arrow} ${toDate}`;
}

export default function FilterBar({
  channels,
  categories,
  initialFilters,
  defaultFilters,
  onExportCurrent,
  onExportAll,
}: FilterBarProps) {
  const locale = useLocale();
  const tFilters = useTranslations('reportsDashboard.filters');
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [from, setFrom] = useState(initialFilters.from);
  const [to, setTo] = useState(initialFilters.to);
  const [selectedChannels, setSelectedChannels] = useState<ReportChannel[]>(initialFilters.channels);
  const [selectedCategoryId, setSelectedCategoryId] = useState(initialFilters.categoryId ?? '');
  const [channelsOpen, setChannelsOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);

  useEffect(() => {
    setFrom(initialFilters.from);
    setTo(initialFilters.to);
    setSelectedChannels(initialFilters.channels);
    setSelectedCategoryId(initialFilters.categoryId ?? '');
  }, [initialFilters]);

  const rangeLabel = useMemo(
    () => formatRangeLabel(locale, from, to),
    [locale, from, to],
  );

  const toggleChannel = (channel: ReportChannel) => {
    setSelectedChannels((current) => {
      if (current.includes(channel)) {
        return current.filter((value) => value !== channel);
      }
      return [...current, channel];
    });
  };

  const allChannelsSelected = selectedChannels.length === channels.length;

  const applyFilters = () => {
    if (!from || !to) return;
    const params = new URLSearchParams(searchParams?.toString());
    params.set('from', from);
    params.set('to', to);
    params.delete('channels[]');
    selectedChannels.forEach((channel) => params.append('channels[]', channel));
    if (selectedCategoryId) {
      params.set('categoryId', selectedCategoryId);
    } else {
      params.delete('categoryId');
    }
    params.delete('page');
    const queryString = params.toString();
    router.push(queryString ? `${pathname}?${queryString}` : pathname, { scroll: false });
    setChannelsOpen(false);
    setExportOpen(false);
  };

  const handleReset = () => {
    setFrom(defaultFilters.from);
    setTo(defaultFilters.to);
    setSelectedChannels(defaultFilters.channels);
    setSelectedCategoryId(defaultFilters.categoryId ?? '');

    const params = new URLSearchParams(searchParams?.toString());
    params.set('from', defaultFilters.from);
    params.set('to', defaultFilters.to);
    params.delete('channels[]');
    defaultFilters.channels.forEach((channel) => params.append('channels[]', channel));
    if (defaultFilters.categoryId) {
      params.set('categoryId', defaultFilters.categoryId);
    } else {
      params.delete('categoryId');
    }
    params.delete('page');
    const queryString = params.toString();
    router.push(queryString ? `${pathname}?${queryString}` : pathname, { scroll: false });
    setChannelsOpen(false);
    setExportOpen(false);
  };

  const handleExportCurrent = async () => {
    await onExportCurrent();
    setExportOpen(false);
  };

  const handleExportAll = async () => {
    await onExportAll();
    setExportOpen(false);
  };

  return (
    <div className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-sm">
      <div className="grid gap-4 md:grid-cols-2">
        <div className="flex flex-col gap-2">
          <label className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
            {tFilters('dateRange')}
          </label>
          <div className="flex items-center gap-2">
            <input
              type="date"
              className="flex-1 rounded-xl border border-[var(--border)] bg-transparent px-3 py-2 text-sm"
              value={from}
              onChange={(event) => setFrom(event.target.value)}
              max={to}
              dir={locale === 'fa' ? 'rtl' : 'ltr'}
            />
            <span className="text-xs text-[var(--muted)]">{tFilters('to')}</span>
            <input
              type="date"
              className="flex-1 rounded-xl border border-[var(--border)] bg-transparent px-3 py-2 text-sm"
              value={to}
              onChange={(event) => setTo(event.target.value)}
              min={from}
              dir={locale === 'fa' ? 'rtl' : 'ltr'}
            />
          </div>
          <p className="text-xs text-[var(--muted)]">{rangeLabel}</p>
        </div>

        <div className="relative flex flex-col gap-2">
          <label className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
            {tFilters('channels')}
          </label>
          <button
            type="button"
            className="flex items-center justify-between rounded-xl border border-[var(--border)] px-3 py-2 text-sm transition hover:border-[var(--accent)]"
            onClick={() => setChannelsOpen((open) => !open)}
          >
            <span>
              {allChannelsSelected
                ? tFilters('allChannels')
                : `${selectedChannels.length} ${tFilters('selected')}`}
            </span>
            <span className="text-xs text-[var(--muted)]">{channelsOpen ? '▲' : '▼'}</span>
          </button>
          {channelsOpen ? (
            <div className="absolute top-full z-20 mt-2 w-full rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-3 shadow-lg">
              <div className="flex flex-col gap-2 text-sm">
                <label className="flex items-center justify-between gap-3">
                  <span>{tFilters('allChannels')}</span>
                  <input
                    type="checkbox"
                    checked={allChannelsSelected}
                    onChange={(event) =>
                      setSelectedChannels(event.target.checked ? [...channels] : [])
                    }
                  />
                </label>
                <div className="max-h-48 overflow-y-auto pe-1">
                  {channels.map((channel) => (
                    <label key={channel} className="flex items-center justify-between gap-3 py-1">
                      <span>{channel}</span>
                      <input
                        type="checkbox"
                        checked={selectedChannels.includes(channel)}
                        onChange={() => toggleChannel(channel)}
                      />
                    </label>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => setChannelsOpen(false)}
                  className="mt-1 self-end rounded-lg px-2 py-1 text-xs text-[var(--accent)]"
                >
                  {tFilters('done')}
                </button>
              </div>
            </div>
          ) : null}
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
            {tFilters('category')}
          </label>
          <select
            className="rounded-xl border border-[var(--border)] bg-transparent px-3 py-2 text-sm"
            value={selectedCategoryId}
            onChange={(event) => setSelectedCategoryId(event.target.value)}
          >
            <option value="">{tFilters('allCategories')}</option>
            {categories.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col justify-end gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              className="rounded-xl bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-white transition hover:brightness-105"
              onClick={applyFilters}
              disabled={!from || !to}
            >
              {tFilters('apply')}
            </button>
            <button
              type="button"
              className="rounded-xl border border-[var(--border)] px-4 py-2 text-sm transition hover:border-[var(--accent)]"
              onClick={handleReset}
            >
              {tFilters('reset')}
            </button>
            <div className="relative">
              <button
                type="button"
                onClick={() => setExportOpen((open) => !open)}
                className="rounded-xl border border-[var(--border)] px-4 py-2 text-sm transition hover:border-[var(--accent)]"
              >
                {tFilters('export')}
              </button>
              {exportOpen ? (
                <div className="absolute right-0 top-full z-20 mt-2 min-w-[12rem] rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-2 text-sm shadow-lg">
                  <button
                    type="button"
                    onClick={handleExportCurrent}
                    className="flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2 text-left transition hover:bg-[var(--surface-muted)]"
                  >
                    <span>{tFilters('exportCurrent')}</span>
                    <span className="text-xs text-[var(--muted)]">CSV</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleExportAll}
                    className="mt-1 flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2 text-left transition hover:bg-[var(--surface-muted)]"
                  >
                    <span>{tFilters('exportAll')}</span>
                    <span className="text-xs text-[var(--muted)]">CSV</span>
                  </button>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
