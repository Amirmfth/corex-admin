"use client";

import { Search } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { useEffect, useState, useTransition } from "react";

import CategorySelect from "../common/CategorySelect";

type ProductsFiltersProps = {
  search?: string | null;
  brand?: string | null;
  categoryId?: string | null;
};

export default function ProductsFilters({ search, brand, categoryId }: ProductsFiltersProps) {
  const t = useTranslations("products.filters");
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();
  const [searchValue, setSearchValue] = useState(search ?? "");
  const [brandValue, setBrandValue] = useState(brand ?? "");

  useEffect(() => {
    setSearchValue(search ?? "");
  }, [search]);

  useEffect(() => {
    setBrandValue(brand ?? "");
  }, [brand]);

  function applyParams(params: URLSearchParams) {
    params.set("page", "1");
    startTransition(() => {
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    });
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const params = new URLSearchParams(searchParams.toString());

    if (searchValue.trim()) {
      params.set("q", searchValue.trim());
    } else {
      params.delete("q");
    }

    if (brandValue.trim()) {
      params.set("brand", brandValue.trim());
    } else {
      params.delete("brand");
    }

    applyParams(params);
  }

  function handleCategoryChange(nextValue: string | null) {
    const params = new URLSearchParams(searchParams.toString());

    if (nextValue) {
      params.set("categoryId", nextValue);
    } else {
      params.delete("categoryId");
    }

    applyParams(params);
  }

  function handleClear() {
    setSearchValue("");
    setBrandValue("");
    startTransition(() => {
      router.replace(pathname, { scroll: false });
    });
  }

  return (
    <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-sm sm:p-5 lg:p-6">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-sm font-semibold text-[var(--foreground)]">{t("title")}</h2>

          <div className="flex w-full flex-col gap-2 sm:flex-row sm:items-center sm:justify-end">
            <div className="relative w-full sm:w-64">
              <label htmlFor="products-filter-search" className="sr-only">
                {t("searchLabel")}
              </label>
              <Search
                className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-[var(--muted)]"
                aria-hidden
              />
              <input
                id="products-filter-search"
                type="search"
                value={searchValue}
                onChange={(event) => setSearchValue(event.target.value)}
                placeholder={t("searchPlaceholder")}
                className="w-full rounded-full border border-[var(--border)] bg-[var(--surface)] px-11 py-2 text-sm shadow-sm focus:border-[var(--accent)] focus:outline-none"
              />
            </div>

            <div className="relative w-full sm:w-56">
              <label htmlFor="products-filter-brand" className="sr-only">
                {t("brandLabel")}
              </label>
              <input
                id="products-filter-brand"
                type="text"
                value={brandValue}
                onChange={(event) => setBrandValue(event.target.value)}
                placeholder={t("brandPlaceholder")}
                className="w-full rounded-full border border-[var(--border)] bg-[var(--surface)] px-4 py-2 text-sm shadow-sm focus:border-[var(--accent)] focus:outline-none"
              />
            </div>

            <div className="flex items-center gap-2 sm:w-auto">
              <button
                type="submit"
                className="inline-flex items-center gap-2 rounded-full border border-transparent bg-[var(--accent)] px-4 py-2 text-sm font-medium text-[var(--accent-foreground)] transition hover:bg-[var(--accent-hover)]"
                disabled={pending}
              >
                {t("apply")}
              </button>
              <button
                type="button"
                onClick={handleClear}
                className="rounded-full border border-[var(--border)] px-3 py-2 text-xs font-medium text-[var(--muted)] transition hover:border-[var(--accent)] hover:text-[var(--foreground)] disabled:cursor-not-allowed disabled:opacity-50"
                disabled={pending}
              >
                {t("clear")}
              </button>
            </div>
          </div>
        </div>

        <CategorySelect
          id="products-filter-category"
          label={t("categoryLabel")}
          value={categoryId ?? null}
          onChange={handleCategoryChange}
          placeholder={t("categoryPlaceholder")}
          noneLabel={t("categoryNone")}
          helperText={undefined}
          error={undefined}
          loadingLabel={t("categoryLoading")}
          retryLabel={t("categoryRetry")}
        />
      </form>
    </section>
  );
}
