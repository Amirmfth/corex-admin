const DEFAULT_LOCALE = "fa-IR";

export function formatDate(input: Date | string, locale: string = DEFAULT_LOCALE): string {
  const date = typeof input === "string" ? new Date(input) : input;

  if (Number.isNaN(date.getTime())) {
    throw new Error("formatDate received an invalid date value");
  }

  return new Intl.DateTimeFormat(locale, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}
