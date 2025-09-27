import type { ReactNode } from 'react';

function SkeletonBlock({ className }: { className?: string }) {
  return <div className={`animate-pulse rounded bg-[var(--surface-hover)] ${className ?? ''}`.trim()} />;
}

export function KpiSectionSkeleton() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {Array.from({ length: 4 }).map((_, index) => (
        <div
          key={`kpi-skeleton-${index}`}
          className="flex flex-col gap-3 rounded-2xl border border-[var(--surface-hover)] bg-white/70 p-5 shadow-sm"
        >
          <SkeletonBlock className="h-3 w-20" />
          <SkeletonBlock className="h-8 w-28" />
          <SkeletonBlock className="h-3 w-32" />
        </div>
      ))}
    </div>
  );
}

export function ChartsSectionSkeleton({ badge }: { badge: ReactNode }) {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <div className="flex flex-col gap-3 rounded-2xl border border-[var(--surface-hover)] bg-white/70 p-5 shadow-sm">
        <div className="flex items-center justify-between">
          <SkeletonBlock className="h-5 w-36" />
          {badge}
        </div>
        <div className="flex flex-col gap-3">
          <SkeletonBlock className="h-40 w-full" />
        </div>
      </div>
      <div className="flex flex-col gap-3 rounded-2xl border border-[var(--surface-hover)] bg-white/70 p-5 shadow-sm">
        <SkeletonBlock className="h-5 w-48" />
        <SkeletonBlock className="h-40 w-full" />
      </div>
    </div>
  );
}

export function AlertsSectionSkeleton() {
  return (
    <div className="rounded-2xl border border-[var(--surface-hover)] bg-white/80 p-5 shadow-sm">
      <div className="flex flex-col gap-2">
        <SkeletonBlock className="h-5 w-32" />
        <SkeletonBlock className="h-3 w-56" />
      </div>
      <div className="mt-5 grid gap-4 lg:grid-cols-3">
        {Array.from({ length: 3 }).map((_, index) => (
          <div
            key={`alerts-skeleton-${index}`}
            className="flex flex-col gap-3 rounded-2xl border border-[var(--surface-hover)] bg-white/70 p-4"
          >
            <SkeletonBlock className="h-4 w-36" />
            <SkeletonBlock className="h-3 w-48" />
            <div className="space-y-2">
              {Array.from({ length: 2 }).map((__, row) => (
                <div
                  key={`alerts-skeleton-row-${index}-${row}`}
                  className="flex flex-col gap-2 rounded-xl border border-[var(--surface-hover)] bg-white/80 p-3"
                >
                  <SkeletonBlock className="h-4 w-28" />
                  <SkeletonBlock className="h-3 w-20" />
                  <SkeletonBlock className="h-3 w-24" />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function ListsSectionSkeleton() {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {Array.from({ length: 2 }).map((_, index) => (
        <div
          key={`list-panel-skeleton-${index}`}
          className="flex flex-col gap-4 rounded-2xl border border-[var(--surface-hover)] bg-white/70 p-5 shadow-sm"
        >
          <div className="flex flex-col gap-2">
            <SkeletonBlock className="h-5 w-44" />
            <SkeletonBlock className="h-3 w-56" />
          </div>
          <div className="flex flex-col gap-3">
            {Array.from({ length: 3 }).map((__, rowIndex) => (
              <div
                key={`list-row-skeleton-${index}-${rowIndex}`}
                className="flex flex-col gap-2 rounded-xl border border-[var(--surface-hover)] p-3"
              >
                <SkeletonBlock className="h-4 w-32" />
                <SkeletonBlock className="h-3 w-24" />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
