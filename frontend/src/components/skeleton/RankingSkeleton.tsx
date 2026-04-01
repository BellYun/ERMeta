export function RankingSkeleton() {
  return (
    <div className="flex flex-col gap-3">
      {/* Role filter pills */}
      <div className="flex gap-1.5 pb-1">
        {Array.from({ length: 7 }).map((_, i) => (
          <div key={i} className="h-7 rounded-full bg-[var(--color-surface)] animate-pulse" style={{ width: i === 0 ? 48 : 64 }} />
        ))}
      </div>
      {/* Table */}
      <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] overflow-hidden">
        {/* Desktop */}
        <div className="hidden sm:block">
          <div className="h-10 border-b border-[var(--color-border)] bg-[var(--color-surface-2)]/50" />
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className="flex items-center gap-2.5 px-3 py-2.5 border-b border-[var(--color-border)]/30 last:border-b-0">
              <div className="h-4 w-5 rounded bg-[var(--color-surface-2)] animate-pulse" />
              <div className="h-6 w-6 rounded bg-[var(--color-surface-2)] animate-pulse" />
              <div className="h-8 w-8 rounded-lg bg-[var(--color-surface-2)] animate-pulse" />
              <div className="flex-1 flex flex-col gap-1">
                <div className="h-4 w-24 rounded bg-[var(--color-surface-2)] animate-pulse" />
                <div className="h-3 w-16 rounded bg-[var(--color-surface-2)] animate-pulse" />
              </div>
              <div className="h-4 w-12 rounded bg-[var(--color-surface-2)] animate-pulse" />
              <div className="h-4 w-12 rounded bg-[var(--color-surface-2)] animate-pulse" />
              <div className="h-4 w-14 rounded bg-[var(--color-surface-2)] animate-pulse" />
            </div>
          ))}
        </div>
        {/* Mobile */}
        <div className="sm:hidden">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="flex items-center gap-2.5 px-3 py-2.5 border-b border-[var(--color-border)]/30 last:border-b-0">
              <div className="h-4 w-5 rounded bg-[var(--color-surface-2)] animate-pulse shrink-0" />
              <div className="h-5 w-5 rounded bg-[var(--color-surface-2)] animate-pulse shrink-0" />
              <div className="h-9 w-9 rounded-lg bg-[var(--color-surface-2)] animate-pulse shrink-0" />
              <div className="flex-1 flex flex-col gap-1">
                <div className="h-3.5 w-20 rounded bg-[var(--color-surface-2)] animate-pulse" />
                <div className="h-3 w-14 rounded bg-[var(--color-surface-2)] animate-pulse" />
              </div>
              <div className="flex flex-col items-end gap-1">
                <div className="h-3.5 w-10 rounded bg-[var(--color-surface-2)] animate-pulse" />
                <div className="h-3 w-12 rounded bg-[var(--color-surface-2)] animate-pulse" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
