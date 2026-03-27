"use client"

import * as React from "react"
import { Suspense } from "react"
import { BarChart2, FileText, Package, Layers, Loader2 } from "lucide-react"
import { useSearchParams, useRouter, usePathname } from "next/navigation"
import { analytics } from "@/lib/analytics"
import { getCharacterName } from "@/lib/characterMap"
import { cn } from "@/lib/utils"
import { TierGroup } from "@/utils/tier"
import type { CharacterStatsResponse } from "@/app/api/character/stats/[characterCode]/route"

import { CHARACTER_CODES } from "./constants"
import { assignCharTier, fetchStats } from "./utils"
import { CharacterGrid } from "./CharacterGrid"
import { CharacterHeader } from "./CharacterHeader"

// 탭 콘텐츠만 lazy import (초기 뷰포트 밖 → 코드 스플릿 효과 큼)
const PatchComparisonTab = React.lazy(() =>
  import("./PatchComparisonTab").then((m) => ({ default: m.PatchComparisonTab }))
)
const PatchLogTab = React.lazy(() =>
  import("./PatchLogTab").then((m) => ({ default: m.PatchLogTab }))
)
const CharacterEquipmentAnalyzer = React.lazy(() =>
  import("@/components/character/CharacterEquipmentAnalyzer").then((m) => ({ default: m.CharacterEquipmentAnalyzer }))
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

const TAB_ITEMS = [
  { value: "comparison", label: "패치 비교", icon: BarChart2 },
  { value: "patchlog", label: "패치 내역", icon: FileText },
  { value: "equipment", label: "아이템", icon: Package },
  { value: "detailed", label: "상세분석", icon: Layers },
] as const

interface CharacterAnalysisClientProps {
  initialPatches?: string[]
  initialStats?: CharacterStatsResponse | null
  initialPrevStats?: CharacterStatsResponse | null
  initialCode?: number
}

export function CharacterAnalysisClient({
  initialPatches,
  initialStats,
  initialPrevStats,
  initialCode,
}: CharacterAnalysisClientProps) {
  const searchParams = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()

  const startCode = initialCode ?? (() => {
    const p = searchParams.get("character")
    if (!p) return 1
    const n = parseInt(p, 10)
    return CHARACTER_CODES.includes(n) ? n : 1
  })()

  const [selectedCode, setSelectedCode] = React.useState<number>(startCode)
  const [selectedTier, setSelectedTier] = React.useState<TierGroup>(TierGroup.MITHRIL)
  const [selectedWeapon, setSelectedWeapon] = React.useState<number | null>(() => {
    if (initialStats?.weapons && initialStats.weapons.length > 0) {
      return initialStats.weapons[0].bestWeapon ?? null
    }
    return null
  })
  const [searchQuery, setSearchQuery] = React.useState("")
  const searchTimerRef = React.useRef<ReturnType<typeof setTimeout>>(null)
  const selectedRef = React.useRef<HTMLButtonElement>(null)
  const [activeTab, setActiveTab] = React.useState("comparison")

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
  React.useEffect(() => {
    if (!patches.length) return

    if (isInitialLoad.current && initialStats && selectedCode === startCode && selectedTier === TierGroup.MITHRIL) {
      isInitialLoad.current = false

      const remainingPatches = patches.slice(2)
      if (remainingPatches.length > 0) {
        Promise.all(
          remainingPatches.map((p) => fetchStats(selectedCode, p, selectedTier))
        ).then((restResults) => {
          setAllPatchStats((prev) => {
            const merged = [...prev]
            restResults.forEach((r, i) => { merged[i + 2] = r })
            return merged
          })
        })
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
      if (current?.weapons && current.weapons.length > 0) {
        setSelectedWeapon(current.weapons[0].bestWeapon ?? null)
      }
      const initial: (CharacterStatsResponse | null)[] = Array(patches.length).fill(null)
      priorityResults.forEach((r, i) => { initial[i] = r })
      setAllPatchStats(initial)
      setLoading(false)

      const remainingPatches = patches.slice(2)
      if (remainingPatches.length > 0) {
        Promise.all(
          remainingPatches.map((p) => fetchStats(selectedCode, p, selectedTier))
        ).then((restResults) => {
          setAllPatchStats((prev) => {
            const merged = [...prev]
            restResults.forEach((r, i) => { merged[i + 2] = r })
            return merged
          })
        })
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

  return (
    <div className="flex flex-col lg:flex-row gap-4 lg:gap-5 items-start">
      {/* ── Character Grid (Left) ── */}
      <CharacterGrid
        selectedCode={selectedCode}
        onSelect={setSelectedCode}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        filteredCodes={filteredCodes}
        selectedRef={selectedRef}
        searchTimerRef={searchTimerRef}
      />

      {/* ── Analysis Content (Right) ── */}
      <div className="flex flex-1 flex-col gap-4 sm:gap-5 min-w-0">
        <CharacterHeader
          selectedCode={selectedCode}
          selectedTier={selectedTier}
          setSelectedTier={setSelectedTier}
          selectedWeapon={selectedWeapon}
          setSelectedWeapon={setSelectedWeapon}
          stats={stats}
          displayStat={displayStat}
          displayPrevStat={displayPrevStat}
          charTier={charTier}
          currentPatch={currentPatch}
          loading={loading}
          hasPreviousData={hasPreviousData}
        />

        {/* ── Tab Navigation ── */}
        <div className="flex flex-col gap-0">
          {/* Tab Bar */}
          <div className="flex items-center gap-1 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]/80 p-1 overflow-x-auto scrollbar-hide">
            {TAB_ITEMS.map(({ value, label, icon: Icon }) => (
              <button
                key={value}
                onClick={() => { setActiveTab(value); analytics.analysisTabChanged(value) }}
                className={cn(
                  "flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium transition-all shrink-0 min-h-[36px] touch-manipulation",
                  activeTab === value
                    ? "bg-[var(--color-primary)]/12 text-[var(--color-primary)] shadow-sm"
                    : "text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)] hover:bg-[var(--color-surface-2)]"
                )}
              >
                <Icon className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate">{label}</span>
              </button>
            ))}
          </div>

          {/* Tab Content */}
          <div className="mt-3 sm:mt-4">
            {activeTab === "comparison" && (
              <Suspense fallback={<TabFallback />}>
                <PatchComparisonTab
                  chartData={chartData}
                  stats={stats}
                  loading={loading}
                  selectedCode={selectedCode}
                />
              </Suspense>
            )}

            {activeTab === "patchlog" && (
              <Suspense fallback={<TabFallback />}>
                <PatchLogTab patches={patches} selectedCode={selectedCode} />
              </Suspense>
            )}

            {activeTab === "equipment" && (
              <Suspense fallback={<TabFallback />}>
                <CharacterEquipmentAnalyzer
                  characterCode={selectedCode}
                  tier={selectedTier}
                  patchVersion={currentPatch}
                  bestWeapon={selectedWeapon}
                />
              </Suspense>
            )}

            {activeTab === "detailed" && (
              <Suspense fallback={<TabFallback />}>
                <CharacterDetailedAnalyzer
                  characterCode={selectedCode}
                  tier={selectedTier}
                  patchVersion={currentPatch}
                  bestWeapon={selectedWeapon}
                />
              </Suspense>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
