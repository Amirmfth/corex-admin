const DEFAULT_LOCALE = 'fa-IR' as const;

const LABEL_SUFFIX: Record<'fa-IR' | 'en-US', string> = {
  'fa-IR': ' تومان',
  'en-US': ' Toman',
};

export function formatToman(value: number, locale: 'fa-IR' | 'en-US' = DEFAULT_LOCALE): string {
  if (!Number.isFinite(value)) {
    throw new Error('formatToman expects a finite number');
  }

  const formatter = new Intl.NumberFormat(locale, {
    maximumFractionDigits: 0,
  });

  const formatted = formatter.format(Math.round(value));
  return `${formatted}${LABEL_SUFFIX[locale]}`;
}
