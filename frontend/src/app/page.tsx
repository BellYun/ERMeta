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
    <div className="flex gap-2 overflow-hidden">
      {Array.from({ length: 5 }).map((_, i) => (
        <div
          key={i}
          className="flex-shrink-0 w-36 sm:w-44 aspect-[4/5] rounded-xl bg-[var(--color-surface)] animate-pulse"
        />
      ))}
    </div>
  )
}

function TierRankingSkeleton() {
  return (
    <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-[var(--color-border)]">
        <div className="h-4 w-20 rounded bg-[var(--color-surface-3)] animate-pulse" />
        <div className="h-8 w-20 rounded-lg bg-[var(--color-surface-3)] animate-pulse" />
      </div>
      {Array.from({ length: 10 }).map((_, i) => (
        <div
          key={i}
          className="flex items-center gap-3 px-4 py-2.5 border-b border-[var(--color-border)]/40 last:border-b-0"
        >
          <div className="h-4 w-5 rounded bg-[var(--color-surface-3)] animate-pulse" />
          <div className="h-5 w-5 rounded bg-[var(--color-surface-3)] animate-pulse" />
          <div className="h-8 w-8 rounded-lg bg-[var(--color-surface-3)] animate-pulse" />
          <div className="h-4 w-20 rounded bg-[var(--color-surface-3)] animate-pulse" />
          <div className="h-4 w-12 rounded bg-[var(--color-surface-3)] animate-pulse ml-auto" />
          <div className="h-4 w-12 rounded bg-[var(--color-surface-3)] animate-pulse" />
        </div>
      ))}
    </div>
  )
}

/* ─── Async Server Components ─── */

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
  const patches = await getPatches()
  const defaultPatch = patches[0] ?? ""
  const defaultTier = "MITHRIL"

  return (
    <FilterProvider initialPatches={patches}>
      <div className="flex flex-col gap-5 sm:gap-6">
        {/* Honey Picks TOP 5 */}
        <section className="flex flex-col gap-2">
          <h2 className="text-sm font-semibold text-[var(--color-foreground)] flex items-center gap-2">
            <span className="inline-block h-3.5 w-0.5 rounded-full bg-[var(--color-accent-gold)]" />
            이번 패치 떡상 TOP 5
          </h2>
          <Suspense fallback={<HoneyPicksSkeleton />}>
            <HoneyPicksStream patch={defaultPatch} tier={defaultTier} />
          </Suspense>
        </section>

        {/* Title + Filter + Tier Ranking */}
        <div className="flex flex-col gap-3">
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-2">
            <div>
              <h1 className="text-lg sm:text-xl font-bold text-[var(--color-foreground)]">
                메타 분석
              </h1>
              <p className="text-xs text-[var(--color-muted-foreground)] mt-0.5">
                패치 {defaultPatch} · 400,000+판 데이터 기반
              </p>
            </div>
            <Suspense>
              <GlobalFilter />
            </Suspense>
          </div>

          <Suspense fallback={<TierRankingSkeleton />}>
            <TierRankingStream patch={defaultPatch} tier={defaultTier} />
          </Suspense>
        </div>
      </div>
    </FilterProvider>
  )
}
