import type { HTMLAttributes } from 'react';

const VARIANTS = {
  default: 'bg-[var(--surface-muted)] text-[var(--muted-strong)] border border-[var(--surface-hover)]',
  warning: 'bg-amber-100 text-amber-900 border border-amber-200',
  success: 'bg-emerald-100 text-emerald-900 border border-emerald-200',
} as const;

type Variant = keyof typeof VARIANTS;

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: Variant;
}

export function Badge({ variant = 'default', className = '', ...props }: BadgeProps) {
  const variantClasses = VARIANTS[variant] ?? VARIANTS.default;

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${variantClasses} ${className}`.trim()}
      {...props}
    />
  );
}
