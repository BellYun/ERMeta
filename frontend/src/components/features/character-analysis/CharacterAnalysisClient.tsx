"use client"

import * as React from "react"
import { Suspense } from "react"
import { BarChart2, ChevronRight, FileText, Loader2, Search, Users, Zap } from "lucide-react"
import { useRouter } from "next/navigation"
import { getCharacterName } from "@/lib/characterMap"
import { resolveWeaponName } from "@/lib/weaponMap"
import { cn } from "@/lib/utils"
import { TierGroup } from "@/utils/tier"
import type { CharacterStatsResponse } from "@/app/api/character/stats/[characterCode]/route"

import dynamic from "next/dynamic"
import { CHARACTER_CODES } from "./constants"
import { assignCharTier, fetchStats } from "./utils"
import { CharacterHeader } from "./CharacterHeader"

// CharacterGrid: 사이드바는 LCP 경로 밖 → SSR 스킵하여 초기 JS 번들 축소
const CharacterGrid = dynamic(
  () => import("./CharacterGrid").then((m) => ({ default: m.CharacterGrid })),
  {
    ssr: false,
    loading: () => (
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
    ),
  }
)

// 탭 콘텐츠: lazy import (코드 스플릿)
const PatchComparisonTab = React.lazy(() =>
  import("./PatchComparisonTab").then((m) => ({ default: m.PatchComparisonTab }))
)
const PatchLogTab = React.lazy(() =>
  import("./PatchLogTab").then((m) => ({ default: m.PatchLogTab }))
)
const CharacterDetailedAnalyzer = React.lazy(() =>
  import("@/components/character/CharacterDetailedAnalyzer").then((m) => ({ default: m.CharacterDetailedAnalyzer }))
)

function TabFallback() {
  return (
    <div className="flex items-center justify-center py-16">
      <Loader2 className="h-6 w-6 animate-spin text-[var(--color-primary)]" />
    </div>
  )
}


interface CharacterAnalysisClientProps {
  initialPatches?: string[]
  initialStats?: CharacterStatsResponse | null
  initialPrevStats?: CharacterStatsResponse | null
  initialCode?: number
  initialWeapon?: number | null
}

export function CharacterAnalysisClient({
  initialPatches,
  initialStats,
  initialPrevStats,
  initialCode,
  initialWeapon,
}: CharacterAnalysisClientProps) {
  const router = useRouter()

  const startCode = initialCode ?? 1

  const [selectedCode, setSelectedCode] = React.useState<number>(startCode)
  const [selectedTier, setSelectedTier] = React.useState<TierGroup>(TierGroup.MITHRIL)
  const [selectedWeapon, setSelectedWeapon] = React.useState<number | null>(() => {
    // URL의 weapon 파라미터 우선
    if (initialWeapon != null) return initialWeapon
    if (initialStats?.weapons && initialStats.weapons.length > 0) {
      return initialStats.weapons[0].bestWeapon ?? null
    }
    return null
  })
  const [searchQuery, setSearchQuery] = React.useState("")
  const searchTimerRef = React.useRef<ReturnType<typeof setTimeout>>(null)
  const selectedRef = React.useRef<HTMLButtonElement>(null)

  // 무기 변경 시 URL 파라미터 동기화 (Next.js 리렌더 방지를 위해 history API 직접 사용)
  const handleWeaponChange = React.useCallback((weapon: number | null) => {
    setSelectedWeapon(weapon)
    const url = new URL(window.location.href)
    if (weapon != null) {
      url.searchParams.set("weapon", String(weapon))
    } else {
      url.searchParams.delete("weapon")
    }
    window.history.replaceState(null, "", url.pathname + url.search)
  }, [])

  const deferredSearch = React.useDeferredValue(searchQuery)

  const filteredCodes = React.useMemo(() => {
    const sorted = [...CHARACTER_CODES].sort((a, b) =>
      getCharacterName(a).localeCompare(getCharacterName(b), "ko")
    )
    const q = deferredSearch.trim()
    if (!q) return sorted
    return sorted.filter((code) => getCharacterName(code).includes(q))
  }, [deferredSearch])

  const [patches, setPatches] = React.useState<string[]>(initialPatches ?? [])
  const [allPatchStats, setAllPatchStats] = React.useState<(CharacterStatsResponse | null)[]>(() => {
    if (!initialPatches?.length) return []
    const initial: (CharacterStatsResponse | null)[] = Array(initialPatches.length).fill(null)
    if (initialStats) initial[0] = initialStats
    if (initialPrevStats) initial[1] = initialPrevStats
    return initial
  })
  const [stats, setStats] = React.useState<CharacterStatsResponse | null>(initialStats ?? null)
  const [previousStats, setPreviousStats] = React.useState<CharacterStatsResponse | null>(initialPrevStats ?? null)
  const [loading, setLoading] = React.useState(false)

  // Ranking stats for character grid overlay (tier badge + win rate)
  const [rankingStatsMap, setRankingStatsMap] = React.useState<Map<number, { tier: string; winRate: number }>>(new Map())

  React.useEffect(() => {
    const patch = patches[0]
    if (!patch) return
    fetch(`/api/character/mithril-rp-ranking?patchVersion=${encodeURIComponent(patch)}&tier=MITHRIL`)
      .then((r) => r.json())
      .then((data) => {
        const map = new Map<number, { tier: string; winRate: number }>()
        for (const r of data.rankings ?? []) {
          const tier = assignCharTier({ winRate: r.winRate, top3Rate: r.top3Rate, averageRank: 4.5, averageRP: r.averageRP })
          map.set(r.characterNum, { tier, winRate: r.winRate })
        }
        setRankingStatsMap(map)
      })
      .catch(() => {})
  }, [patches])

  React.useEffect(() => {
    if (initialPatches && initialPatches.length > 0) return
    fetch("/api/patches/history?limit=10&includeInactive=true")
      .then((r) => r.json())
      .then((d) => setPatches(d.patches ?? []))
      .catch(() => {})
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  React.useEffect(() => {
    selectedRef.current?.scrollIntoView({ block: "nearest", behavior: "smooth" })
  }, [selectedCode])

  const isInitialLoad = React.useRef(true)
  const initialWeaponApplied = React.useRef(false)
  React.useEffect(() => {
    if (!patches.length) return

    if (isInitialLoad.current && initialStats && selectedCode === startCode && selectedTier === TierGroup.MITHRIL) {
      isInitialLoad.current = false

      const remainingPatches = patches.slice(2)
      if (remainingPatches.length > 0) {
        const fetchRemaining = () =>
          Promise.all(
            remainingPatches.map((p) => fetchStats(selectedCode, p, selectedTier))
          ).then((restResults) => {
            setAllPatchStats((prev) => {
              const merged = [...prev]
              restResults.forEach((r, i) => { merged[i + 2] = r })
              return merged
            })
          })
        // 메인 스레드 idle 시점까지 지연 → TTI 개선
        if (typeof requestIdleCallback !== "undefined") {
          requestIdleCallback(() => { fetchRemaining() })
        } else {
          setTimeout(fetchRemaining, 200)
        }
      }
      return
    }
    isInitialLoad.current = false

    setLoading(true)
    setStats(null)
    setPreviousStats(null)
    setAllPatchStats([])
    setSelectedWeapon(null)

    const priorityPatches = patches.slice(0, 2)
    Promise.all(
      priorityPatches.map((p) => fetchStats(selectedCode, p, selectedTier))
    ).then((priorityResults) => {
      const current = priorityResults[0] ?? null
      setStats(current)
      setPreviousStats(priorityResults[1] ?? null)
      // initialWeapon이 있고 아직 적용 전이면 URL 값 유지, 아니면 첫 번째 무기 선택
      if (!initialWeaponApplied.current && initialWeapon != null) {
        initialWeaponApplied.current = true
        const hasWeapon = current?.weapons?.some((w) => w.bestWeapon === initialWeapon)
        setSelectedWeapon(hasWeapon ? initialWeapon : current?.weapons?.[0]?.bestWeapon ?? null)
      } else if (current?.weapons && current.weapons.length > 0) {
        setSelectedWeapon(current.weapons[0].bestWeapon ?? null)
      }
      const initial: (CharacterStatsResponse | null)[] = Array(patches.length).fill(null)
      priorityResults.forEach((r, i) => { initial[i] = r })
      setAllPatchStats(initial)
      setLoading(false)

      const remainingPatches = patches.slice(2)
      if (remainingPatches.length > 0) {
        const fetchRemaining = () =>
          Promise.all(
            remainingPatches.map((p) => fetchStats(selectedCode, p, selectedTier))
          ).then((restResults) => {
            setAllPatchStats((prev) => {
              const merged = [...prev]
              restResults.forEach((r, i) => { merged[i + 2] = r })
              return merged
            })
          })
        if (typeof requestIdleCallback !== "undefined") {
          requestIdleCallback(() => { fetchRemaining() })
        } else {
          setTimeout(fetchRemaining, 200)
        }
      }
    })
  }, [selectedCode, selectedTier, patches, initialStats, startCode])

  const currentPatch = patches[0] ?? null

  const selectedWeaponStat = React.useMemo(() => {
    if (!stats?.weapons || selectedWeapon === null) return null
    return stats.weapons.find((w) => w.bestWeapon === selectedWeapon) ?? null
  }, [stats, selectedWeapon])

  const prevSelectedWeaponStat = React.useMemo(() => {
    if (!previousStats?.weapons || selectedWeapon === null) return null
    return previousStats.weapons.find((w) => w.bestWeapon === selectedWeapon) ?? null
  }, [previousStats, selectedWeapon])

  const displayStat = selectedWeaponStat ?? stats
  const displayPrevStat = prevSelectedWeaponStat ?? previousStats
  const charTier = displayStat && displayStat.totalGames > 0 ? assignCharTier(displayStat) : null

  const chartData = React.useMemo(() => {
    return patches
      .map((patch, i) => {
        const s = allPatchStats[i]
        if (!s) return null
        let winRate: number
        let averageRP: number
        if (selectedWeapon != null && s.weapons) {
          const w = s.weapons.find((ws) => ws.bestWeapon === selectedWeapon)
          if (!w || w.totalGames === 0) return null
          winRate = w.winRate
          averageRP = w.averageRP
        } else {
          if (s.totalGames === 0) return null
          winRate = s.winRate
          averageRP = s.averageRP
        }
        return {
          patch,
          winRate: parseFloat(winRate.toFixed(2)),
          averageRP: parseFloat(averageRP.toFixed(1)),
        }
      })
      .filter((d): d is { patch: string; winRate: number; averageRP: number } => d !== null)
      .reverse()
  }, [patches, allPatchStats, selectedWeapon])

  const hasPreviousData = displayPrevStat !== null && (displayPrevStat.totalGames ?? 0) > 0

  const [showCharPicker, setShowCharPicker] = React.useState(false)
  const pickerRef = React.useRef<HTMLDivElement>(null)

  // 외부 클릭 시 닫기
  React.useEffect(() => {
    if (!showCharPicker) return
    const handler = (e: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        setShowCharPicker(false)
      }
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [showCharPicker])

  const gridStatsMap = React.useMemo(() => {
    if (!displayStat || displayStat.totalGames === 0 || !charTier) return rankingStatsMap
    const merged = new Map(rankingStatsMap)
    merged.set(selectedCode, { tier: charTier, winRate: displayStat.winRate })
    return merged
  }, [rankingStatsMap, selectedCode, displayStat, charTier])

  return (
    <div className="flex flex-col gap-4 sm:gap-5">
      {/* ── 캐릭터 검색 바 ── */}
      <div ref={pickerRef} className="relative">
        <button
          onClick={() => setShowCharPicker(!showCharPicker)}
          className="w-full flex items-center gap-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]/80 px-4 py-2.5 text-sm text-left hover:border-[var(--color-primary)]/50 transition-colors"
        >
          <Search className="h-4 w-4 text-[var(--color-muted-foreground)]" />
          <span className="text-[var(--color-foreground)] font-medium">{getCharacterName(selectedCode)}</span>
          <span className="text-[var(--color-muted-foreground)] text-xs ml-auto">캐릭터 변경</span>
        </button>

        {showCharPicker && (
          <div className="absolute z-50 top-full left-0 right-0 mt-1 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-xl overflow-hidden">
            <CharacterGrid
              selectedCode={selectedCode}
              onSelect={(code) => {
                setSelectedCode(code)
                setShowCharPicker(false)
              }}
              searchQuery={searchQuery}
              setSearchQuery={setSearchQuery}
              filteredCodes={filteredCodes}
              selectedRef={selectedRef}
              searchTimerRef={searchTimerRef}
              statsMap={gridStatsMap}
            />
          </div>
        )}
      </div>

      {/* ── Analysis Content (Full Width) ── */}
      <div className="flex flex-col gap-4 sm:gap-5 min-w-0">
        <CharacterHeader
          selectedCode={selectedCode}
          selectedTier={selectedTier}
          setSelectedTier={setSelectedTier}
          selectedWeapon={selectedWeapon}
          setSelectedWeapon={handleWeaponChange}
          stats={stats}
          previousStats={previousStats}
          displayStat={displayStat}
          displayPrevStat={displayPrevStat}
          charTier={charTier}
          currentPatch={currentPatch}
          loading={loading}
          hasPreviousData={hasPreviousData}
        />

        {/* ── Quick Summary ── */}
        {!loading && displayStat && displayStat.totalGames > 0 && (
          <section className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]/80 p-4 sm:p-5">
            <div className="flex items-center gap-2 mb-3">
              <Zap className="h-4 w-4 text-[var(--color-primary)]" />
              <h2 className="text-sm font-bold text-[var(--color-foreground)]">한눈에 보기</h2>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {/* Tier */}
              <div className="flex flex-col items-center gap-1.5 rounded-lg bg-[var(--color-surface-2)] p-3">
                <span className="text-[10px] font-medium text-[var(--color-muted-foreground)] uppercase tracking-wider">티어</span>
                {charTier && (
                  <span className={cn(
                    "text-2xl font-black",
                    charTier === "S" ? "text-[var(--color-tier-s)]" :
                    charTier === "A" ? "text-[var(--color-tier-a)]" :
                    charTier === "B" ? "text-[var(--color-tier-b)]" :
                    charTier === "C" ? "text-[var(--color-tier-c)]" :
                    "text-[var(--color-tier-d)]"
                  )}>{charTier}</span>
                )}
              </div>
              {/* Win Rate */}
              <div className="flex flex-col items-center gap-1.5 rounded-lg bg-[var(--color-surface-2)] p-3">
                <span className="text-[10px] font-medium text-[var(--color-muted-foreground)] uppercase tracking-wider">승률</span>
                <span className={cn(
                  "text-2xl font-black tabular-nums",
                  displayStat.winRate > 12.5 ? "text-[var(--color-stat-up)]" : "text-[var(--color-stat-down)]"
                )}>{displayStat.winRate.toFixed(1)}%</span>
              </div>
              {/* Best Weapon */}
              <div className="flex flex-col items-center gap-1.5 rounded-lg bg-[var(--color-surface-2)] p-3">
                <span className="text-[10px] font-medium text-[var(--color-muted-foreground)] uppercase tracking-wider">추천 무기</span>
                <span className="text-sm font-bold text-[var(--color-foreground)]">
                  {stats?.weapons?.[0] ? resolveWeaponName(stats.weapons[0].bestWeapon ?? undefined) : "\u2014"}
                </span>
              </div>
              {/* Pick Rate */}
              <div className="flex flex-col items-center gap-1.5 rounded-lg bg-[var(--color-surface-2)] p-3">
                <span className="text-[10px] font-medium text-[var(--color-muted-foreground)] uppercase tracking-wider">픽률</span>
                <span className="text-2xl font-black tabular-nums text-[var(--color-foreground)]">{(stats?.pickRate ?? displayStat.pickRate).toFixed(1)}%</span>
              </div>
            </div>

            {/* CTA: 이 캐릭터로 조합 찾기 */}
            <div className="mt-3 flex justify-end">
              <a
                href={`/synergy-detail?ally1=${selectedCode}${selectedWeapon != null ? `&w1=${selectedWeapon}` : ""}`}
                className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--color-primary)]/10 border border-[var(--color-primary)]/30 px-3.5 py-2 text-xs font-semibold text-[var(--color-primary)] hover:bg-[var(--color-primary)]/20 transition-colors"
              >
                <Users className="h-3.5 w-3.5" />
                이 캐릭터로 조합 찾기
                <ChevronRight className="h-3 w-3" />
              </a>
            </div>
          </section>
        )}

        {/* ── Deep Dive ── */}
        <div className="pt-2">
          <div className="flex items-center gap-2 mb-4">
            <div className="h-px flex-1 bg-[var(--color-border)]" />
            <span className="text-[11px] font-semibold text-[var(--color-muted-foreground)] uppercase tracking-widest">상세 분석</span>
            <div className="h-px flex-1 bg-[var(--color-border)]" />
          </div>

          <div className="flex flex-col gap-4 sm:gap-5">
            {/* ── 패치 비교 ── */}
            <section>
              <div className="flex items-center gap-2 mb-3">
                <BarChart2 className="h-4 w-4 text-[var(--color-primary)]" />
                <h2 className="text-sm font-bold text-[var(--color-foreground)]">패치 비교</h2>
              </div>
              <Suspense fallback={<TabFallback />}>
                <PatchComparisonTab
                  chartData={chartData}
                  stats={stats}
                  loading={loading}
                  selectedCode={selectedCode}
                />
              </Suspense>
            </section>

            {/* ── 패치 내역 ── */}
            <section>
              <div className="flex items-center gap-2 mb-3">
                <FileText className="h-4 w-4 text-[var(--color-primary)]" />
                <h2 className="text-sm font-bold text-[var(--color-foreground)]">패치 내역</h2>
              </div>
              <Suspense fallback={<TabFallback />}>
                <PatchLogTab patches={patches} selectedCode={selectedCode} />
              </Suspense>
            </section>

            {/* ── 통계 (특성 빌드) ── */}
            <section>
              <div className="flex items-center gap-2 mb-4">
                <BarChart2 className="h-4 w-4 text-[var(--color-accent-gold)]" />
                <h2 className="text-sm font-bold text-[var(--color-foreground)]">통계</h2>
              </div>
              <Suspense fallback={<TabFallback />}>
                <CharacterDetailedAnalyzer
                  characterCode={selectedCode}
                  tier={selectedTier}
                  patchVersion={currentPatch}
                  bestWeapon={selectedWeapon}
                />
              </Suspense>
            </section>

          </div>
        </div>
      </div>
    </div>
  )
}
