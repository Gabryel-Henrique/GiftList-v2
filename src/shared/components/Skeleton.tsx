// Shimmering placeholders shown while a screen loads, shaped roughly like
// what's coming so the layout doesn't jump when the data arrives.

export function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`skeleton ${className}`} aria-hidden="true" />;
}

// A list of rows (bills, expenses, income...).
export function ListSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-3" role="status" aria-label="Carregando">
      {Array.from({ length: rows }, (_, i) => (
        <div
          key={i}
          className="flex items-center gap-3 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4"
        >
          <Skeleton className="w-5 h-5 shrink-0 !rounded-md" />
          <div className="flex-1 min-w-0 space-y-2">
            <Skeleton className="h-3.5 w-2/3 max-w-[220px]" />
            <Skeleton className="h-2.5 w-1/3 max-w-[120px]" />
          </div>
          <Skeleton className="h-4 w-20 shrink-0" />
        </div>
      ))}
    </div>
  );
}

// A grid of cards (cards, categories, cofrinhos...).
export function CardGridSkeleton({ cards = 3 }: { cards?: number }) {
  return (
    <div
      className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
      role="status"
      aria-label="Carregando"
    >
      {Array.from({ length: cards }, (_, i) => (
        <div
          key={i}
          className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 space-y-3"
        >
          <Skeleton className="h-3.5 w-1/2" />
          <Skeleton className="h-7 w-2/3" />
          <Skeleton className="h-2.5 w-full" />
        </div>
      ))}
    </div>
  );
}

// The dashboard: three summary cards, then two bigger panels.
export function DashboardSkeleton() {
  return (
    <div role="status" aria-label="Carregando">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 space-y-3"
          >
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-7 w-32" />
          </div>
        ))}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {[0, 1].map((i) => (
          <div
            key={i}
            className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6"
          >
            <Skeleton className="h-3.5 w-40 mb-6" />
            <Skeleton className="h-40 w-full !rounded-xl" />
          </div>
        ))}
      </div>
    </div>
  );
}

// Generic page placeholder, used while a screen's code is still downloading.
export function PageSkeleton() {
  return (
    <div role="status" aria-label="Carregando">
      <Skeleton className="h-7 w-48 mb-2" />
      <Skeleton className="h-3.5 w-64 max-w-full mb-8" />
      <ListSkeleton rows={4} />
    </div>
  );
}
