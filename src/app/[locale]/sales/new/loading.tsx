export default function LoadingNewSale() {
  return (
    <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
      <div className="space-y-6">
        <div className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-sm">
          <div className="h-6 w-40 animate-pulse rounded-full bg-[var(--surface-muted)]" />
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            {Array.from({ length: 2 }).map((_, index) => (
              <div key={index} className="space-y-2">
                <div className="h-4 w-32 animate-pulse rounded-full bg-[var(--surface-muted)]" />
                <div className="h-10 animate-pulse rounded-lg bg-[var(--surface-hover)]" />
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-sm">
          <div className="h-4 w-48 animate-pulse rounded-full bg-[var(--surface-muted)]" />
          <div className="mt-4 h-10 animate-pulse rounded-full bg-[var(--surface-hover)]" />
          <ul className="mt-4 space-y-3">
            {Array.from({ length: 3 }).map((_, index) => (
              <li
                key={index}
                className="flex items-center justify-between gap-4 rounded-2xl border border-[var(--border)] px-4 py-3"
              >
                <div className="flex items-center gap-3">
                  <div className="size-12 animate-pulse rounded-xl bg-[var(--surface-hover)]" />
                  <div className="space-y-2">
                    <div className="h-3 w-32 animate-pulse rounded-full bg-[var(--surface-muted)]" />
                    <div className="h-3 w-24 animate-pulse rounded-full bg-[var(--surface-muted)]" />
                  </div>
                </div>
                <div className="h-7 w-20 animate-pulse rounded-full bg-[var(--surface-muted)]" />
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-sm">
          <div className="h-4 w-36 animate-pulse rounded-full bg-[var(--surface-muted)]" />
          <ul className="mt-4 space-y-3">
            {Array.from({ length: 2 }).map((_, index) => (
              <li key={index} className="space-y-3 rounded-2xl border border-[var(--border)] px-4 py-3">
                <div className="h-4 w-40 animate-pulse rounded-full bg-[var(--surface-muted)]" />
                <div className="h-10 animate-pulse rounded-lg bg-[var(--surface-hover)]" />
              </li>
            ))}
          </ul>
        </div>

        <div className="flex justify-end">
          <div className="h-10 w-32 animate-pulse rounded-full bg-[var(--surface-muted)]" />
        </div>
      </div>

      <aside className="space-y-6">
        <div className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-sm">
          <div className="h-4 w-32 animate-pulse rounded-full bg-[var(--surface-muted)]" />
          <div className="mt-3 h-8 animate-pulse rounded-full bg-[var(--surface-muted)]" />
        </div>
      </aside>
    </div>
  );
}
