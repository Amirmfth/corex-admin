import type { ReactNode } from 'react';

interface KpiCardProps {
  label: ReactNode;
  value: ReactNode;
  helper?: ReactNode;
  accent?: 'default' | 'positive' | 'warning';
}

const ACCENT_CLASSES: Record<Required<KpiCardProps>['accent'], string> = {
  default: 'bg-[var(--surface)] border-[var(--surface-hover)] text-[var(--foreground)]',
  positive: 'bg-emerald-50/80 border-emerald-200 text-emerald-900',
  warning: 'bg-amber-50/80 border-amber-200 text-amber-900',
};

export default function KpiCard({ label, value, helper, accent = 'default' }: KpiCardProps) {
  const accentClasses = ACCENT_CLASSES[accent] ?? ACCENT_CLASSES.default;

  return (
    <div
      className={`flex flex-col gap-2 rounded-2xl border p-5 shadow-sm transition hover:shadow-md ${accentClasses}`.trim()}
    >
      <span className="text-sm font-semibold uppercase tracking-wide text-[var(--muted-strong)]/80">
        {label}
      </span>
      <div className="text-3xl font-semibold">{value}</div>
      {helper ? <span className="text-xs text-[var(--muted)]">{helper}</span> : null}
    </div>
  );
}
