"use client";

import type { ItemStatus } from '@prisma/client';
import { useTranslations } from "next-intl";


type StatusBadgeProps = {
  status: ItemStatus;
  className?: string;
  label?: string;
};

const STATUS_STYLES: Record<ItemStatus, string> = {
  IN_STOCK: "bg-emerald-100 text-emerald-700 border-emerald-200",
  LISTED: "bg-sky-100 text-sky-700 border-sky-200",
  REPAIR: "bg-amber-100 text-amber-700 border-amber-200",
  RESERVED: "bg-violet-100 text-violet-700 border-violet-200",
  SOLD: "bg-[var(--surface-muted)] text-[var(--muted-strong)] border-[var(--border)]",
};

export default function StatusBadge({ status, className = "", label }: StatusBadgeProps) {
  const t = useTranslations("statuses");
  const resolvedLabel = label ?? t(status);
  const classes = STATUS_STYLES[status] ?? STATUS_STYLES.IN_STOCK;

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-semibold ${classes} ${className}`.trim()}
    >
      {resolvedLabel}
    </span>
  );
}
