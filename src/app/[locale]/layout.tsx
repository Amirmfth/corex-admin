import {
  BadgeCheck,
  BarChart3,
  Boxes,
  ClipboardList,
  LayoutDashboard,
  PackagePlus,
  Receipt,
  Settings2,
} from 'lucide-react';
import { notFound } from 'next/navigation';
import { NextIntlClientProvider } from 'next-intl';
import { getMessages, getTranslations, setRequestLocale } from 'next-intl/server';
import type { ReactNode, SVGProps } from 'react';
import { Toaster } from 'sonner';

import { Link, routing, AppLocale } from '../../../i18n/routing';
import LocaleSwitcher from '../../components/LocaleSwitcher';
import QuickAddItem from '../../components/QuickAddItem';

export const runtime = 'nodejs';

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

type LocaleLayoutProps = {
  children: ReactNode;
  params: Promise<{
    locale: string;
  }>;
};

export default async function LocaleLayout({ children, params }: LocaleLayoutProps) {
  const { locale } = await params;

  if (!(routing.locales as readonly string[]).includes(locale)) {
    notFound();
  }

  const normalizedLocale = locale as AppLocale;
  setRequestLocale(normalizedLocale);

  const [messages, tNav] = await Promise.all([
    getMessages({ locale: normalizedLocale }),
    getTranslations({ locale: normalizedLocale, namespace: 'navigation' }),
  ]);

  type NavIcon = (props: SVGProps<SVGSVGElement>) => JSX.Element;

  const navItems: { key: string; href: string; icon: NavIcon }[] = [
    { key: 'dashboard', href: '/', icon: LayoutDashboard },
    { key: 'items', href: '/items', icon: Boxes },
    { key: 'products', href: '/products', icon: PackagePlus },
    { key: 'purchases', href: '/purchases', icon: ClipboardList },
    { key: 'sales', href: '/sales', icon: Receipt },
    { key: 'reports', href: '/reports', icon: BarChart3 },
    { key: 'settings', href: '/settings', icon: Settings2 },
  ];

  const dir = normalizedLocale === 'fa' ? 'rtl' : 'ltr';

  return (
    <NextIntlClientProvider locale={normalizedLocale} messages={messages}>
      <div className="flex min-h-svh flex-col bg-[var(--surface-muted)] text-[var(--foreground)] lg:flex-row">
        <aside className="hidden w-64 flex-col border-e border-[var(--border)] bg-[var(--surface)]/90 shadow-[0_10px_40px_var(--shadow-color)] backdrop-blur lg:flex lg:sticky lg:top-0 lg:h-svh">
          <div className="flex items-center gap-2 px-6 pt-10 pb-8 text-xl font-semibold tracking-tight text-[var(--accent)]">
            <BadgeCheck className="size-5" aria-hidden />
            <span>Corex Admin</span>
          </div>
          <nav aria-label="Main" className="flex-1 px-4">
            <ul className="flex flex-col gap-1 text-sm font-medium text-[var(--muted)]">
              {navItems.map(({ key, href, icon: Icon }) => (
                <li key={key}>
                  <Link
                    href={href}
                    locale={normalizedLocale}
                    className="group flex items-center gap-2 rounded-xl px-3 py-2 transition hover:bg-[var(--surface-hover)] hover:text-[var(--accent)]"
                  >
                    <Icon
                      className="size-4 text-[var(--muted-strong)] transition group-hover:text-[var(--accent)]"
                      aria-hidden
                    />
                    <span>{tNav(key)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
          <div className="px-6 pb-6 text-xs text-[var(--muted)]">
            <p className="rounded-2xl bg-[var(--surface-hover)] px-3 py-2 shadow-inner">
              Corex {new Date().getFullYear()}
            </p>
          </div>
        </aside>

        <div className="flex flex-1 flex-col">
          <header className="border-b border-[var(--border)] bg-[var(--surface)]/95 backdrop-blur">
            <div className="flex flex-col gap-4 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
              <div className="flex items-center gap-3">
                <div className="rounded-full bg-[var(--accent)] px-3 py-1 text-sm font-semibold text-[var(--accent-foreground)] shadow-[0_10px_30px_var(--shadow-color)] lg:hidden">
                  Corex
                </div>
                <nav aria-label="Mobile" className="lg:hidden">
                  <ul className="flex items-center gap-3 overflow-x-auto whitespace-nowrap text-sm font-medium text-[var(--muted)] [-mx-2] px-2 py-1">
                    {navItems.map(({ key, href, icon: Icon }) => (
                      <li key={key}>
                        <Link
                          href={href}
                          locale={normalizedLocale}
                          className="group flex items-center gap-2 rounded-full px-3 py-1 transition hover:bg-[var(--surface-hover)] hover:text-[var(--accent)]"
                        >
                          <Icon
                            className="size-4 text-[var(--muted-strong)] transition group-hover:text-[var(--accent)]"
                            aria-hidden
                          />
                          <span>{tNav(key)}</span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </nav>
              </div>

              <div className="flex flex-wrap items-center justify-end gap-3">
                <QuickAddItem />
                <LocaleSwitcher />
                <span className="hidden items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--surface-muted)] px-3 py-1 text-xs font-medium text-[var(--muted)] shadow-sm sm:inline-flex">
                  <span
                    className="size-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)]"
                    aria-hidden
                  />
                  {normalizedLocale === 'fa' ? 'آنلاین' : 'Online'}
                </span>
              </div>
            </div>
          </header>

          <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8 xl:px-12">
            <div className="mx-auto w-full  space-y-6">{children}</div>
          </main>
        </div>
      </div>
      <Toaster dir={dir} richColors position="top-center" />
    </NextIntlClientProvider>
  );
}
