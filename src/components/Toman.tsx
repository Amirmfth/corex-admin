"use client";

import { useLocale } from "next-intl";

import { formatToman } from "../../lib/money";

type TomanProps = {
  value: number;
  locale?: "fa-IR" | "en-US";
  className?: string;
  showSign?: boolean;
};

export default function Toman({ value, locale, className = "", showSign = false }: TomanProps) {
  const activeLocale = useLocale();
  const resolvedLocale =
    locale ?? (activeLocale === "fa" ? "fa-IR" : "en-US");

  const formatted = formatToman(Math.abs(value), resolvedLocale);
  const signedValue = showSign && value !== 0 ? `${value > 0 ? "+" : "-"}${formatted}` : formatted;

  return <span className={className.trim()}>{signedValue}</span>;
}
