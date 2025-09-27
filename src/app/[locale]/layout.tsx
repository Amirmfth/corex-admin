// app/[locale]/layout.tsx
import { notFound } from 'next/navigation';
import { NextIntlClientProvider } from 'next-intl';
import { getMessages, getTranslations, setRequestLocale } from 'next-intl/server';
import type { ReactNode } from 'react';
import { Toaster } from 'sonner';

import MobileNav from '@/components/MobileNav';
import Sidebar from '@/components/Sidebar';
import { getDisplaySettings, getGeneralSettings } from '@/lib/app-settings';

import { AppLocale, routing } from '../../../i18n/routing';

// ---- Basic helpers ----
const NAV_BASE = [
  { key: 'dashboard', href: '/' },
  { key: 'items', href: '/items' },
  { key: 'categories', href: '/categories' },
  { key: 'products', href: '/products' },
  { key: 'purchases', href: '/purchases' },
  { key: 'sales', href: '/sales' },
  { key: 'reports', href: '/reports' },
  { key: 'settings', href: '/settings' },
] as const;

export const runtime = 'nodejs';

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale })); // uses next-intl routing locales
}

type LocaleLayoutProps = {
  children: ReactNode;
  params: Promise<{ locale: string }>;
};

export default async function LocaleLayout({ children, params }: LocaleLayoutProps) {
  const { locale } = await params;

  if (!(routing.locales as readonly string[]).includes(locale)) {
    notFound();
  }
  const normalizedLocale = locale as AppLocale;
  setRequestLocale(normalizedLocale);

  const [messages, tNav, generalSettings, displaySettings] = await Promise.all([
    getMessages({ locale: normalizedLocale }),
    getTranslations({ locale: normalizedLocale, namespace: 'navigation' }),
    getGeneralSettings(),
    getDisplaySettings(),
  ]);

  const dir: 'ltr' | 'rtl' = displaySettings.rtl ? 'rtl' : 'ltr';
  const brandLabel = generalSettings.businessName || 'CoreX';

  // Build client-safe nav items (iconId as string)
  const mobileNav = NAV_BASE.map(({ key, href }) => ({
    key,
    href,
    label: tNav(key),
    iconId: key, // resolved on client
  }));

  const desktopNav = mobileNav; // same structure; Sidebar resolves icons client-side

  // Language links (inside MobileNav; shown in Sidebar footer on desktop)
  // For “keep same path” per locale, we can upgrade later using your router’s current pathname.
  const languageLinks = [
    { locale: 'en' as AppLocale, label: 'English', href: '/' },
    { locale: 'fa' as AppLocale, label: 'فارسی', href: '/' },
  ];

  return (
    <html lang={normalizedLocale} dir={dir}>
      <body className="min-h-dvh bg-[var(--background)] text-[var(--foreground)]">
        <NextIntlClientProvider locale={normalizedLocale} messages={messages}>
          <div className="flex min-h-dvh">
            {/* Collapsible desktop sidebar (client) */}
            <Sidebar
              items={desktopNav}
              locale={normalizedLocale}
              dir={dir}
              brandLabel={brandLabel}
              languageLinks={languageLinks}
              className="hidden lg:block"
            />

            {/* Main column */}
            <div className="flex min-w-0 flex-1 flex-col">
              {/* Mobile top bar (hamburger + brand + Add Item). Language lives in the menu. */}
              <MobileNav
                items={mobileNav}
                locale={normalizedLocale}
                dir={dir}
                brandLabel={brandLabel}
                languageLinks={languageLinks}
                addItemHref="/items/new"
                addItemAriaLabel={normalizedLocale === 'fa' ? 'افزودن آیتم' : 'Add item'}
                className="sticky top-0 z-40 bg-white/90 backdrop-blur supports-[backdrop-filter]:bg-white/70"
              />

              {/* Page content */}
              <main className="flex-1 min-w-0 px-4 py-6 sm:px-6 lg:px-8 xl:px-12">
                <div className="mx-auto w-full space-y-6">{children}</div>
              </main>
            </div>
          </div>

          <Toaster dir={dir} richColors position="top-center" />
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
