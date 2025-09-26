"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { useTransition } from "react";

type ProductsPaginationProps = {
  page: number;
  totalPages: number;
};

export default function ProductsPagination({ page, totalPages }: ProductsPaginationProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();
  const t = useTranslations("products.pagination");

  if (totalPages <= 1) {
    return null;
  }

  function updatePage(nextPage: number) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", String(nextPage));
    startTransition(() => {
      router.replace(`${pathname}?${params.toString()}`, { scroll: true });
    });
  }

  const isFirst = page <= 1;
  const isLast = page >= totalPages;

  return (
    <div className="flex items-center justify-between gap-4 rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-sm text-[var(--muted)] shadow-sm">
      <span>
        {t("pageOf", { page, totalPages })}
      </span>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => updatePage(page - 1)}
          className="rounded-full border border-[var(--border)] px-3 py-1 text-xs font-medium text-[var(--muted-strong)] transition hover:border-[var(--accent)] hover:text-[var(--foreground)] disabled:cursor-not-allowed disabled:opacity-50"
          disabled={isFirst || pending}
        >
          {t("previous")}
        </button>
        <button
          type="button"
          onClick={() => updatePage(page + 1)}
          className="rounded-full border border-[var(--border)] px-3 py-1 text-xs font-medium text-[var(--muted-strong)] transition hover:border-[var(--accent)] hover:text-[var(--foreground)] disabled:cursor-not-allowed disabled:opacity-50"
          disabled={isLast || pending}
        >
          {t("next")}
        </button>
      </div>
    </div>
  );
}
