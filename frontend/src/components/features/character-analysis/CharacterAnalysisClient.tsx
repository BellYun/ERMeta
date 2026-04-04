"use client"

import * as React from "react"
import { Suspense } from "react"
import { BarChart2, ChevronRight, FileText, Loader2, Users, Zap } from "lucide-react"
import Link from "next/link"
import { getCharacterName } from "@/lib/characterMap"
import { resolveWeaponName } from "@/lib/weaponMap"
import { cn } from "@/lib/utils"
import { TierGroup } from "@/utils/tier"
import type { CharacterStatsResponse } from "@/app/api/character/stats/[characterCode]/route"

import { assignCharTier, fetchStats } from "./utils"
import { CharacterHeader } from "./CharacterHeader"

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
  code: number
  initialWeapon?: number | null
}

export function CharacterAnalysisClient({
  initialPatches,
  initialStats,
  initialPrevStats,
  code,
  initialWeapon,
}: CharacterAnalysisClientProps) {
  const patches = initialPatches ?? []

  const [selectedTier, setSelectedTier] = React.useState<TierGroup>(TierGroup.MITHRIL)
  const [selectedWeapon, setSelectedWeapon] = React.useState<number | null>(() => {
    if (initialWeapon != null) return initialWeapon
    if (initialStats?.weapons && initialStats.weapons.length > 0) {
      return initialStats.weapons[0].bestWeapon ?? null
    }
    return null
  })

  // 무기 변경 시 URL 파라미터 동기화
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

  const [allPatchStats, setAllPatchStats] = React.useState<(CharacterStatsResponse | null)[]>(() => {
    if (!patches.length) return []
    const initial: (CharacterStatsResponse | null)[] = Array(patches.length).fill(null)
    if (initialStats) initial[0] = initialStats
    if (initialPrevStats) initial[1] = initialPrevStats
    return initial
  })
  const [stats, setStats] = React.useState<CharacterStatsResponse | null>(initialStats ?? null)
  const [previousStats, setPreviousStats] = React.useState<CharacterStatsResponse | null>(initialPrevStats ?? null)
  const [loading, setLoading] = React.useState(false)

  // 나머지 패치 데이터 로드 (idle 시)
  React.useEffect(() => {
    if (patches.length <= 2) return
    const remainingPatches = patches.slice(2)
    const fetchRemaining = () =>
      Promise.all(
        remainingPatches.map((p) => fetchStats(code, p, selectedTier))
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
  }, [patches, code, selectedTier])

  // 티어 변경 시 데이터 리페치
  React.useEffect(() => {
    if (selectedTier === TierGroup.MITHRIL) {
      // 서버에서 받은 초기 데이터로 복원
      setStats(initialStats ?? null)
      setPreviousStats(initialPrevStats ?? null)
      setAllPatchStats(() => {
        const initial: (CharacterStatsResponse | null)[] = Array(patches.length).fill(null)
        if (initialStats) initial[0] = initialStats
        if (initialPrevStats) initial[1] = initialPrevStats
        return initial
      })
      setSelectedWeapon(initialStats?.weapons?.[0]?.bestWeapon ?? null)
      return
    }

    setLoading(true)
    setStats(null)
    setPreviousStats(null)
    setAllPatchStats([])
    setSelectedWeapon(null)

    const priorityPatches = patches.slice(0, 2)
    Promise.all(
      priorityPatches.map((p) => fetchStats(code, p, selectedTier))
    ).then((priorityResults) => {
      const current = priorityResults[0] ?? null
      setStats(current)
      setPreviousStats(priorityResults[1] ?? null)
      if (current?.weapons && current.weapons.length > 0) {
        setSelectedWeapon(current.weapons[0].bestWeapon ?? null)
      }
      const initial: (CharacterStatsResponse | null)[] = Array(patches.length).fill(null)
      priorityResults.forEach((r, i) => { initial[i] = r })
      setAllPatchStats(initial)
      setLoading(false)
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedTier])

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

  return (
    <div className="flex flex-col gap-4 sm:gap-5">
      {/* ── Analysis Content ── */}
      <div className="flex flex-col gap-4 sm:gap-5 min-w-0">
        <CharacterHeader
          selectedCode={code}
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

            {/* CTA */}
            <div className="mt-3 flex justify-end">
              <Link
                href={`/synergy-detail?ally1=${code}${selectedWeapon != null ? `&w1=${selectedWeapon}` : ""}`}
                className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--color-primary)]/10 border border-[var(--color-primary)]/30 px-3.5 py-2 text-xs font-semibold text-[var(--color-primary)] hover:bg-[var(--color-primary)]/20 transition-colors"
              >
                <Users className="h-3.5 w-3.5" />
                이 캐릭터로 조합 찾기
                <ChevronRight className="h-3 w-3" />
              </Link>
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
                  selectedCode={code}
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
                <PatchLogTab patches={patches} selectedCode={code} />
              </Suspense>
            </section>

            {/* ── 통계 ── */}
            <section>
              <div className="flex items-center gap-2 mb-4">
                <BarChart2 className="h-4 w-4 text-[var(--color-accent-gold)]" />
                <h2 className="text-sm font-bold text-[var(--color-foreground)]">통계</h2>
              </div>
              <Suspense fallback={<TabFallback />}>
                <CharacterDetailedAnalyzer
                  characterCode={code}
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
