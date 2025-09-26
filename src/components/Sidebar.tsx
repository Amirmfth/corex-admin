'use client';

import { motion } from 'framer-motion';
import {
  LayoutDashboard,
  Boxes,
  PackagePlus,
  ClipboardList,
  Receipt,
  BarChart3,
  Settings2,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { usePathname } from 'next/navigation';
import * as React from 'react';

import { Link, type AppLocale } from '../../i18n/routing';

type SidebarItem = {
  key: string;
  href: string;
  label: string;
  iconId: string; // resolved to icon component below
};

type LanguageLink = {
  locale: AppLocale;
  label: string;
  href: string;
};

interface SidebarProps {
  items: SidebarItem[];
  locale: AppLocale;
  dir: 'ltr' | 'rtl';
  brandLabel: string;
  languageLinks?: LanguageLink[];
  className?: string;
}

const ICONS = {
  dashboard: LayoutDashboard,
  items: Boxes,
  products: PackagePlus,
  purchases: ClipboardList,
  sales: Receipt,
  reports: BarChart3,
  settings: Settings2,
} as const;

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(' ');
}

export default function Sidebar({
  items,
  locale,
  dir,
  brandLabel,
  languageLinks,
  className,
}: SidebarProps) {
  const [collapsed, setCollapsed] = React.useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem('sidebar:collapsed') === '1';
  });
  const pathname = usePathname();

  // Helper: does this href match the current path (locale-aware)?
  function isActive(href: string) {
    // hrefs are like "/items"
    // pathname is like "/en/items" or "/fa/items"
    const afterLocale = pathname?.replace(/^\/[a-zA-Z-]+/, '') || '/';
    if (href === '/') return afterLocale === '/' || afterLocale === '';
    return afterLocale === href || afterLocale.startsWith(href + '/');
  }

  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('sidebar:collapsed', collapsed ? '1' : '0');
    }
  }, [collapsed]);

  const isRTL = dir === 'rtl';
  const closedW = 72; // px
  const openW = 288; // px

  const toggle = () => setCollapsed((v) => !v);

  return (
    <motion.aside
      aria-label="Sidebar"
      className={cx(
        'sticky top-0 z-30 h-dvh shrink-0 border-e border-[var(--surface-hover)] bg-white shadow-[0_10px_40px_var(--shadow-color)] backdrop-blur',
        className,
      )}
      initial={false}
      animate={{ width: collapsed ? closedW : openW }}
      transition={{ type: 'tween', ease: 'easeInOut', duration: 0.2 }}
      style={{ overflow: 'hidden' }}
    >
      {/* Brand + Collapse */}
      <div className="flex items-center justify-between  px-3 py-4">
        {!collapsed && (
          <div className={cx('flex items-center gap-2', collapsed ? 'justify-center' : '')}>
            <div className="rounded-full bg-[var(--accent)]/90 px-3 py-1 text-sm font-semibold text-[var(--accent-foreground)] shadow">
              {brandLabel}
            </div>
          </div>
        )}
        <button
          type="button"
          onClick={toggle}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          className="inline-flex items-center rounded-xl p-2 text-[var(--muted-strong)] hover:bg-[var(--surface-hover)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
          title={
            collapsed
              ? isRTL
                ? 'باز کردن نوار کناری'
                : 'Expand sidebar'
              : isRTL
                ? 'بستن نوار کناری'
                : 'Collapse sidebar'
          }
        >
          {isRTL ? (
            collapsed ? (
              <ChevronLeft className="size-5" />
            ) : (
              <ChevronRight className="size-5" />
            )
          ) : collapsed ? (
            <ChevronRight className="size-5" />
          ) : (
            <ChevronLeft className="size-5" />
          )}
        </button>
      </div>

      {/* Nav */}
      <nav aria-label="Main" className="px-2">
        <ul className="flex flex-col gap-1 text-sm font-medium text-[var(--muted)]">
          {items.map(({ key, href, label, iconId }) => {
            const Icon = (ICONS as any)[iconId] ?? LayoutDashboard;
            return (
              <li key={key}>
                <Link
                  href={href}
                  locale={locale}
                  className={cx(
                    'group flex items-center gap-3 rounded-xl px-3 py-2 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]',
                    isActive(href)
                      ? 'bg-[var(--surface-hover)] text-[var(--accent)]'
                      : 'hover:bg-[var(--surface-hover)] hover:text-[var(--accent)]',
                  )}
                  title={collapsed ? label : undefined}
                >
                  <Icon
                    className="size-4 text-[var(--muted-strong)] transition group-hover:text-[var(--accent)]"
                    aria-hidden
                  />
                  <span
                    className={cx(
                      'truncate transition-opacity',
                      collapsed ? 'opacity-0 pointer-events-none select-none' : 'opacity-100',
                    )}
                    style={{ width: collapsed ? 0 : 'auto' }}
                  >
                    {label}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Footer: languages (only visible when expanded) */}
      <div className="absolute inset-x-0 bottom-0 border-t border-[var(--surface-hover)] p-3">
        <div
          className={cx(
            'text-xs font-semibold uppercase tracking-wide text-[var(--muted-strong)]/70 mb-2',
            collapsed && 'sr-only',
          )}
        >
          {locale === 'fa' ? 'زبان' : 'Language'}
        </div>
        <div className={cx('flex flex-wrap gap-2', collapsed && 'justify-center')}>
          {languageLinks?.map((lng) => {
            const isCurrent = lng.locale === locale;
            return (
              <Link
                key={lng.locale}
                href={lng.href}
                locale={lng.locale}
                className={cx(
                  'rounded-lg border px-2 py-1 text-xs focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]',
                  isCurrent
                    ? 'border-[var(--accent)] bg-[var(--accent)] text-[var(--accent)]'
                    : 'border-[var(--surface-hover)] hover:border-[var(--accent)] ',
                  collapsed && 'px-2 py-1',
                )}
                title={collapsed ? lng.label : undefined}
              >
                <span>{!collapsed ? lng.label : lng.locale}</span>
              </Link>
            );
          })}
        </div>
      </div>
    </motion.aside>
  );
}
