'use client';

import { forwardRef } from 'react';

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(' ');
}

const VARIANTS: Record<string, string> = {
  default:
    'bg-[var(--accent)] text-white hover:bg-[var(--accent-hover)] focus-visible:ring-[var(--accent)] disabled:bg-[var(--surface-muted)] disabled:text-[var(--muted)]',
  secondary:
    'bg-[var(--surface-muted)] text-[var(--muted-strong)] hover:bg-[var(--surface-hover)] focus-visible:ring-[var(--border-strong)] disabled:bg-[var(--surface-muted)] disabled:text-[var(--muted)]',
  outline:
    'border border-[var(--border)] bg-[var(--surface)] text-[var(--muted-strong)] hover:border-[var(--accent)] focus-visible:ring-[var(--accent)] disabled:text-[var(--muted)]',
  ghost:
    'text-[var(--muted-strong)] hover:bg-[var(--surface-muted)] focus-visible:ring-[var(--border-strong)] disabled:text-[var(--muted)]',
};

const SIZES: Record<string, string> = {
  md: 'px-4 py-2 text-sm',
  sm: 'px-3 py-1.5 text-xs',
};

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: keyof typeof VARIANTS;
  size?: keyof typeof SIZES;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { className, variant = 'default', size = 'md', type = 'button', ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      className={cx(
        'inline-flex items-center justify-center gap-2 rounded-lg font-medium transition focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--surface)] disabled:cursor-not-allowed',
        VARIANTS[variant] ?? VARIANTS.default,
        SIZES[size] ?? SIZES.md,
        className,
      )}
      {...props}
    />
  );
});
