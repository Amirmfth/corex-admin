export default function LoadingReports() {
  return (
    <div className="space-y-6">
      <div className="h-8 w-48 animate-pulse rounded-full bg-[var(--surface-muted)]" />
      <div className="grid gap-4 lg:grid-cols-3">
        {Array.from({ length: 3 }).map((_, index) => (
          <div key={index} className="h-32 animate-pulse rounded-3xl border border-[var(--border)] bg-[var(--surface)] shadow-sm" />
        ))}
      </div>
      <div className="h-64 animate-pulse rounded-3xl border border-[var(--border)] bg-[var(--surface)] shadow-sm" />
      <div className="h-64 animate-pulse rounded-3xl border border-[var(--border)] bg-[var(--surface)] shadow-sm" />
    </div>
  );
}
