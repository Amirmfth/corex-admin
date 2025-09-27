'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { useEffect, useMemo, useState } from 'react';

import type { ReportChannel } from '../../../lib/reporting-data';

export type FilterState = {
  start: string;
  end: string;
  channels: ReportChannel[];
  category: string | null;
};

type FilterBarProps = {
  channels: ReportChannel[];
  categories: string[];
  initialFilters: FilterState;
  onExportCurrent: () => Promise<void> | void;
  onExportAll: () => Promise<void> | void;
};

function formatRangeLabel(locale: string, start: string, end: string) {
  const formatter = new Intl.DateTimeFormat(locale === 'fa' ? 'fa-IR' : 'en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
  const fromDate = start ? formatter.format(new Date(start)) : '—';
  const toDate = end ? formatter.format(new Date(end)) : '—';
  return `${fromDate} → ${toDate}`;
}

export default function FilterBar({
  channels,
  categories,
  initialFilters,
  onExportCurrent,
  onExportAll,
}: FilterBarProps) {
  const locale = useLocale();
  const tFilters = useTranslations('reportsDashboard.filters');
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [start, setStart] = useState(initialFilters.start);
  const [end, setEnd] = useState(initialFilters.end);
  const [selectedChannels, setSelectedChannels] = useState<ReportChannel[]>(initialFilters.channels);
  const [selectedCategory, setSelectedCategory] = useState(initialFilters.category ?? '');
  const [channelsOpen, setChannelsOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);

  useEffect(() => {
    setStart(initialFilters.start);
    setEnd(initialFilters.end);
    setSelectedChannels(initialFilters.channels);
    setSelectedCategory(initialFilters.category ?? '');
  }, [initialFilters]);

  const rangeLabel = useMemo(
    () => formatRangeLabel(locale, start, end),
    [locale, start, end],
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
    if (!start || !end) return;
    const params = new URLSearchParams(searchParams?.toString());
    params.set('start', start);
    params.set('end', end);
    params.delete('channel');
    selectedChannels.forEach((channel) => params.append('channel', channel));
    if (selectedCategory) {
      params.set('category', selectedCategory);
    } else {
      params.delete('category');
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
              value={start}
              onChange={(event) => setStart(event.target.value)}
              max={end}
            />
            <span className="text-xs text-[var(--muted)]">{tFilters('to')}</span>
            <input
              type="date"
              className="flex-1 rounded-xl border border-[var(--border)] bg-transparent px-3 py-2 text-sm"
              value={end}
              onChange={(event) => setEnd(event.target.value)}
              min={start}
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
            value={selectedCategory}
            onChange={(event) => setSelectedCategory(event.target.value)}
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
              disabled={!start || !end}
            >
              {tFilters('apply')}
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
