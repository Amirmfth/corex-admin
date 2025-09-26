import { ItemCondition, ItemStatus } from '@prisma/client';
import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";


import { routing, type AppLocale } from "../../../../i18n/routing";
import { ITEMS_PAGE_SIZE, getItemsList } from "../../../../lib/items";
import ItemsEmptyState from "../../../components/items/ItemsEmptyState";
import ItemsFilters from "../../../components/items/ItemsFilters";
import ItemsPagination from "../../../components/items/ItemsPagination";
import ItemsTable from "../../../components/items/ItemsTable";
import PageHeader from "../../../components/PageHeader";



interface ItemsPageProps {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export const dynamic = "force-dynamic";

function toArray<T extends string>(value: string | string[] | undefined, validator: Set<T>): T[] {
  if (!value) {
    return [];
  }

  const values = Array.isArray(value) ? value : [value];
  return values.filter((entry): entry is T => validator.has(entry as T));
}

function getPage(searchParams: Record<string, string | string[] | undefined>) {
  const pageParam = searchParams.page;
  const pageValue = Array.isArray(pageParam) ? pageParam[0] : pageParam;
  const parsed = Number.parseInt(pageValue ?? "1", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
}

export default async function ItemsPage({ params, searchParams }: ItemsPageProps) {
  const { locale } = await params;
  const searchParamsValue = await searchParams;

  if (!(routing.locales as readonly string[]).includes(locale)) {
    notFound();
  }

  const typedLocale = locale as AppLocale;
  const tItems = await getTranslations({ locale: typedLocale, namespace: "items" });
  const tSale = await getTranslations({ locale: typedLocale, namespace: "saleNew" });

  const statusOptions = new Set(Object.values(ItemStatus));
  const conditionOptions = new Set(Object.values(ItemCondition));

  const selectedStatuses = toArray(searchParamsValue.status, statusOptions);
  const selectedConditions = toArray(searchParamsValue.condition, conditionOptions);
  const selectedCategory = Array.isArray(searchParamsValue.category)
    ? searchParamsValue.category[0]
    : searchParamsValue.category ?? null;
  const search = Array.isArray(searchParamsValue.search)
    ? searchParamsValue.search[0]
    : searchParamsValue.search ?? null;
  const page = getPage(searchParamsValue);

  const { items, total, categories } = await getItemsList({
    statuses: selectedStatuses,
    conditions: selectedConditions,
    categoryId: selectedCategory,
    search,
    page,
  });

  const totalPages = Math.max(1, Math.ceil(total / ITEMS_PAGE_SIZE));

  return (
    <section className="flex flex-col gap-6">
      <PageHeader
        title={tItems("title")}
        description={tItems("subtitle")}
        actions={
          <Link
            href={`/${typedLocale}/sales/new`}
            className="inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--surface)] px-4 py-2 text-sm font-medium text-[var(--muted-strong)] transition hover:border-[var(--accent)] hover:text-[var(--foreground)]"
          >
            {tSale("title")}
          </Link>
        }
      />

      <ItemsFilters
        statuses={Array.from(statusOptions)}
        conditions={Array.from(conditionOptions)}
        categories={categories}
        selectedStatuses={selectedStatuses}
        selectedConditions={selectedConditions}
        selectedCategory={selectedCategory}
        search={search}
      />

      {items.length === 0 ? (
        <ItemsEmptyState locale={typedLocale} />
      ) : (
        <>
          <ItemsTable items={items} locale={typedLocale} />
          <ItemsPagination page={page} totalPages={totalPages} />
        </>
      )}
    </section>
  );
}


