import type { Metadata } from "next"
import { Suspense } from "react"
import { GlobalFilter } from "@/components/features/GlobalFilter"
import { TierRankingTable } from "@/components/features/TierRankingTable"
import { HoneyPicksSection } from "@/components/features/HoneyPicksSection"
import { FilterProvider } from "@/components/features/FilterContext"
import { SectionErrorBoundary } from "@/components/features/SectionErrorBoundary"
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

/* ─── Skeletons ─── */

function HoneyPicksSkeleton() {
  return (
    <>
      {/* Desktop */}
      <div className="hidden sm:flex gap-3 items-stretch" style={{ minHeight: 340 }}>
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex-1 rounded-2xl bg-[var(--color-surface)] animate-pulse" />
        ))}
      </div>
      {/* Mobile */}
      <div className="sm:hidden grid grid-cols-2 gap-2.5">
        <div className="col-span-2 rounded-xl bg-[var(--color-surface)] animate-pulse" style={{ aspectRatio: "16/9" }} />
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-xl bg-[var(--color-surface)] animate-pulse" style={{ aspectRatio: "3/4" }} />
        ))}
      </div>
    </>
  )
}

function RankingSkeleton() {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
      {Array.from({ length: 15 }).map((_, i) => (
        <div key={i} className="aspect-[3/4] rounded-xl bg-[var(--color-surface)] animate-pulse" />
      ))}
    </div>
  )
}

/* ─── Async Streams ─── */

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
      {/* ── Hero Zone ── */}
      <section className="hero-gradient -mx-3 sm:-mx-4 -mt-4 sm:-mt-5 px-3 sm:px-4 pt-5 sm:pt-8 pb-6 sm:pb-8 relative">
        <div className="max-w-6xl mx-auto">
          {/* Title + Live badge */}
          <div className="reveal flex flex-col gap-4 sm:gap-6">
            <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[var(--color-success)] opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-[var(--color-success)]" />
                  </span>
                  <span className="text-[10px] sm:text-[11px] font-semibold text-[var(--color-success)] uppercase tracking-[0.15em]">
                    Live
                  </span>
                  <span className="text-[10px] sm:text-[11px] text-[var(--color-muted-foreground)]">
                    패치 {defaultPatch}
                  </span>
                </div>
                <h1 className="text-[28px] sm:text-4xl font-black tracking-tight text-[var(--color-foreground)] leading-none">
                  메타 분석
                </h1>
                <p className="text-xs sm:text-sm text-[var(--color-muted-foreground)] mt-1.5">
                  <span className="text-[var(--color-accent-gold)] font-semibold">400,000+</span>판
                  데이터 기반 실시간 분석
                </p>
              </div>

              <div className="reveal reveal-d2">
                <Suspense>
                  <GlobalFilter />
                </Suspense>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom edge */}
        <div className="absolute bottom-0 inset-x-0 section-divider" />
      </section>

      <div className="flex flex-col gap-10 sm:gap-14 mt-6 sm:mt-10">
        {/* ── Honey Picks ── */}
        <section className="reveal reveal-d3">
          <div className="flex items-center gap-3 mb-4 sm:mb-5">
            <div className="flex items-center gap-2">
              <span className="text-lg">&#x1F4C8;</span>
              <h2 className="text-base sm:text-lg font-bold text-[var(--color-foreground)]">
                이번 패치 떡상
              </h2>
            </div>
            <span className="text-[11px] text-[var(--color-muted-foreground)] hidden sm:inline">
              버프 후 픽률 &amp; 승률 동반 상승 캐릭터
            </span>
            <div className="flex-1" />
          </div>

          <SectionErrorBoundary sectionName="이번 패치 떡상">
            <Suspense fallback={<HoneyPicksSkeleton />}>
              <HoneyPicksStream patch={defaultPatch} tier={defaultTier} />
            </Suspense>
          </SectionErrorBoundary>
        </section>

        {/* ── Divider ── */}
        <div className="section-divider" />

        {/* ── Tier Rankings ── */}
        <section className="reveal reveal-d5">
          <div className="flex items-center gap-3 mb-4 sm:mb-5">
            <h2 className="text-base sm:text-lg font-bold text-[var(--color-foreground)]">
              캐릭터 순위
            </h2>
            <span className="text-[11px] text-[var(--color-muted-foreground)] hidden sm:inline">
              메타 스코어 기반 종합 순위
            </span>
          </div>

          <SectionErrorBoundary sectionName="캐릭터 순위">
            <Suspense fallback={<RankingSkeleton />}>
              <TierRankingStream patch={defaultPatch} tier={defaultTier} />
            </Suspense>
          </SectionErrorBoundary>
        </section>
      </div>
    </FilterProvider>
  )
}
