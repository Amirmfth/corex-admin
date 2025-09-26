import { getRequestConfig } from "next-intl/server";

import { routing, AppLocale } from "./routing";

function isAppLocale(locale: string): locale is AppLocale {
  return (routing.locales as readonly string[]).includes(locale);
}

export default getRequestConfig(async ({ locale }) => {
  const requestedLocale = locale ?? routing.defaultLocale;
  const resolvedLocale = isAppLocale(requestedLocale)
    ? requestedLocale
    : routing.defaultLocale;
  const messages = (await import(`../messages/${resolvedLocale}.json`)).default;

  return {
    locale: resolvedLocale,
    messages,
  };
});
