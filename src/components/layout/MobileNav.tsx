'use client';

import { Menu, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import type { SVGProps } from 'react';

import { Link, type AppLocale } from '../../i18n/routing';

type MobileNavItem = {
  key: string;
  href: string;
  label: string;
  icon: (props: SVGProps<SVGSVGElement>) => JSX.Element;
};

interface MobileNavProps {
  items: MobileNavItem[];
  locale: AppLocale;
  dir: 'ltr' | 'rtl';
  brandLabel: string;
  menuLabel: string;
  closeLabel: string;
}

export default function MobileNav({
  items,
  locale,
  dir,
  brandLabel,
  menuLabel,
  closeLabel,
}: MobileNavProps) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setOpen(false);
      }
    }

    if (open) {
      window.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [open]);

  useEffect(() => {
    if (!open) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  return (
    <div className="lg:hidden">
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--surface)] px-3 py-1 text-sm font-medium text-[var(--muted-strong)] shadow-sm transition hover:border-[var(--accent)] hover:text-[var(--foreground)]"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls="mobile-navigation"
      >
        <Menu className="size-4" aria-hidden />
        <span>{menuLabel}</span>
      </button>

      {open ? (
        <div
          id="mobile-navigation"
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex"
          style={{ flexDirection: dir === 'rtl' ? 'row-reverse' : 'row' }}
        >
          <button
            type="button"
            aria-label="Close menu"
            className="flex-1 bg-black/40"
            onClick={() => setOpen(false)}
          />

          <div className="flex h-full w-72 max-w-[85vw] flex-col border-s border-[var(--border)] bg-[var(--surface)] p-4 shadow-2xl">
            <div className="flex items-center justify-between pb-4">
              <span className="text-base font-semibold text-[var(--foreground)]">{brandLabel}</span>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-full border border-[var(--border)] p-1 text-[var(--muted-strong)] transition hover:border-[var(--accent)] hover:text-[var(--accent)]"
              >
                <span className="sr-only">{closeLabel}</span>
                <X className="size-4" aria-hidden />
              </button>
            </div>

            <nav aria-label="Mobile">
              <ul className="flex flex-col gap-1 text-sm font-medium text-[var(--muted)]">
                {items.map(({ key, href, label, icon: Icon }) => (
                  <li key={key}>
                    <Link
                      href={href}
                      locale={locale}
                      className="group flex items-center gap-3 rounded-xl px-3 py-2 transition hover:bg-[var(--surface-hover)] hover:text-[var(--accent)]"
                      onClick={() => setOpen(false)}
                    >
                      <Icon
                        className="size-4 text-[var(--muted-strong)] transition group-hover:text-[var(--accent)]"
                        aria-hidden
                      />
                      <span>{label}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          </div>
        </div>
      ) : null}
    </div>
  );
}
