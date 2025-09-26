import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";

import { routing, type AppLocale } from "../../../../i18n/routing";
import { getProductsList } from "../../../../lib/products";
import PageHeader from "../../../components/PageHeader";
import ProductsFilters from "../../../components/product/ProductsFilters";
import ProductsPagination from "../../../components/product/ProductsPagination";
import ProductsTable from "../../../components/product/ProductsTable";

export const dynamic = "force-dynamic";

type ProductsPageProps = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function getParamValue(value: string | string[] | undefined) {
  if (Array.isArray(value)) {
    return value[0];
  }
  return value ?? null;
}

function parsePage(value: string | string[] | undefined) {
  const raw = getParamValue(value);
  if (!raw) {
    return 1;
  }
  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
}

export default async function ProductsPage({ params, searchParams }: ProductsPageProps) {
  const { locale } = await params;
  const searchParamsValue = await searchParams;

  if (!(routing.locales as readonly string[]).includes(locale)) {
    notFound();
  }

  const typedLocale = locale as AppLocale;
  const q = getParamValue(searchParamsValue.q);
  const brand = getParamValue(searchParamsValue.brand);
  const categoryId = getParamValue(searchParamsValue.categoryId);
  const page = parsePage(searchParamsValue.page);

  const [t, result] = await Promise.all([
    getTranslations({ locale: typedLocale, namespace: "products" }),
    getProductsList({ q, brand, categoryId, page }),
  ]);

  const totalPages = Math.max(1, Math.ceil(result.total / result.pageSize));

  return (
    <section className="flex flex-col gap-6">
      <PageHeader
        title={t("title")}
        description={t("subtitle")}
        actions={
          <Link
            href={`/${typedLocale}/products/new`}
            className="inline-flex items-center gap-2 rounded-full border border-transparent bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-[var(--accent-foreground)] transition hover:bg-[var(--accent-hover)] shadow-[0_8px_20px_var(--shadow-color)]"
          >
            {t("add")}
          </Link>
        }
      />

      <ProductsFilters search={q} brand={brand} categoryId={categoryId} />

      {result.items.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-[var(--border)] bg-[var(--surface-muted)] p-10 text-center">
          <h2 className="text-lg font-semibold text-[var(--foreground)]">{t("emptyTitle")}</h2>
          <p className="mt-2 text-sm text-[var(--muted)]">{t("emptyBody")}</p>
          <Link
            href={`/${typedLocale}/products/new`}
            className="mt-4 inline-flex items-center gap-2 rounded-full border border-transparent bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-[var(--accent-foreground)] transition hover:bg-[var(--accent-hover)] shadow-[0_8px_20px_var(--shadow-color)]"
          >
            {t("add")}
          </Link>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          <ProductsTable products={result.items} locale={typedLocale} />
          <ProductsPagination page={result.page} totalPages={totalPages} />
        </div>
      )}
    </section>
  );
}
