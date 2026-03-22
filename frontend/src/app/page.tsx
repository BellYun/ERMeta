import type { Metadata } from "next"
import { Suspense } from "react"
import { GlobalFilter } from "@/components/features/GlobalFilter"
import { TierRankingTable } from "@/components/features/TierRankingTable"
import { HoneyPicksSection } from "@/components/features/HoneyPicksSection"
import { FilterProvider } from "@/components/features/FilterContext"
import { getPatches } from "@/lib/getPatches"
import { fetchRankingData } from "@/lib/ranking"
import { fetchHoneyPicksServer } from "@/lib/honeyPicks"

export const metadata: Metadata = {
  title: { absolute: "메타분석 | 이리와지지" },
  description: "이터널리턴 최신 패치 기준 캐릭터 티어, 픽률, 승률, 평균 RP 통계. 다이아~상위 1000위 데이터 기반 실시간 메타 분석.",
  keywords: ["이리와지지", "이리와GG", "ERGG", "이터널리턴 티어표", "이터널리턴 메타", "이터널리턴 캐릭터 순위", "이터널리턴 승률", "이터널리턴 픽률"],
  openGraph: {
    title: "메타 분석 | 이리와지지 ER&GG",
    description: "이터널리턴 최신 패치 기준 캐릭터 티어, 픽률, 승률, 평균 RP 통계.",
    url: "/",
  },
  twitter: {
    title: "메타 분석 | 이리와지지 ER&GG",
    description: "이터널리턴 최신 패치 기준 캐릭터 티어, 픽률, 승률, 평균 RP 통계.",
  },
  alternates: { canonical: "/" },
}

/* ─── Skeleton Fallbacks ─── */

function HoneyPicksSkeleton() {
  return (
    <div className="flex gap-3 overflow-hidden">
      {Array.from({ length: 5 }).map((_, i) => (
        <div
          key={i}
          className="flex-shrink-0 w-36 sm:w-44 h-48 sm:h-56 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] animate-pulse"
        />
      ))}
    </div>
  )
}

function TierRankingSkeleton() {
  return (
    <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] overflow-hidden">
      {/* 테이블 헤더 */}
      <div className="flex items-center gap-4 px-4 py-3 border-b border-[var(--color-border)]">
        <div className="h-4 w-8 rounded bg-[var(--color-surface-2)] animate-pulse" />
        <div className="h-4 w-24 rounded bg-[var(--color-surface-2)] animate-pulse" />
        <div className="h-4 w-16 rounded bg-[var(--color-surface-2)] animate-pulse ml-auto" />
        <div className="h-4 w-16 rounded bg-[var(--color-surface-2)] animate-pulse" />
        <div className="h-4 w-16 rounded bg-[var(--color-surface-2)] animate-pulse" />
      </div>
      {/* 테이블 행 */}
      {Array.from({ length: 10 }).map((_, i) => (
        <div
          key={i}
          className="flex items-center gap-4 px-4 py-3 border-b border-[var(--color-border)] last:border-b-0"
        >
          <div className="h-4 w-6 rounded bg-[var(--color-surface-2)] animate-pulse" />
          <div className="h-8 w-8 rounded-full bg-[var(--color-surface-2)] animate-pulse" />
          <div className="h-4 w-20 rounded bg-[var(--color-surface-2)] animate-pulse" />
          <div className="h-5 w-10 rounded-full bg-[var(--color-surface-2)] animate-pulse ml-auto" />
          <div className="h-4 w-14 rounded bg-[var(--color-surface-2)] animate-pulse" />
          <div className="h-4 w-14 rounded bg-[var(--color-surface-2)] animate-pulse" />
        </div>
      ))}
    </div>
  )
}

/* ─── 독립 Async Server Components (각자 fetch → 준비되는 즉시 스트리밍) ─── */

async function HoneyPicksStream({ patch, tier }: { patch: string; tier: string }) {
  if (!patch) return null
  const data = await fetchHoneyPicksServer(patch, tier)
  return (
    <HoneyPicksSection
      initialData={data.picks}
      initialPatchVersion={data.patchVersion}
    />
  )
}

async function TierRankingStream({ patch, tier }: { patch: string; tier: string }) {
  if (!patch) return null
  const data = await fetchRankingData(patch, tier)
  return <TierRankingTable initialData={data} />
}

/* ─── Page ─── */

export default async function Home() {
  // 패치 목록만 await (경량 쿼리, ~100ms)
  // React.cache()로 래핑되어 하위 SC에서 재호출해도 중복 없음
  const patches = await getPatches()
  const defaultPatch = patches[0] ?? ""
  const defaultTier = "MITHRIL"

  return (
    <FilterProvider initialPatches={patches}>
      <div className="flex flex-col gap-4 sm:gap-6">
        {/* 히어로 섹션 — 즉시 렌더링 (정적) */}
        <section className="text-center py-2 sm:py-4">
          <h1 className="text-xl sm:text-3xl font-bold text-[var(--color-foreground)]">
            이터널리턴 실시간 메타 분석
          </h1>
          <p className="mt-1 sm:mt-1.5 text-xs sm:text-sm text-[var(--color-muted-foreground)]">
            패치 {defaultPatch} 기준 · 다이아 이상 400,000+판 분석
          </p>
        </section>

        {/* 꿀챔 TOP 5 — 독립 스트리밍 (Supabase 직접 쿼리, API 홉 제거) */}
        <section className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <div className="h-4 w-1 rounded-full bg-[var(--color-accent-gold)]" />
            <h2 className="text-sm font-semibold text-[var(--color-foreground)]">
              이번 패치 떡상 TOP 5
            </h2>
          </div>
          <Suspense fallback={<HoneyPicksSkeleton />}>
            <HoneyPicksStream patch={defaultPatch} tier={defaultTier} />
          </Suspense>
        </section>

        {/* 필터 — 즉시 렌더링 (Client Component) */}
        <Suspense>
          <GlobalFilter />
        </Suspense>

        {/* 티어 랭킹 — 독립 스트리밍 (준비되는 즉시 표시) */}
        <Suspense fallback={<TierRankingSkeleton />}>
          <TierRankingStream patch={defaultPatch} tier={defaultTier} />
        </Suspense>
      </div>
    </FilterProvider>
  )
}
