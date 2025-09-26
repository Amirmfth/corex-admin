"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { useMemo, useState } from "react";

import type { AppLocale } from "../../../i18n/routing";
import { totalCost } from "../../../lib/calc";
import type {
  ProductDetail,
  ProductItemEntry,
  ProductSoldItem,
} from "../../../lib/products";
import Toman from "../Toman";

import ProductForm from "./ProductForm";

type ProductDetailTabsProps = {
  product: ProductDetail;
  items: ProductItemEntry[];
  soldItems: ProductSoldItem[];
  locale: AppLocale;
};

type ActiveTab = "overview" | "items" | "prices";

function computeStats(soldItems: ProductSoldItem[]) {
  if (soldItems.length === 0) {
    return { average: 0, median: 0 };
  }

  const prices = soldItems.map((item) => item.soldPriceToman).sort((a, b) => a - b);
  const total = prices.reduce((sum, price) => sum + price, 0);
  const average = Math.round(total / prices.length);
  const mid = Math.floor(prices.length / 2);

  const median =
    prices.length % 2 === 0 ? Math.round((prices[mid - 1] + prices[mid]) / 2) : prices[mid];

  return { average, median };
}

export default function ProductDetailTabs({ product, items, soldItems, locale }: ProductDetailTabsProps) {
  const tDetail = useTranslations("products.detail");
  const tTable = useTranslations("table");
  const tStatuses = useTranslations("statuses");
  const tConditions = useTranslations("conditions");
  const intlLocale = locale === "fa" ? "fa-IR" : "en-US";
  const dateFormatter = useMemo(
    () => new Intl.DateTimeFormat(intlLocale, { dateStyle: "medium" }),
    [intlLocale],
  );
  const stats = computeStats(soldItems);
  const [activeTab, setActiveTab] = useState<ActiveTab>("overview");

  function renderItemsTab() {
    if (items.length === 0) {
      return (
        <div className="rounded-3xl border border-dashed border-[var(--border)] bg-[var(--surface-muted)] p-10 text-center text-sm text-[var(--muted)]">
          {tDetail("itemsEmpty")}
        </div>
      );
    }

    return (
      <div className="overflow-hidden rounded-3xl border border-[var(--border)] bg-[var(--surface)] shadow-sm">
        <table className="min-w-full divide-y divide-[var(--border)] text-sm">
          <thead className="bg-[var(--surface-muted)] text-[var(--muted)]">
            <tr>
              <th className="px-4 py-3 text-left font-medium">{tTable("serial")}</th>
              <th className="px-4 py-3 text-left font-medium">{tTable("condition")}</th>
              <th className="px-4 py-3 text-left font-medium">{tTable("status")}</th>
              <th className="px-4 py-3 text-left font-medium">{tTable("cost")}</th>
              <th className="px-4 py-3 text-left font-medium">{tDetail("listedPrice")}</th>
              <th className="px-4 py-3 text-left font-medium">{tDetail("soldPrice")}</th>
              <th className="px-4 py-3 text-right font-medium">{tTable("actions")}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border)]">
            {items.map((item) => {
              const costValue = totalCost({
                purchaseToman: item.purchaseToman,
                feesToman: item.feesToman,
                refurbToman: item.refurbToman,
              });
              return (
                <tr key={item.id} className="hover:bg-[var(--surface-muted)]">
                  <td className="px-4 py-3 text-[var(--foreground)]">{item.serial}</td>
                  <td className="px-4 py-3 text-[var(--foreground)]">{tConditions(item.condition)}</td>
                  <td className="px-4 py-3 text-[var(--foreground)]">{tStatuses(item.status)}</td>
                  <td className="px-4 py-3 text-[var(--foreground)]">
                    <Toman value={costValue} locale={intlLocale} />
                  </td>
                  <td className="px-4 py-3 text-[var(--foreground)]">
                    {item.listedPriceToman != null ? (
                      <Toman value={item.listedPriceToman} locale={intlLocale} />
                    ) : (
                      <span className="text-xs text-[var(--muted)]">{tDetail("notListed")}</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-[var(--foreground)]">
                    {item.soldPriceToman != null ? (
                      <Toman value={item.soldPriceToman} locale={intlLocale} />
                    ) : (
                      <span className="text-xs text-[var(--muted)]">{tDetail("notSold")}</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/${locale}/items/${item.id}`}
                      className="inline-flex items-center gap-2 text-xs font-medium text-[var(--accent)] transition hover:text-[var(--accent-hover)]"
                    >
                      {tDetail("viewItem")}
                    </Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  }

  function renderPricesTab() {
    if (soldItems.length === 0) {
      return (
        <div className="rounded-3xl border border-dashed border-[var(--border)] bg-[var(--surface-muted)] p-10 text-center text-sm text-[var(--muted)]">
          {tDetail("pricesEmpty")}
        </div>
      );
    }

    return (
      <div className="space-y-4">
        <div className="flex flex-col gap-2 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 text-sm text-[var(--muted-strong)] shadow-sm sm:flex-row sm:items-center sm:justify-between">
          <span>
            {tDetail("averageLabel")}: <Toman value={stats.average} locale={intlLocale} />
          </span>
          <span>
            {tDetail("medianLabel")}: <Toman value={stats.median} locale={intlLocale} />
          </span>
        </div>

        <div className="overflow-hidden rounded-3xl border border-[var(--border)] bg-[var(--surface)] shadow-sm">
          <table className="min-w-full divide-y divide-[var(--border)] text-sm">
            <thead className="bg-[var(--surface-muted)] text-[var(--muted)]">
              <tr>
                <th className="px-4 py-3 text-left font-medium">{tDetail("soldDate")}</th>
                <th className="px-4 py-3 text-left font-medium">{tDetail("soldPrice")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {soldItems.map((item) => (
                <tr key={item.id} className="hover:bg-[var(--surface-muted)]">
                  <td className="px-4 py-3 text-[var(--foreground)]">
                    {dateFormatter.format(new Date(item.soldAt))}
                  </td>
                  <td className="px-4 py-3 text-[var(--foreground)]">
                    <Toman value={item.soldPriceToman} locale={intlLocale} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => setActiveTab("overview")}
          className={`rounded-full px-4 py-2 text-sm font-medium transition ${
            activeTab === "overview"
              ? "bg-[var(--accent)] text-[var(--accent-foreground)] shadow-[0_6px_16px_var(--shadow-color)]"
              : "border border-[var(--border)] text-[var(--muted-strong)] hover:border-[var(--accent)] hover:text-[var(--accent)]"
          }`}
        >
          {tDetail("overviewTab")}
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("items")}
          className={`rounded-full px-4 py-2 text-sm font-medium transition ${
            activeTab === "items"
              ? "bg-[var(--accent)] text-[var(--accent-foreground)] shadow-[0_6px_16px_var(--shadow-color)]"
              : "border border-[var(--border)] text-[var(--muted-strong)] hover:border-[var(--accent)] hover:text-[var(--accent)]"
          }`}
        >
          {tDetail("itemsTab")}
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("prices")}
          className={`rounded-full px-4 py-2 text-sm font-medium transition ${
            activeTab === "prices"
              ? "bg-[var(--accent)] text-[var(--accent-foreground)] shadow-[0_6px_16px_var(--shadow-color)]"
              : "border border-[var(--border)] text-[var(--muted-strong)] hover:border-[var(--accent)] hover:text-[var(--accent)]"
          }`}
        >
          {tDetail("pricesTab")}
        </button>
      </div>

      {activeTab === "overview" ? (
        <ProductForm
          mode="edit"
          productId={product.id}
          initialValues={{
            name: product.name,
            brand: product.brand,
            model: product.model,
            categoryId: product.category?.id ?? null,
            imageUrls: product.imageUrls,
            specsJson: product.specsJson ?? undefined,
          }}
        />
      ) : null}

      {activeTab === "items" ? renderItemsTab() : null}

      {activeTab === "prices" ? renderPricesTab() : null}
    </div>
  );
}
