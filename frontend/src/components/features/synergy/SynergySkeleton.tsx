/** 시너지 페이지 섹션별 Suspense fallback 스켈레톤 */

export function FocusPoolSkeleton() {
  return (
    <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]/80 overflow-hidden">
      <div className="flex items-center justify-between px-3 py-2.5">
        <div className="h-4 w-24 rounded bg-[var(--color-surface-2)] animate-pulse" />
        <div className="h-4 w-4 rounded bg-[var(--color-surface-2)] animate-pulse" />
      </div>
    </div>
  );
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
  );
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
  );
}

/**
 * Iter6: SynergyDetailInteractive 전용 통합 스켈레톤.
 * 단일 dynamic import의 loading fallback — 3개 섹션이 동시에 로드되므로
 * 레이아웃과 섹션 제목/번호/gap을 실제와 동일하게 유지해 CLS 방지.
 */
export function SynergyDetailInteractiveSkeleton() {
  return (
    <div className="flex flex-col gap-5 sm:gap-6 mt-5 sm:mt-7">
      <section>
        <div className="flex items-center gap-2 mb-2.5">
          <span className="flex items-center justify-center h-5 w-5 rounded-md bg-[var(--color-accent-purple)]/15 text-[10px] font-bold text-[var(--color-accent-purple)]">
            1
          </span>
          <h2 className="text-sm font-bold text-[var(--color-foreground)]">내 캐릭터 풀</h2>
          <span className="text-[10px] text-[var(--color-muted-foreground)]">
            선택사항 · 캐릭터+무기 단위 필터링
          </span>
        </div>
        <FocusPoolSkeleton />
      </section>

      <div className="flex flex-col lg:flex-row gap-4 lg:gap-6">
        <section className="w-full lg:w-[340px] shrink-0">
          <div className="flex items-center gap-2 mb-2.5">
            <span className="flex items-center justify-center h-5 w-5 rounded-md bg-[var(--color-primary)]/15 text-[10px] font-bold text-[var(--color-primary)]">
              2
            </span>
            <h2 className="text-sm font-bold text-[var(--color-foreground)]">아군 선택</h2>
          </div>
          <AllySelectorSkeleton />
        </section>

        <section className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2.5">
            <span className="flex items-center justify-center h-5 w-5 rounded-md bg-[var(--color-accent-gold)]/15 text-[10px] font-bold text-[var(--color-accent-gold)]">
              3
            </span>
            <h2 className="text-sm font-bold text-[var(--color-foreground)]">추천 조합</h2>
          </div>
          <ResultSkeleton />
        </section>
      </div>
    </div>
  );
}
