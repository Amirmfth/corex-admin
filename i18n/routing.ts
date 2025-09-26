import { createNavigation } from 'next-intl/navigation';
import { defineRouting } from 'next-intl/routing';

const locales = ['fa', 'en'] as const;
type Locale = (typeof locales)[number];

function resolveDefaultLocale(): Locale {
  const envLocale = process.env.NEXT_PUBLIC_DEFAULT_LOCALE;
  if (envLocale && (locales as readonly string[]).includes(envLocale)) {
    return envLocale as Locale;
  }

  return 'fa';
}

export const routing = defineRouting({
  locales,
  defaultLocale: resolveDefaultLocale(),
  localePrefix: 'always',
});

export const { Link, redirect, usePathname, useRouter, getPathname } = createNavigation(routing);

export type AppLocale = (typeof routing.locales)[number];
