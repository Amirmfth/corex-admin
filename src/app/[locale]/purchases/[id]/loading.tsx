export default function LoadingPurchaseDetail() {
  return (
    <div className="space-y-6">
      <div className="h-8 w-48 animate-pulse rounded-full bg-[var(--surface-muted)]" />
      <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        <div className="space-y-6">
          <div className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-sm">
            <div className="h-5 w-32 animate-pulse rounded-full bg-[var(--surface-muted)]" />
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              {Array.from({ length: 4 }).map((_, index) => (
                <div key={index} className="space-y-2">
                  <div className="h-3 w-24 animate-pulse rounded-full bg-[var(--surface-muted)]" />
                  <div className="h-4 w-32 animate-pulse rounded-full bg-[var(--surface-muted)]" />
                </div>
              ))}
            </div>
          </div>
          <div className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-sm">
            <div className="h-5 w-36 animate-pulse rounded-full bg-[var(--surface-muted)]" />
            <div className="mt-4 space-y-3">
              {Array.from({ length: 3 }).map((_, row) => (
                <div
                  key={row}
                  className="grid gap-4 rounded-2xl border border-[var(--border)] px-4 py-4 sm:grid-cols-5"
                >
                  {Array.from({ length: 5 }).map((__, col) => (
                    <div key={col} className="h-4 animate-pulse rounded-full bg-[var(--surface-muted)]" />
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="space-y-4">
          <div className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-sm">
            <div className="h-5 w-32 animate-pulse rounded-full bg-[var(--surface-muted)]" />
            <div className="mt-3 h-10 animate-pulse rounded-full bg-[var(--surface-muted)]" />
            <div className="mt-3 h-3 w-40 animate-pulse rounded-full bg-[var(--surface-muted)]" />
          </div>
          <div className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-sm">
            <div className="h-5 w-28 animate-pulse rounded-full bg-[var(--surface-muted)]" />
            <div className="mt-3 space-y-2">
              {Array.from({ length: 2 }).map((_, index) => (
                <div key={index} className="h-3 w-40 animate-pulse rounded-full bg-[var(--surface-muted)]" />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
