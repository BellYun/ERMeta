"use client"

import * as React from "react"
import Image from "next/image"
import { TrendingUp, TrendingDown, Minus, BarChart2, Search, RefreshCw, FileText, Package, Layers } from "lucide-react"
import { getCharacterPatchNote } from "@/data/patch-notes"
import type { ChangeType } from "@/data/patch-notes"
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { TierBadge } from "./TierBadge"
import { cn } from "@/lib/utils"
import type { Tier } from "@/lib/design-tokens"
import { getCharacterName, getCharacterImageUrl } from "@/lib/characterMap"
import { resolveWeaponName } from "@/lib/weaponMap"
import { METRICS_TIER_GROUPS, TierGroup } from "@/utils/tier"
import { CharacterTraitBuildAnalyzer } from "@/components/character/CharacterTraitBuildAnalyzer"
import { CharacterEquipmentAnalyzer } from "@/components/character/CharacterEquipmentAnalyzer"
import { CharacterDetailedAnalyzer } from "@/components/character/CharacterDetailedAnalyzer"
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
  [TierGroup.MITHRIL]: "미스릴 이상",
  [TierGroup.IN1000]: "1000위 이내",
  [TierGroup.DIAMOND_BELOW]: "다이아 이하",
}

const CHANGE_TYPE_CONFIG = {
  buff:   { label: "버프", colorClass: "text-[var(--color-accent-gold)]", bgClass: "bg-[var(--color-accent-gold)]/15 border-[var(--color-accent-gold)]/30", Icon: TrendingUp },
  nerf:   { label: "너프", colorClass: "text-[var(--color-danger)]",      bgClass: "bg-[var(--color-danger)]/15 border-[var(--color-danger)]/30",           Icon: TrendingDown },
  rework: { label: "변경", colorClass: "text-[var(--color-primary)]",     bgClass: "bg-[var(--color-primary)]/15 border-[var(--color-primary)]/30",          Icon: RefreshCw },
} satisfies Record<ChangeType, { label: string; colorClass: string; bgClass: string; Icon: React.FC<{ className?: string }> }>

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

function StatCard({
  label,
  value,
  sub,
  delta,
  deltaLabel,
  deltaInverted,
}: {
  label: string
  value: string
  sub?: string
  delta?: number
  deltaLabel?: string
  deltaInverted?: boolean
}) {
  return (
    <div className="flex flex-col gap-0.5 rounded-lg bg-[var(--color-surface-2)] px-4 py-3">
      <span className="text-xs text-[var(--color-muted-foreground)]">{label}</span>
      <span className="text-lg font-bold text-[var(--color-foreground)]">{value}</span>
      {delta !== undefined ? (
        <div className="flex items-center gap-0.5">
          <DeltaBadge delta={delta} inverted={deltaInverted} />
          {deltaLabel && (
            <span className="text-xs text-[var(--color-muted-foreground)]">{deltaLabel}</span>
          )}
        </div>
      ) : sub ? (
        <span className="text-xs text-[var(--color-muted-foreground)]">{sub}</span>
      ) : null}
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

function ChangeTypeBadge({ type }: { type: ChangeType }) {
  const config = CHANGE_TYPE_CONFIG[type]
  return (
    <span className={cn("inline-flex items-center gap-1 rounded border px-2 py-0.5 text-xs font-semibold shrink-0", config.bgClass, config.colorClass)}>
      <config.Icon className="h-3 w-3" />
      {config.label}
    </span>
  )
}

function PatchTooltip({
  active,
  payload,
  label,
  selectedCode,
  metricLabel,
  format,
}: {
  active?: boolean
  payload?: ReadonlyArray<{ value?: number | string | null }>
  label?: string | number
  selectedCode: number
  metricLabel: string
  format: (v: number) => string
}) {
  if (!active || !payload?.length) return null
  const rawValue = payload[0]?.value
  const value = typeof rawValue === "number" ? rawValue : undefined
  const patchLabel = label != null ? String(label) : ""
  const note = patchLabel ? getCharacterPatchNote(selectedCode, patchLabel) : undefined

  return (
    <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-3 text-xs shadow-lg max-w-[220px]">
      <p className="mb-1 font-semibold text-[var(--color-foreground)]">{patchLabel || "-"}</p>
      <p className="text-[var(--color-muted-foreground)]">
        {metricLabel}:{" "}
        <span className="font-medium text-[var(--color-foreground)]">
          {value != null ? format(value) : "-"}
        </span>
      </p>
      {note && note.changes.length > 0 && (
        <div className="mt-2 border-t border-[var(--color-border)] pt-2 space-y-1">
          {note.changes.map((change, i) => {
            const config = CHANGE_TYPE_CONFIG[change.changeType]
            return (
              <div key={i} className="flex items-start gap-1.5">
                <span className={cn("shrink-0 font-bold", config.colorClass)}>
                  [{config.label}]
                </span>
                <span className="text-[var(--color-muted-foreground)] leading-tight">
                  {change.target}
                  {change.valueSummary && (
                    <span className={cn("ml-1 font-mono", config.colorClass)}>
                      {change.valueSummary}
                    </span>
                  )}
                </span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

function SkeletonCard() {
  return <div className="h-16 rounded-lg bg-[var(--color-surface-2)] animate-pulse" />
}

// ─── 메인 컴포넌트 ────────────────────────────────────────────────────────────

export function CharacterAnalysisClient() {
  const [selectedCode, setSelectedCode] = React.useState<number>(1)
  const [selectedTier, setSelectedTier] = React.useState<TierGroup>(TierGroup.MITHRIL)
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
  const [allPatchStats, setAllPatchStats] = React.useState<(CharacterStatsResponse | null)[]>([])
  const [stats, setStats] = React.useState<CharacterStatsResponse | null>(null)
  const [previousStats, setPreviousStats] = React.useState<CharacterStatsResponse | null>(null)
  const [loading, setLoading] = React.useState(false)

  // 패치 목록 로드 (최초 1회)
  React.useEffect(() => {
    fetch("/api/patches/history?limit=10&includeInactive=true")
      .then((r) => r.json())
      .then((d) => setPatches(d.patches ?? []))
      .catch(() => {})
  }, [])

  // 캐릭터 변경 시 무기 선택 초기화
  React.useEffect(() => {
    setSelectedWeapon(null)
  }, [selectedCode])

  // 통계 로드 — 전체 패치 병렬 fetch
  React.useEffect(() => {
    if (!patches.length) return

    setLoading(true)
    setStats(null)
    setPreviousStats(null)
    setAllPatchStats([])

    Promise.all(
      patches.map((p) => fetchStats(selectedCode, p, selectedTier))
    ).then((results) => {
      setAllPatchStats(results)
      setStats(results[0] ?? null)
      setPreviousStats(results[1] ?? null)
      setLoading(false)
    })
  }, [selectedCode, selectedTier, patches])

  const currentPatch = patches[0] ?? null
  const charTier = stats && stats.totalGames > 0 ? assignCharTier(stats.winRate) : null

  // 패치 비교 탭용 차트 데이터 (오래된 → 최신 순)
  const chartData = React.useMemo(() => {
    return patches
      .map((patch, i) => {
        const s = allPatchStats[i]
        if (!s || s.totalGames === 0) return null
        return {
          patch,
          winRate: parseFloat(s.winRate.toFixed(2)),
          averageRP: parseFloat(s.averageRP.toFixed(0)),
        }
      })
      .filter((d): d is { patch: string; winRate: number; averageRP: number } => d !== null)
      .reverse()
  }, [patches, allPatchStats])

  const hasPreviousData = previousStats !== null && previousStats.totalGames > 0

  return (
    <div className="flex gap-4 items-start">
      {/* 좌측 캐릭터 그리드 */}
      <div className="w-[228px] shrink-0 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-2">
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
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-xl font-bold text-[var(--color-foreground)]">
                {getCharacterName(selectedCode)}
              </h1>
              {charTier && <TierBadge tier={charTier} />}
              {currentPatch && (
                <span className="text-xs text-[var(--color-muted-foreground)]">
                  {currentPatch}
                </span>
              )}
              <select
                value={selectedTier}
                onChange={(e) => setSelectedTier(e.target.value as TierGroup)}
                className="ml-auto rounded bg-[var(--color-surface-2)] px-2 py-1 text-xs text-[var(--color-foreground)] border border-[var(--color-border)] cursor-pointer"
              >
                {METRICS_TIER_GROUPS.map((tg) => (
                  <option key={tg} value={tg}>{TIER_LABELS[tg]}</option>
                ))}
              </select>
            </div>
            {loading ? (
              <div className="grid grid-cols-4 gap-2">
                {[...Array(4)].map((_, i) => <SkeletonCard key={i} />)}
              </div>
            ) : stats && stats.totalGames > 0 ? (
              <div className="grid grid-cols-4 gap-2">
                <StatCard
                  label="픽률"
                  value={`${stats.pickRate.toFixed(1)}%`}
                  delta={hasPreviousData ? stats.pickRate - previousStats!.pickRate : undefined}
                  deltaLabel="%p"
                />
                <StatCard
                  label="승률"
                  value={`${stats.winRate.toFixed(1)}%`}
                  delta={hasPreviousData ? stats.winRate - previousStats!.winRate : undefined}
                  deltaLabel="%p"
                />
                <StatCard
                  label="평균 순위"
                  value={`#${stats.averageRank.toFixed(1)}`}
                  delta={hasPreviousData ? stats.averageRank - previousStats!.averageRank : undefined}
                  deltaInverted
                />
                <StatCard
                  label="평균 RP"
                  value={stats.averageRP.toFixed(0)}
                  delta={hasPreviousData ? stats.averageRP - previousStats!.averageRP : undefined}
                />
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
            <TabsTrigger value="patchlog">
              <FileText className="mr-1.5 h-3.5 w-3.5" />패치 내역
            </TabsTrigger>
            <TabsTrigger value="equipment">
              <Package className="mr-1.5 h-3.5 w-3.5" />아이템 통계
            </TabsTrigger>
            <TabsTrigger value="detailed">
              <Layers className="mr-1.5 h-3.5 w-3.5" />상세분석
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
              <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-5 space-y-4">
                {/* 멀티 패치 트렌드 차트 */}
                {chartData.length >= 2 && (
                  <div className="space-y-4">
                    <p className="text-xs font-medium text-[var(--color-muted-foreground)]">
                      패치별 트렌드
                    </p>
                    <div className="grid grid-cols-2 gap-4">
                      {/* 승률 트렌드 */}
                      <div>
                        <p className="mb-2 text-xs text-[var(--color-muted-foreground)]">승률 (%)</p>
                        <ResponsiveContainer width="100%" height={160}>
                          <LineChart data={chartData} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                            <XAxis
                              dataKey="patch"
                              tick={{ fill: "var(--color-muted-foreground)", fontSize: 10 }}
                              tickLine={false}
                              axisLine={false}
                            />
                            <YAxis
                              domain={["auto", "auto"]}
                              tick={{ fill: "var(--color-muted-foreground)", fontSize: 10 }}
                              tickLine={false}
                              axisLine={false}
                              unit="%"
                            />
                            <Tooltip
                              content={(props) => (
                                <PatchTooltip
                                  {...props}
                                  selectedCode={selectedCode}
                                  metricLabel="승률"
                                  format={(v) => `${v.toFixed(2)}%`}
                                />
                              )}
                            />
                            <Line
                              dataKey="winRate"
                              stroke="var(--color-primary)"
                              strokeWidth={2}
                              dot={{ r: 3, fill: "var(--color-primary)" }}
                              activeDot={{ r: 5 }}
                            />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>

                      {/* 평균 RP 트렌드 */}
                      <div>
                        <p className="mb-2 text-xs text-[var(--color-muted-foreground)]">평균 RP</p>
                        <ResponsiveContainer width="100%" height={160}>
                          <LineChart data={chartData} margin={{ top: 4, right: 8, left: -8, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                            <XAxis
                              dataKey="patch"
                              tick={{ fill: "var(--color-muted-foreground)", fontSize: 10 }}
                              tickLine={false}
                              axisLine={false}
                            />
                            <YAxis
                              domain={["auto", "auto"]}
                              tick={{ fill: "var(--color-muted-foreground)", fontSize: 10 }}
                              tickLine={false}
                              axisLine={false}
                            />
                            <Tooltip
                              content={(props) => (
                                <PatchTooltip
                                  {...props}
                                  selectedCode={selectedCode}
                                  metricLabel="평균 RP"
                                  format={(v) => v.toFixed(0)}
                                />
                              )}
                            />
                            <Line
                              dataKey="averageRP"
                              stroke="var(--color-accent-gold)"
                              strokeWidth={2}
                              dot={{ r: 3, fill: "var(--color-accent-gold)" }}
                              activeDot={{ r: 5 }}
                            />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-8 text-center text-sm text-[var(--color-muted-foreground)]">
                데이터가 없습니다.
              </div>
            )}
          </TabsContent>

          {/* 패치 내역 */}
          <TabsContent value="patchlog">
            {patches.length === 0 ? (
              <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-8 text-center text-sm text-[var(--color-muted-foreground)]">
                패치 정보를 불러오는 중...
              </div>
            ) : (
              <div className="space-y-3">
                {patches.slice(0, 5).map((patch, i) => {
                  const note = getCharacterPatchNote(selectedCode, patch)
                  return (
                    <div key={patch} className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] overflow-hidden">
                      {/* 패치 버전 헤더 */}
                      <div className="flex items-center gap-2 border-b border-[var(--color-border)] bg-[var(--color-surface-2)] px-4 py-2">
                        <span className="text-xs font-semibold text-[var(--color-foreground)]">{patch}</span>
                        {i === 0 && (
                          <span className="rounded bg-[var(--color-primary)]/20 px-1.5 py-0.5 text-[10px] text-[var(--color-primary)]">현재</span>
                        )}
                      </div>
                      {/* 변경 내역 */}
                      {!note || note.changes.length === 0 ? (
                        <div className="px-4 py-3 text-xs text-[var(--color-muted-foreground)]">변경 사항 없음</div>
                      ) : (
                        <div className="divide-y divide-[var(--color-border)]">
                          {note.changes.map((change, idx) => {
                            const config = CHANGE_TYPE_CONFIG[change.changeType]
                            return (
                              <div key={idx} className="flex gap-3 px-4 py-3 hover:bg-[var(--color-surface-2)] transition-colors">
                                <div className="pt-0.5"><ChangeTypeBadge type={change.changeType} /></div>
                                <div className="flex flex-1 flex-col gap-1 min-w-0">
                                  <div className="flex items-center justify-between gap-2 flex-wrap">
                                    <span className="text-sm font-medium text-[var(--color-foreground)]">{change.target}</span>
                                    {change.valueSummary && (
                                      <span className={cn("text-xs font-mono shrink-0", config.colorClass)}>{change.valueSummary}</span>
                                    )}
                                  </div>
                                  <ul className="space-y-0.5">
                                    {change.description.map((desc, di) => (
                                      <li key={di} className="text-xs text-[var(--color-muted-foreground)] before:content-['•'] before:mr-1.5">{desc}</li>
                                    ))}
                                  </ul>
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </TabsContent>

          {/* 아이템 통계 */}
          <TabsContent value="equipment">
            <CharacterEquipmentAnalyzer
              characterCode={selectedCode}
              tier={selectedTier}
              patchVersion={currentPatch}
            />
          </TabsContent>

          {/* 상세분석 */}
          <TabsContent value="detailed">
            <CharacterDetailedAnalyzer
              characterCode={selectedCode}
              tier={selectedTier}
              patchVersion={currentPatch}
            />
          </TabsContent>

        </Tabs>
      </div>
    </div>
  )
}
