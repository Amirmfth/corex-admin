'use client';

import type { ItemCondition, ItemStatus } from '@prisma/client';
import { Search } from 'lucide-react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useMemo, useState, useTransition } from 'react';

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';

function toggleSearchParam(params: URLSearchParams, key: string, value: string) {
  const current = params.getAll(key);
  const next = new Set(current);

  if (next.has(value)) {
    next.delete(value);
  } else {
    next.add(value);
  }

  params.delete(key);
  next.forEach((entry) => params.append(key, entry));
}

type ItemsFiltersProps = {
  statuses: ItemStatus[];
  conditions: ItemCondition[];
  categories: {
    id: string;
    name: string;
  }[];
  selectedStatuses: ItemStatus[];
  selectedConditions: ItemCondition[];
  selectedCategory?: string | null;
  search?: string | null;
};

export default function ItemsFilters({
  statuses,
  conditions,
  categories,
  selectedStatuses,
  selectedConditions,
  selectedCategory,
  search,
}: ItemsFiltersProps) {
  const t = useTranslations('filters');
  const tStatuses = useTranslations('statuses');
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();
  const [searchValue, setSearchValue] = useState(search ?? '');

  const statusesSet = useMemo(() => new Set(selectedStatuses), [selectedStatuses]);
  const conditionsSet = useMemo(() => new Set(selectedConditions), [selectedConditions]);

  function applyParams(params: URLSearchParams) {
    params.set('page', '1');
    startTransition(() => {
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    });
  }

  function handleStatusToggle(status: ItemStatus) {
    const params = new URLSearchParams(searchParams.toString());
    toggleSearchParam(params, 'status', status);
    applyParams(params);
  }

  function handleConditionToggle(condition: ItemCondition) {
    const params = new URLSearchParams(searchParams.toString());
    toggleSearchParam(params, 'condition', condition);
    applyParams(params);
  }

  function handleCategorySelect(value: string) {
    const params = new URLSearchParams(searchParams.toString());

    if (!value) {
      params.delete('category');
    } else {
      params.set('category', value);
    }

    applyParams(params);
  }

  function handleSearchSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const params = new URLSearchParams(searchParams.toString());

    if (!searchValue.trim()) {
      params.delete('search');
    } else {
      params.set('search', searchValue.trim());
    }

    applyParams(params);
  }

  function handleClear() {
    startTransition(() => {
      router.replace(pathname, { scroll: false });
    });
  }

  return (
    <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-sm sm:p-5 lg:p-6">
      <form onSubmit={handleSearchSubmit} className="flex flex-col gap-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-sm font-semibold text-[var(--foreground)]">{t('title')}</h2>

          <div className="flex w-full flex-col gap-2 sm:flex-row sm:items-center sm:justify-end">
            <div className="relative w-full sm:w-64">
              <Search
                className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-[var(--muted)]"
                aria-hidden
              />
              <input
                type="search"
                value={searchValue}
                onChange={(event) => setSearchValue(event.target.value)}
                placeholder={t('searchPlaceholder')}
                className="w-full rounded-full border border-[var(--border)] bg-[var(--surface)] px-11 py-2 text-sm shadow-sm focus:border-[var(--accent)] focus:outline-none"
              />
            </div>

            <div className="flex items-center gap-2 sm:w-auto">
              <button
                type="submit"
                className="inline-flex items-center gap-2 rounded-full border border-transparent bg-[var(--accent)] px-4 py-2 text-sm font-medium text-[var(--accent-foreground)] transition hover:bg-[var(--accent-hover)]"
                disabled={pending}
              >
                {t('search')}
              </button>

              <button
                type="button"
                onClick={handleClear}
                className="rounded-full border border-[var(--border)] px-3 py-2 text-xs font-medium text-[var(--muted)] transition hover:border-[var(--accent)] hover:text-[var(--foreground)]"
                disabled={pending}
              >
                {t('clear')}
              </button>
            </div>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <fieldset className="rounded-xl border border-[var(--border)] p-3">
            <legend className="px-1 text-xs font-semibold uppercase text-[var(--muted)]">
              {t('status')}
            </legend>
            <div className="mt-2 flex flex-wrap gap-2">
              {statuses.map((status) => {
                const checked = statusesSet.has(status);
                return (
                  <label
                    key={status}
                    className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium transition ${
                      checked
                        ? 'border-[var(--accent)] bg-[var(--accent)] text-[var(--accent-foreground)] shadow-[0_6px_16px_var(--shadow-color)]'
                        : 'border-[var(--border)] text-[var(--muted)] hover:border-[var(--accent)] hover:text-[var(--accent)]'
                    }`}
                  >
                    <input
                      type="checkbox"
                      className="sr-only"
                      checked={checked}
                      onChange={() => handleStatusToggle(status)}
                    />
                    {tStatuses(status)}
                  </label>
                );
              })}
            </div>
          </fieldset>

          <fieldset className="rounded-xl border border-[var(--border)] p-3">
            <legend className="px-1 text-xs font-semibold uppercase text-[var(--muted)]">
              {t('condition')}
            </legend>
            <div className="mt-2 flex flex-wrap gap-2">
              {conditions.map((condition) => {
                const checked = conditionsSet.has(condition);
                return (
                  <label
                    key={condition}
                    className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium transition ${
                      checked
                        ? 'border-[var(--accent)] bg-[var(--accent)] text-[var(--accent-foreground)] shadow-[0_6px_16px_var(--shadow-color)]'
                        : 'border-[var(--border)] text-[var(--muted)] hover:border-[var(--accent)] hover:text-[var(--accent)]'
                    }`}
                  >
                    <input
                      type="checkbox"
                      className="sr-only"
                      checked={checked}
                      onChange={() => handleConditionToggle(condition)}
                    />
                    {condition}
                  </label>
                );
              })}
            </div>
          </fieldset>

          <div className="space-y-2 rounded-xl border border-[var(--border)] p-3">
            <label
              className="px-1 text-xs font-semibold uppercase text-[var(--muted)]"
              htmlFor="category-filter"
            >
              {t('category')}
            </label>
            <Select
              value={selectedCategory ?? ''}
              onValueChange={handleCategorySelect}
              disabled={pending || categories.length === 0}
            >
              <SelectTrigger id="category-filter">
                <SelectValue placeholder={t('allCategories')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">{t('allCategories')}</SelectItem>
                {categories.map((category) => (
                  <SelectItem key={category.id} value={category.id}>
                    {category.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </form>
    </section>
  );
}
