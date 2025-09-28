import type { Metadata } from 'next';
import { headers } from 'next/headers';
import './globals.css';

import { routing, AppLocale } from '../../i18n/routing';

const DEFAULT_LOCALE = routing.defaultLocale as AppLocale;

function resolveLocale(candidate: string | null): AppLocale {
  if (!candidate) {
    return DEFAULT_LOCALE;
  }

  return (routing.locales as readonly string[]).includes(candidate)
    ? (candidate as AppLocale)
    : DEFAULT_LOCALE;
}

export const metadata: Metadata = {
  title: 'CoreX Admin',
  description: 'Inventory and sales console',
  icons: {
    icon: '/favicon.ico',
    shortcut: '/favicon-16x16.png',
    apple: '/apple-touch-icon.png',
  },
  manifest: '/site.webmanifest',
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const requestHeaders = await headers();
  const locale = resolveLocale(requestHeaders.get('x-next-intl-locale'));
  const dir = locale === 'fa' ? 'rtl' : 'ltr';

  return (
    <html lang={locale} dir={dir} suppressHydrationWarning>
      <body className="antialiased bg-[var(--surface)] text-[var(--foreground)]">
        {children}
      </body>
    </html>
  );
}
