export default function LoadingItems() {
  return (
    <div className="space-y-6">
      <div className="animate-pulse space-y-4 rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-sm">
        <div className="h-6 w-40 rounded-full bg-[var(--surface-muted)]" />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="h-10 rounded-full bg-[var(--surface-muted)]" />
          ))}
        </div>
      </div>
      <div className="overflow-hidden rounded-3xl border border-[var(--border)] bg-[var(--surface)] shadow-sm">
        <div className="animate-pulse">
          <div className="h-14 bg-[var(--surface-hover)]" />
          {Array.from({ length: 6 }).map((_, index) => (
            <div key={index} className="h-16 border-t border-neutral-100 bg-[var(--surface-muted)]" />
          ))}
        </div>
      </div>
    </div>
  );
}
