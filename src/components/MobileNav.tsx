'use client';

import * as Dialog from '@radix-ui/react-dialog';
import { motion, AnimatePresence, Transition } from 'framer-motion';
import {
  Menu,
  X,
  LayoutDashboard,
  Boxes,
  PackagePlus,
  ClipboardList,
  Receipt,
  BarChart3,
  Settings2,
  FolderTree,
} from 'lucide-react';
import { usePathname } from 'next/navigation';
import * as React from 'react';
import type { ComponentType, SVGProps } from 'react';

import { Link, type AppLocale } from '../../i18n/routing';


// ---------- Types ----------
export type MobileNavItem = {
  key: string;
  href: string;
  label: string;
  iconId: string; // string identifier, not a component
};

export type LanguageLink = {
  locale: AppLocale;
  label: string;
  href: string; // link to same path in that locale
};

interface MobileNavProps {
  items: MobileNavItem[];
  locale: AppLocale;
  dir: 'ltr' | 'rtl';
  brandLabel: string;

  // show inside the drawer
  languageLinks?: LanguageLink[];

  // top-right action
  addItemHref?: string;
  addItemAriaLabel?: string;

  className?: string;
}

// ---------- Icon registry (client-side mapping) ----------
const ICONS: Record<string, ComponentType<SVGProps<SVGSVGElement>>> = {
  dashboard: LayoutDashboard,
  items: Boxes,
  categories: FolderTree,
  products: PackagePlus,
  purchases: ClipboardList,
  sales: Receipt,
  reports: BarChart3,
  settings: Settings2,
};

// ---------- Utils ----------
function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(' ');
}

// ---------- Component ----------
export default function MobileNav({
  items,
  locale,
  dir,
  brandLabel,
  languageLinks,
  className,
}: MobileNavProps) {
  const [open, setOpen] = React.useState(false);
  const side = dir === 'rtl' ? 'right' : 'left';

  const pathname = usePathname();
  const afterLocale = pathname?.replace(/^\/[a-zA-Z-]+/, '') || '/';

  function isActive(href: string) {
    if (href === '/') return afterLocale === '/' || afterLocale === '';
    return afterLocale === href || afterLocale.startsWith(href + '/');
  }

  // Animations
  const overlayVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1 },
    exit: { opacity: 0 },
  };

  const panelVariants = {
    hidden: { x: side === 'left' ? '-100%' : '100%' },
    visible: { x: 0 },
    exit: { x: side === 'left' ? '-100%' : '100%' },
  };

  const transition: Transition = { type: 'tween', ease: 'easeOut', duration: 0.22 };

  return (
    <div className={cx('lg:hidden', className)}>
      {/* Top bar */}
      <div className="flex items-center justify-between gap-2 px-3 py-2">
        {/* Hamburger (icon-only) */}
        <Dialog.Root open={open} onOpenChange={setOpen}>
          <Dialog.Trigger asChild>
            <button
              type="button"
              aria-label="Open menu"
              className="inline-flex items-center rounded-xl p-2 text-[var(--muted-strong)] hover:bg-[var(--surface-hover)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
            >
              <Menu className="size-6" aria-hidden />
            </button>
          </Dialog.Trigger>

          {/* Brand in the center */}
          <span className="text-lg font-semibold text-[var(--muted-strong)]">{brandLabel}</span>

          {/* Portal ensures full-viewport coverage */}
          <Dialog.Portal forceMount>
            <AnimatePresence>
              {open && (
                <>
                  {/* Overlay */}
                  <Dialog.Overlay asChild>
                    <motion.div
                      className="fixed inset-0 z-50 bg-black/40"
                      initial="hidden"
                      animate="visible"
                      exit="exit"
                      variants={overlayVariants}
                      transition={transition}
                    />
                  </Dialog.Overlay>

                  {/* Side panel */}
                  <Dialog.Content asChild>
                    <motion.div
                      role="dialog"
                      aria-label={brandLabel}
                      className={cx(
                        'fixed top-0 bottom-0 z-50 flex h-[100dvh] w-[88%] max-w-[360px] flex-col bg-white shadow-2xl outline-none',
                        side === 'left' ? 'left-0 rounded-r-2xl' : 'right-0 rounded-l-2xl',
                      )}
                      initial="hidden"
                      animate="visible"
                      exit="exit"
                      variants={panelVariants}
                      transition={transition}
                    >
                      {/* Header */}
                      <div className="flex items-center justify-between gap-2 border-b border-[var(--surface-hover)] px-3 py-3">
                        <span className="text-sm font-semibold text-[var(--muted-strong)]">
                          {brandLabel}
                        </span>
                        <Dialog.Close asChild>
                          <button
                            type="button"
                            aria-label="Close menu"
                            className="inline-flex items-center rounded-xl p-2 text-[var(--muted-strong)] hover:bg-[var(--surface-hover)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
                          >
                            <X className="size-6" aria-hidden />
                          </button>
                        </Dialog.Close>
                      </div>

                      {/* Nav */}
                      <nav aria-label="Mobile" className="flex-1 overflow-y-auto px-2 py-2">
                        <ul className="flex flex-col gap-1 text-sm font-medium text-[var(--muted)]">
                          {items.map(({ key, href, label, iconId }) => {
                            const Icon = ICONS[iconId] ?? LayoutDashboard;
                            return (
                              <li key={key}>
                                <Dialog.Close asChild>
                                  <Link
                                    href={href}
                                    locale={locale}
                                    className={cx(
                                      'group flex items-center gap-3 rounded-xl px-3 py-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]',
                                      isActive(href)
                                        ? 'bg-[var(--surface-hover)] text-[var(--accent)]'
                                        : 'hover:bg-[var(--surface-hover)] hover:text-[var(--accent)]',
                                    )}
                                  >
                                    <Icon
                                      className="size-4 text-[var(--muted-strong)] transition group-hover:text-[var(--accent)]"
                                      aria-hidden
                                    />
                                    <span className="truncate">{label}</span>
                                  </Link>
                                </Dialog.Close>
                              </li>
                            );
                          })}
                        </ul>

                        {/* Language switcher (inside the menu) */}
                        {languageLinks && languageLinks.length > 0 && (
                          <div className="mt-4 border-t border-[var(--surface-hover)] pt-2">
                            <span className="block px-3 pb-1 text-xs font-semibold uppercase tracking-wide text-[var(--muted-strong)]/70">
                              Language
                            </span>
                            <ul className="flex flex-col gap-1 text-sm font-medium text-[var(--muted)]">
                              {languageLinks.map((lang) => {
                                const isCurrent = lang.locale === locale;
                                return (
                                  <li key={lang.locale}>
                                    <Dialog.Close asChild>
                                      <Link
                                        href={lang.href}
                                        locale={lang.locale}
                                        className={cx(
                                          'block rounded-xl px-3 py-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]',
                                          isCurrent
                                            ? 'bg-[var(--surface-hover)] text-[var(--accent)]'
                                            : 'hover:bg-[var(--surface-hover)] hover:text-[var(--accent)]',
                                        )}
                                      >
                                        {lang.label}
                                      </Link>
                                    </Dialog.Close>
                                  </li>
                                );
                              })}
                            </ul>
                          </div>
                        )}
                      </nav>

                      {/* Safe-area footer (optional) */}
                      <div className="border-t border-[var(--surface-hover)] p-3 text-xs text-[var(--muted)]">
                        <span className="opacity-80">
                          © {new Date().getFullYear()} {brandLabel}
                        </span>
                      </div>
                    </motion.div>
                  </Dialog.Content>
                </>
              )}
            </AnimatePresence>
          </Dialog.Portal>
        </Dialog.Root>
      </div>
    </div>
  );
}
