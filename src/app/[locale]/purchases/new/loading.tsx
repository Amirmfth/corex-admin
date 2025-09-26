export default function LoadingNewPurchase() {
  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-sm">
        <div className="h-6 w-48 animate-pulse rounded-full bg-[var(--surface-muted)]" />
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          {Array.from({ length: 2 }).map((_, index) => (
            <div key={index} className="space-y-2">
              <div className="h-3 w-24 animate-pulse rounded-full bg-[var(--surface-muted)]" />
              <div className="h-10 animate-pulse rounded-lg bg-[var(--surface-hover)]" />
            </div>
          ))}
        </div>
      </div>
      <div className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="h-4 w-32 animate-pulse rounded-full bg-[var(--surface-muted)]" />
          <div className="h-6 w-24 animate-pulse rounded-full bg-[var(--surface-muted)]" />
        </div>
        <div className="mt-4 space-y-4">
          {Array.from({ length: 2 }).map((_, row) => (
            <div
              key={row}
              className="grid gap-4 rounded-2xl border border-[var(--border)] px-4 py-4 sm:grid-cols-[minmax(0,1fr)_120px_150px_150px_auto]"
            >
              {Array.from({ length: 4 }).map((__, col) => (
                <div key={col} className="flex flex-col gap-2">
                  <div className="h-3 w-20 animate-pulse rounded-full bg-[var(--surface-muted)]" />
                  <div className="h-10 animate-pulse rounded-lg bg-[var(--surface-hover)]" />
                </div>
              ))}
              <div className="flex items-end justify-end">
                <div className="h-8 w-20 animate-pulse rounded-full bg-[var(--surface-muted)]" />
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="flex justify-end">
        <div className="h-10 w-36 animate-pulse rounded-full bg-[var(--surface-muted)]" />
      </div>
    </div>
  );
}
