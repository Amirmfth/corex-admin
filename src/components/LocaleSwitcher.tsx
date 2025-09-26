'use client';

import { useLocale } from 'next-intl';
import type { ComponentPropsWithoutRef } from 'react';

import { Link, routing, usePathname } from '../../i18n/routing';

type LocaleSwitcherProps = ComponentPropsWithoutRef<'div'> & {
  compact?: boolean;
};

export default function LocaleSwitcher({
  className = '',
  compact = true,
  ...rest
}: LocaleSwitcherProps) {
  const activeLocale = useLocale();
  const pathname = usePathname();

  return (
    <div className={`flex items-center gap-2 ${className}`.trim()} {...rest}>
      {routing.locales.map((locale) => {
        const isActive = locale === activeLocale;
        return (
          <Link
            key={locale}
            href={pathname}
            locale={locale}
            className={`rounded-full border px-3 py-1 text-sm font-medium transition ${
              isActive
                ? 'border-transparent bg-[var(--accent)] text-[var(--accent-foreground)] shadow-[0_8px_20px_var(--shadow-color)]'
                : 'border-[var(--border)] bg-[var(--surface)] text-[var(--muted)] hover:border-[var(--accent)] hover:text-[var(--accent)]'
            }`}
            aria-current={isActive ? 'true' : undefined}
          >
            {compact ? locale.toUpperCase() : locale === 'fa' ? 'فارسی' : 'English'}
          </Link>
        );
      })}
    </div>
  );
}
