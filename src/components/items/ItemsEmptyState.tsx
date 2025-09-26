"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";

import type { AppLocale } from "../../../i18n/routing";
import QuickAddItem from "../QuickAddItem";


export default function ItemsEmptyState({ locale }: { locale: AppLocale }) {
  const tItems = useTranslations("items");
  const tSale = useTranslations("saleNew");

  return (
    <div className="flex flex-col items-center gap-4 rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-10 text-center shadow-sm">
      <div className="text-lg font-semibold text-[var(--foreground)]">{tItems("empty")}</div>
      <p className="max-w-md text-sm text-[var(--muted)]">{tItems("subtitle")}</p>
      <div className="flex flex-wrap items-center justify-center gap-3">
        <QuickAddItem />
        <Link
          href={`/${locale}/sales/new`}
          className="inline-flex items-center gap-2 rounded-full border border-[var(--border)] px-4 py-2 text-sm font-medium text-[var(--muted-strong)] transition hover:border-[var(--accent)] hover:text-[var(--foreground)]"
        >
          {tSale("title")}
        </Link>
      </div>
    </div>
  );
}

