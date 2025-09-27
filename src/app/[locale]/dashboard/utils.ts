import { parse } from 'date-fns';

import { routing, type AppLocale } from '../../../../i18n/routing';
import { formatToman } from '../../../../lib/money';

export function ensureLocale(locale: string): locale is AppLocale {
  return (routing.locales as readonly string[]).includes(locale);
}

export function getNumberFormatter(locale: AppLocale) {
  return new Intl.NumberFormat(locale === 'fa' ? 'fa-IR' : 'en-US');
}

export function getCurrencyFormatter(locale: AppLocale) {
  return (value: number) => formatToman(Math.round(value), locale === 'fa' ? 'fa-IR' : 'en-US');
}

export function formatMonthLabel(monthKey: string, locale: AppLocale) {
  const reference = parse(monthKey, 'yyyy-MM', new Date());
  return new Intl.DateTimeFormat(locale === 'fa' ? 'fa-IR' : 'en-US', {
    month: 'short',
    year: '2-digit',
  }).format(reference);
}

export function getMonthToDateLabel(locale: AppLocale) {
  const now = new Date();
  return new Intl.DateTimeFormat(locale === 'fa' ? 'fa-IR' : 'en-US', {
    month: 'long',
    year: 'numeric',
  }).format(now);
}
