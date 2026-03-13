/** 캐릭터 분석 페이지 섹션별 Suspense fallback 스켈레톤 */

export function CharacterGridSkeleton() {
  return (
    <div className="w-full lg:w-[260px] lg:shrink-0 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]/80 p-2">
      <div className="h-8 w-full rounded bg-[var(--color-surface-2)] animate-pulse mb-2" />
      <div className="grid grid-cols-5 sm:grid-cols-6 lg:grid-cols-3 gap-1 max-h-[320px] lg:max-h-[620px] overflow-hidden">
        {Array.from({ length: 18 }).map((_, i) => (
          <div key={i} className="flex flex-col items-center gap-1 py-2">
            <div className="h-10 w-10 rounded-md bg-[var(--color-surface-2)] animate-pulse" />
            <div className="h-3 w-8 rounded bg-[var(--color-surface-2)] animate-pulse" />
          </div>
        ))}
      </div>
    </div>
  )
}

export function CharacterHeaderSkeleton() {
  return (
    <div className="flex gap-3 sm:gap-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]/80 p-3 sm:p-5 items-start">
      <div className="h-20 w-20 shrink-0 rounded-xl bg-[var(--color-surface-2)] animate-pulse" />
      <div className="flex flex-1 flex-col gap-3 min-w-0">
        <div className="flex items-center gap-2">
          <div className="h-7 w-28 rounded bg-[var(--color-surface-2)] animate-pulse" />
          <div className="h-5 w-12 rounded bg-[var(--color-surface-2)] animate-pulse" />
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-16 rounded-lg bg-[var(--color-surface-2)] animate-pulse" />
          ))}
        </div>
      </div>
    </div>
  )
}
