"use client"

import * as React from "react"
import Image from "next/image"
import { TrendingUp, TrendingDown, Minus, BarChart2, Search } from "lucide-react"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { TierBadge } from "./TierBadge"
import { cn } from "@/lib/utils"
import type { Tier } from "@/lib/design-tokens"
import { getCharacterName, getCharacterImageUrl } from "@/lib/characterMap"
import { resolveWeaponName } from "@/lib/weaponMap"
import { METRICS_TIER_GROUPS, TierGroup } from "@/utils/tier"
import { CharacterTraitBuildAnalyzer } from "@/components/character/CharacterTraitBuildAnalyzer"
import type { CharacterStatsResponse } from "@/app/api/character/stats/[characterCode]/route"

// ─── 상수 ────────────────────────────────────────────────────────────────────

const CHARACTER_CODES: number[] = [
  1, 2, 3, 4, 5, 6, 7, 8, 9, 10,
  11, 12, 13, 14, 15, 16, 17, 18, 19, 20,
  21, 22, 23, 24, 25, 26, 27, 28, 29, 30,
  31, 32, 33, 34, 35, 36, 37, 38, 39, 40,
  41, 42, 43, 44, 45, 46, 47, 48, 49, 50,
  51, 52, 53, 54, 55, 56, 57, 58, 59, 60,
  61, 62, 63, 64, 65, 66, 67, 68, 69, 70,
  71, 72, 73, 74, 75, 76, 77, 78, 79, 80,
  81, 82, 83, 84, 85, 86,
]

const TIER_LABELS: Record<TierGroup, string> = {
  [TierGroup.DIAMOND]: "다이아",
  [TierGroup.METEORITE]: "메테오라이트",
  [TierGroup.MITHRIL]: "미스릴",
  [TierGroup.IN1000]: "1000위 이내",
  [TierGroup.DIAMOND_BELOW]: "다이아 이하",
}

// ─── 유틸 ─────────────────────────────────────────────────────────────────────

function assignCharTier(winRate: number): Tier {
  if (winRate >= 55) return "S"
  if (winRate >= 52) return "A"
  if (winRate >= 50) return "B"
  if (winRate >= 47) return "C"
  return "D"
}

async function fetchStats(
  characterCode: number,
  patchVersion: string,
  tier: TierGroup
): Promise<CharacterStatsResponse | null> {
  try {
    const res = await fetch(
      `/api/character/stats/${characterCode}?tier=${tier}&patchVersion=${encodeURIComponent(patchVersion)}`
    )
    if (!res.ok) return null
    return res.json()
  } catch {
    return null
  }
}

// ─── 서브 컴포넌트 ────────────────────────────────────────────────────────────

function StatCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="flex flex-col gap-0.5 rounded-lg bg-[var(--color-surface-2)] px-4 py-3">
      <span className="text-xs text-[var(--color-muted-foreground)]">{label}</span>
      <span className="text-lg font-bold text-[var(--color-foreground)]">{value}</span>
      {sub && <span className="text-xs text-[var(--color-muted-foreground)]">{sub}</span>}
    </div>
  )
}

function DeltaBadge({ delta, inverted = false }: { delta: number; inverted?: boolean }) {
  if (delta === 0) return <Minus className="inline h-3.5 w-3.5 text-[var(--color-muted-foreground)]" />
  const positive = inverted ? delta < 0 : delta > 0
  const color = positive ? "text-[var(--color-accent-gold)]" : "text-[var(--color-danger)]"
  const Icon = delta > 0 ? TrendingUp : TrendingDown
  return (
    <span className={cn("inline-flex items-center gap-0.5 text-xs font-medium", color)}>
      <Icon className="h-3 w-3" />
      {delta > 0 ? "+" : ""}{delta.toFixed(2)}
    </span>
  )
}

function SkeletonCard() {
  return <div className="h-16 rounded-lg bg-[var(--color-surface-2)] animate-pulse" />
}

// ─── 메인 컴포넌트 ────────────────────────────────────────────────────────────

export function CharacterAnalysisClient() {
  const [selectedCode, setSelectedCode] = React.useState<number>(1)
  const [selectedTier, setSelectedTier] = React.useState<TierGroup>(TierGroup.DIAMOND)
  const [selectedWeapon, setSelectedWeapon] = React.useState<number | null>(null)
  const [searchQuery, setSearchQuery] = React.useState("")

  const filteredCodes = React.useMemo(() => {
    const sorted = [...CHARACTER_CODES].sort((a, b) =>
      getCharacterName(a).localeCompare(getCharacterName(b), "ko")
    )
    const q = searchQuery.trim()
    if (!q) return sorted
    return sorted.filter((code) => getCharacterName(code).includes(q))
  }, [searchQuery])

  const [patches, setPatches] = React.useState<string[]>([])
  const [stats, setStats] = React.useState<CharacterStatsResponse | null>(null)
  const [previousStats, setPreviousStats] = React.useState<CharacterStatsResponse | null>(null)
  const [loading, setLoading] = React.useState(false)

  // 패치 목록 로드 (최초 1회)
  React.useEffect(() => {
    fetch("/api/patches/history?limit=5")
      .then((r) => r.json())
      .then((d) => setPatches(d.patches ?? []))
      .catch(() => {})
  }, [])

  // 캐릭터 변경 시 무기 선택 초기화
  React.useEffect(() => {
    setSelectedWeapon(null)
  }, [selectedCode])

  // 통계 로드
  React.useEffect(() => {
    if (!patches.length) return
    const currentPatch = patches[0]
    const previousPatch = patches[1] ?? null

    setLoading(true)
    setStats(null)
    setPreviousStats(null)

    Promise.all([
      fetchStats(selectedCode, currentPatch, selectedTier),
      previousPatch ? fetchStats(selectedCode, previousPatch, selectedTier) : Promise.resolve(null),
    ]).then(([cur, prev]) => {
      setStats(cur)
      setPreviousStats(prev)
      setLoading(false)
    })
  }, [selectedCode, selectedTier, patches])

  const currentPatch = patches[0] ?? null
  const previousPatch = patches[1] ?? null
  const charTier = stats && stats.totalGames > 0 ? assignCharTier(stats.winRate) : null

  return (
    <div className="flex gap-4 items-start">
      {/* 좌측 캐릭터 그리드 */}
      <div className="w-[228px] shrink-0 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-2">
        {/* 티어 선택 */}
        <div className="mb-2">
          <select
            value={selectedTier}
            onChange={(e) => setSelectedTier(e.target.value as TierGroup)}
            className="w-full rounded bg-[var(--color-surface-2)] px-2 py-1.5 text-xs text-[var(--color-foreground)] border border-[var(--color-border)] cursor-pointer"
          >
            {METRICS_TIER_GROUPS.map((tg) => (
              <option key={tg} value={tg}>{TIER_LABELS[tg]}</option>
            ))}
          </select>
        </div>

        {/* 검색 */}
        <div className="relative mb-2">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[var(--color-muted-foreground)] pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="캐릭터 검색"
            className="w-full rounded bg-[var(--color-surface-2)] pl-7 pr-2 py-1.5 text-xs text-[var(--color-foreground)] border border-[var(--color-border)] placeholder:text-[var(--color-muted-foreground)] outline-none focus:border-[var(--color-primary)]"
          />
        </div>

        <div className="grid grid-cols-3 gap-1 max-h-[620px] overflow-y-auto pr-0.5">
          {filteredCodes.length === 0 ? (
            <p className="col-span-3 py-4 text-center text-xs text-[var(--color-muted-foreground)]">
              검색 결과 없음
            </p>
          ) : null}
          {filteredCodes.map((code) => (
            <button
              key={code}
              onClick={() => { setSelectedCode(code); setSearchQuery("") }}
              className={cn(
                "flex flex-col items-center gap-1 rounded-lg px-1 py-2 transition-colors",
                selectedCode === code
                  ? "bg-[var(--color-primary)]/20 ring-1 ring-[var(--color-primary)]"
                  : "hover:bg-[var(--color-surface-2)]"
              )}
            >
              <div className="relative h-10 w-10 overflow-hidden rounded-md bg-[var(--color-border)]">
                <Image
                  src={getCharacterImageUrl(code)}
                  alt={getCharacterName(code)}
                  fill
                  className="object-cover"
                  sizes="40px"
                  unoptimized
                />
              </div>
              <span className="w-full truncate text-center text-[11px] font-medium text-[var(--color-foreground)]">
                {getCharacterName(code)}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* 우측 분석 콘텐츠 */}
      <div className="flex flex-1 flex-col gap-4 min-w-0">
        {/* 캐릭터 헤더 */}
        <div className="flex gap-4 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-5 items-center">
          <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-[var(--color-border)]">
            <Image
              src={getCharacterImageUrl(selectedCode)}
              alt={getCharacterName(selectedCode)}
              fill
              className="object-cover"
              sizes="80px"
              unoptimized
            />
          </div>
          <div className="flex flex-1 flex-col gap-3 min-w-0">
            <div className="flex items-center gap-3">
              <h1 className="text-xl font-bold text-[var(--color-foreground)]">
                {getCharacterName(selectedCode)}
              </h1>
              {charTier && <TierBadge tier={charTier} />}
              {currentPatch && (
                <span className="text-xs text-[var(--color-muted-foreground)]">
                  {currentPatch}
                </span>
              )}
            </div>
            {loading ? (
              <div className="grid grid-cols-4 gap-2">
                {[...Array(4)].map((_, i) => <SkeletonCard key={i} />)}
              </div>
            ) : stats && stats.totalGames > 0 ? (
              <div className="grid grid-cols-4 gap-2">
                <StatCard label="픽률" value={`${stats.pickRate.toFixed(1)}%`} />
                <StatCard label="승률" value={`${stats.winRate.toFixed(1)}%`} />
                <StatCard label="평균 순위" value={`#${stats.averageRank.toFixed(1)}`} />
                <StatCard label="평균 RP" value={stats.averageRP.toFixed(0)} />
              </div>
            ) : (
              <p className="text-sm text-[var(--color-muted-foreground)]">
                {currentPatch ? "이 패치에서 데이터가 없습니다." : "패치 정보를 불러오는 중..."}
              </p>
            )}
          </div>
        </div>

        {/* 탭 분석 */}
        <Tabs defaultValue="weapons">
          <TabsList>
            <TabsTrigger value="weapons">무기별 통계</TabsTrigger>
            <TabsTrigger value="comparison">
              <BarChart2 className="mr-1.5 h-3.5 w-3.5" />패치 비교
            </TabsTrigger>
          </TabsList>

          {/* 무기별 통계 */}
          <TabsContent value="weapons">
            {loading ? (
              <div className="space-y-2">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="h-12 rounded-lg bg-[var(--color-surface)] animate-pulse" />
                ))}
              </div>
            ) : stats?.weapons && stats.weapons.length > 0 ? (
              <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-[var(--color-border)] text-[var(--color-muted-foreground)] text-xs">
                      <th className="px-4 py-3 text-left font-medium">무기</th>
                      <th className="px-4 py-3 text-right font-medium w-20">픽률</th>
                      <th className="px-4 py-3 text-right font-medium w-20">승률</th>
                      <th className="px-4 py-3 text-right font-medium w-24">평균 순위</th>
                      <th className="px-4 py-3 text-right font-medium w-24">평균 RP</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.weapons.map((w) => {
                      const isSelected = selectedWeapon === w.bestWeapon
                      return (
                        <tr
                          key={w.bestWeapon ?? "total"}
                          onClick={() =>
                            setSelectedWeapon(isSelected ? null : (w.bestWeapon ?? null))
                          }
                          className="border-b border-[var(--color-border)] last:border-0 hover:bg-[var(--color-surface-2)] transition-colors cursor-pointer"
                        >
                          <td className="px-4 py-3 font-medium">
                            <span className={cn(isSelected && "text-[var(--color-primary)]")}>
                              {resolveWeaponName(w.bestWeapon ?? undefined)}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right text-[var(--color-muted-foreground)]">
                            {w.pickRate.toFixed(1)}%
                          </td>
                          <td className="px-4 py-3 text-right">
                            <span
                              className={cn(
                                "font-medium",
                                w.winRate >= 55
                                  ? "text-[var(--color-accent-gold)]"
                                  : "text-[var(--color-muted-foreground)]"
                              )}
                            >
                              {w.winRate.toFixed(1)}%
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right text-[var(--color-muted-foreground)]">
                            #{w.averageRank.toFixed(1)}
                          </td>
                          <td className="px-4 py-3 text-right text-[var(--color-muted-foreground)]">
                            {w.averageRP.toFixed(0)}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-8 text-center text-sm text-[var(--color-muted-foreground)]">
                데이터가 없습니다.
              </div>
            )}

            {/* 특성 빌드 — 무기 선택 시 인라인 표시 */}
            {selectedWeapon !== null && (
              <div className="mt-4">
                <p className="mb-2 text-xs font-medium text-[var(--color-muted-foreground)]">
                  {resolveWeaponName(selectedWeapon)} 특성 빌드
                </p>
                <CharacterTraitBuildAnalyzer
                  characterCode={selectedCode}
                  tier={selectedTier}
                  patchVersion={currentPatch}
                  bestWeapon={selectedWeapon}
                />
              </div>
            )}
          </TabsContent>

          {/* 패치 비교 */}
          <TabsContent value="comparison">
            {loading ? (
              <div className="h-40 rounded-lg bg-[var(--color-surface)] animate-pulse" />
            ) : stats && stats.totalGames > 0 ? (
              <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
                <div className="mb-4 flex items-center gap-2">
                  {currentPatch && (
                    <span className="rounded bg-[var(--color-primary)]/20 px-2 py-0.5 text-xs text-[var(--color-primary)]">
                      현재: {currentPatch}
                    </span>
                  )}
                  {previousPatch && (
                    <span className="rounded bg-[var(--color-surface-2)] px-2 py-0.5 text-xs text-[var(--color-muted-foreground)]">
                      이전: {previousPatch}
                    </span>
                  )}
                  {!previousStats && previousPatch && (
                    <span className="text-xs text-[var(--color-muted-foreground)]">
                      (이전 패치 데이터 없음)
                    </span>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {/* 픽률 */}
                  <div className="rounded-lg bg-[var(--color-surface-2)] p-3">
                    <p className="mb-1 text-xs text-[var(--color-muted-foreground)]">픽률</p>
                    <p className="text-lg font-bold text-[var(--color-foreground)]">
                      {stats.pickRate.toFixed(1)}%
                    </p>
                    {previousStats && previousStats.totalGames > 0 && (
                      <div className="mt-1">
                        <DeltaBadge delta={stats.pickRate - previousStats.pickRate} />
                        <span className="ml-1 text-xs text-[var(--color-muted-foreground)]">%p</span>
                      </div>
                    )}
                  </div>
                  {/* 승률 */}
                  <div className="rounded-lg bg-[var(--color-surface-2)] p-3">
                    <p className="mb-1 text-xs text-[var(--color-muted-foreground)]">승률</p>
                    <p className="text-lg font-bold text-[var(--color-foreground)]">
                      {stats.winRate.toFixed(1)}%
                    </p>
                    {previousStats && previousStats.totalGames > 0 && (
                      <div className="mt-1">
                        <DeltaBadge delta={stats.winRate - previousStats.winRate} />
                        <span className="ml-1 text-xs text-[var(--color-muted-foreground)]">%p</span>
                      </div>
                    )}
                  </div>
                  {/* 평균 순위 */}
                  <div className="rounded-lg bg-[var(--color-surface-2)] p-3">
                    <p className="mb-1 text-xs text-[var(--color-muted-foreground)]">평균 순위</p>
                    <p className="text-lg font-bold text-[var(--color-foreground)]">
                      #{stats.averageRank.toFixed(1)}
                    </p>
                    {previousStats && previousStats.totalGames > 0 && (
                      <div className="mt-1">
                        {/* 낮을수록 좋으므로 inverted */}
                        <DeltaBadge delta={stats.averageRank - previousStats.averageRank} inverted />
                      </div>
                    )}
                  </div>
                  {/* 평균 RP */}
                  <div className="rounded-lg bg-[var(--color-surface-2)] p-3">
                    <p className="mb-1 text-xs text-[var(--color-muted-foreground)]">평균 RP</p>
                    <p className="text-lg font-bold text-[var(--color-foreground)]">
                      {stats.averageRP.toFixed(0)}
                    </p>
                    {previousStats && previousStats.totalGames > 0 && (
                      <div className="mt-1">
                        <DeltaBadge delta={stats.averageRP - previousStats.averageRP} />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-8 text-center text-sm text-[var(--color-muted-foreground)]">
                데이터가 없습니다.
              </div>
            )}
          </TabsContent>

        </Tabs>
      </div>
    </div>
  )
}
