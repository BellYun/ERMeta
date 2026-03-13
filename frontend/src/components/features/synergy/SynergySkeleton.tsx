/** 시너지 페이지 섹션별 Suspense fallback 스켈레톤 */

export function FocusPoolSkeleton() {
  return (
    <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]/80 overflow-hidden">
      <div className="flex items-center justify-between px-3 py-2.5">
        <div className="h-4 w-24 rounded bg-[var(--color-surface-2)] animate-pulse" />
        <div className="h-4 w-4 rounded bg-[var(--color-surface-2)] animate-pulse" />
      </div>
    </div>
  )
}

export function AllySelectorSkeleton() {
  return (
    <>
      <div className="flex gap-3">
        {[0, 1].map((i) => (
          <div
            key={i}
            className="h-16 w-28 rounded-xl border border-dashed border-[var(--color-border)] bg-[var(--color-surface-2)] animate-pulse"
          />
        ))}
      </div>
      <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]/80 p-2">
        <div className="h-4 w-28 rounded bg-[var(--color-surface-2)] animate-pulse mb-2 ml-1" />
        <div className="h-8 w-full rounded-md bg-[var(--color-surface-2)] animate-pulse mb-2" />
        <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 gap-1">
          {Array.from({ length: 20 }).map((_, i) => (
            <div key={i} className="flex flex-col items-center gap-1 py-2">
              <div className="h-10 w-10 rounded-md bg-[var(--color-surface-2)] animate-pulse" />
              <div className="h-3 w-8 rounded bg-[var(--color-surface-2)] animate-pulse" />
            </div>
          ))}
        </div>
      </div>
    </>
  )
}

export function ResultSkeleton() {
  return (
    <div className="flex flex-col gap-2">
      {Array.from({ length: 5 }).map((_, i) => (
        <div
          key={i}
          className="h-14 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]/80 animate-pulse"
        />
      ))}
    </div>
  )
}
