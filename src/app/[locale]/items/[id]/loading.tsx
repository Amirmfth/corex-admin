export default function LoadingItemDetail() {
  return (
    <div className="space-y-6">
      <div className="h-5 w-32 animate-pulse rounded-full bg-[var(--surface-muted)]" />
      <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        <div className="space-y-6">
          <div className="animate-pulse space-y-4 rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-sm">
            <div className="h-48 rounded-2xl bg-[var(--surface-muted)]" />
            <div className="grid gap-3 sm:grid-cols-2">
              {Array.from({ length: 4 }).map((_, index) => (
                <div key={index} className="h-12 rounded-xl bg-[var(--surface-hover)]" />
              ))}
            </div>
          </div>
          <div className="h-48 animate-pulse rounded-3xl border border-[var(--border)] bg-[var(--surface)] shadow-sm" />
          <div className="h-48 animate-pulse rounded-3xl border border-[var(--border)] bg-[var(--surface)] shadow-sm" />
        </div>
        <div className="h-64 animate-pulse rounded-3xl border border-[var(--border)] bg-[var(--surface)] shadow-sm" />
      </div>
    </div>
  );
}
