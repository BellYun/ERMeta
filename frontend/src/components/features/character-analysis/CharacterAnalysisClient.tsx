"use client"

import * as React from "react"
import { Suspense } from "react"
import { BarChart2, FileText, Package, Layers, Loader2 } from "lucide-react"
import { useSearchParams, useRouter, usePathname } from "next/navigation"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { analytics } from "@/lib/analytics"
import { getCharacterName } from "@/lib/characterMap"
import { TierGroup } from "@/utils/tier"
import type { CharacterStatsResponse } from "@/app/api/character/stats/[characterCode]/route"

import { CHARACTER_CODES } from "./constants"
import { assignCharTier, fetchStats } from "./utils"
import { CharacterGridSkeleton, CharacterHeaderSkeleton } from "./AnalysisSkeleton"

const CharacterGrid = React.lazy(() =>
  import("./CharacterGrid").then((m) => ({ default: m.CharacterGrid }))
)
const CharacterHeader = React.lazy(() =>
  import("./CharacterHeader").then((m) => ({ default: m.CharacterHeader }))
)

// 탭 콘텐츠 lazy import → 코드 스플릿 + Suspense 폴백 활성화
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

export function CharacterAnalysisClient() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()
  const initialCode = (() => {
    const p = searchParams.get("character")
    if (!p) return 1
    const n = parseInt(p, 10)
    return CHARACTER_CODES.includes(n) ? n : 1
  })()
  const [selectedCode, setSelectedCode] = React.useState<number>(initialCode)
  const [selectedTier, setSelectedTier] = React.useState<TierGroup>(TierGroup.MITHRIL)
  const [selectedWeapon, setSelectedWeapon] = React.useState<number | null>(null)
  const [searchQuery, setSearchQuery] = React.useState("")
  const searchTimerRef = React.useRef<ReturnType<typeof setTimeout>>(null)
  const selectedRef = React.useRef<HTMLButtonElement>(null)

  const filteredCodes = React.useMemo(() => {
    const sorted = [...CHARACTER_CODES].sort((a, b) =>
      getCharacterName(a).localeCompare(getCharacterName(b), "ko")
    )
    const q = searchQuery.trim()
    if (!q) return sorted
    return sorted.filter((code) => getCharacterName(code).includes(q))
  }, [searchQuery])

  const [patches, setPatches] = React.useState<string[]>([])
  const [allPatchStats, setAllPatchStats] = React.useState<(CharacterStatsResponse | null)[]>([])
  const [stats, setStats] = React.useState<CharacterStatsResponse | null>(null)
  const [previousStats, setPreviousStats] = React.useState<CharacterStatsResponse | null>(null)
  const [loading, setLoading] = React.useState(false)

  // 선택 캐릭터 자동 스크롤
  React.useEffect(() => {
    selectedRef.current?.scrollIntoView({ block: "nearest", behavior: "smooth" })
  }, [selectedCode])

  // 패치 목록 로드 (최초 1회)
  React.useEffect(() => {
    fetch("/api/patches/history?limit=10&includeInactive=true")
      .then((r) => r.json())
      .then((d) => setPatches(d.patches ?? []))
      .catch(() => {})
  }, [])

  // 통계 로드 — 현재+이전 패치만 먼저, 나머지는 백그라운드
  React.useEffect(() => {
    if (!patches.length) return

    setLoading(true)
    setStats(null)
    setPreviousStats(null)
    setAllPatchStats([])
    setSelectedWeapon(null)

    // Phase 1: 현재 + 이전 패치만 우선 fetch → 즉시 인터랙션 가능
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
      // 초기 allPatchStats: 우선 패치만 채우고 나머지는 null
      const initial: (CharacterStatsResponse | null)[] = Array(patches.length).fill(null)
      priorityResults.forEach((r, i) => { initial[i] = r })
      setAllPatchStats(initial)
      setLoading(false)

      // Phase 2: 나머지 패치 백그라운드 fetch (차트 데이터용)
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
  }, [selectedCode, selectedTier, patches])

  const currentPatch = patches[0] ?? null

  // 선택된 무기의 통계
  const selectedWeaponStat = React.useMemo(() => {
    if (!stats?.weapons || selectedWeapon === null) return null
    return stats.weapons.find((w) => w.bestWeapon === selectedWeapon) ?? null
  }, [stats, selectedWeapon])

  const prevSelectedWeaponStat = React.useMemo(() => {
    if (!previousStats?.weapons || selectedWeapon === null) return null
    return previousStats.weapons.find((w) => w.bestWeapon === selectedWeapon) ?? null
  }, [previousStats, selectedWeapon])

  // 표시할 통계 (무기 선택 시 무기별, 아니면 전체)
  const displayStat = selectedWeaponStat ?? stats
  const displayPrevStat = prevSelectedWeaponStat ?? previousStats

  const charTier = displayStat && displayStat.totalGames > 0 ? assignCharTier(displayStat) : null

  // 패치 비교 탭용 차트 데이터 (선택 무기 기준, 오래된 → 최신 순)
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
    <div className="flex flex-col lg:flex-row gap-4 items-start">
      {/* 캐릭터 그리드 (모바일: 상단 수평 스크롤, 데스크탑: 좌측 사이드바) */}
      <Suspense fallback={<CharacterGridSkeleton />}>
        <CharacterGrid
          selectedCode={selectedCode}
          onSelect={setSelectedCode}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          filteredCodes={filteredCodes}
          selectedRef={selectedRef}
          searchTimerRef={searchTimerRef}
        />
      </Suspense>

      {/* 우측 분석 콘텐츠 */}
      <div className="flex flex-1 flex-col gap-4 min-w-0">
        {/* 캐릭터 헤더 */}
        <Suspense fallback={<CharacterHeaderSkeleton />}>
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
        </Suspense>

        {/* 탭 분석 */}
        <Tabs defaultValue="comparison" onValueChange={(v) => analytics.analysisTabChanged(v)}>
          <TabsList className="w-full grid grid-cols-4 h-auto">
            <TabsTrigger value="comparison" className="text-[11px] sm:text-sm px-1 sm:px-3 py-2">
              <BarChart2 className="mr-1 sm:mr-1.5 h-3.5 w-3.5 shrink-0" /><span className="truncate">패치 비교</span>
            </TabsTrigger>
            <TabsTrigger value="patchlog" className="text-[11px] sm:text-sm px-1 sm:px-3 py-2">
              <FileText className="mr-1 sm:mr-1.5 h-3.5 w-3.5 shrink-0" /><span className="truncate">패치 내역</span>
            </TabsTrigger>
            <TabsTrigger value="equipment" className="text-[11px] sm:text-sm px-1 sm:px-3 py-2">
              <Package className="mr-1 sm:mr-1.5 h-3.5 w-3.5 shrink-0" /><span className="truncate">아이템</span>
            </TabsTrigger>
            <TabsTrigger value="detailed" className="text-[11px] sm:text-sm px-1 sm:px-3 py-2">
              <Layers className="mr-1 sm:mr-1.5 h-3.5 w-3.5 shrink-0" /><span className="truncate">상세분석</span>
            </TabsTrigger>
          </TabsList>

          {/* 패치 비교 */}
          <TabsContent value="comparison">
            <Suspense fallback={<TabFallback />}>
              <PatchComparisonTab
                chartData={chartData}
                stats={stats}
                loading={loading}
                selectedCode={selectedCode}
              />
            </Suspense>
          </TabsContent>

          {/* 패치 내역 */}
          <TabsContent value="patchlog">
            <Suspense fallback={<TabFallback />}>
              <PatchLogTab patches={patches} selectedCode={selectedCode} />
            </Suspense>
          </TabsContent>

          {/* 아이템 통계 */}
          <TabsContent value="equipment">
            <Suspense fallback={<TabFallback />}>
              <CharacterEquipmentAnalyzer
                characterCode={selectedCode}
                tier={selectedTier}
                patchVersion={currentPatch}
                bestWeapon={selectedWeapon}
              />
            </Suspense>
          </TabsContent>

          {/* 상세분석 */}
          <TabsContent value="detailed">
            <Suspense fallback={<TabFallback />}>
              <CharacterDetailedAnalyzer
                characterCode={selectedCode}
                tier={selectedTier}
                patchVersion={currentPatch}
                bestWeapon={selectedWeapon}
              />
            </Suspense>
          </TabsContent>

        </Tabs>
      </div>
    </div>
  )
}
