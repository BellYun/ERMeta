"use client"

import { Layers } from "lucide-react"
import Image from "next/image"
import * as React from "react"
import itemNameMap from "@/../const/itemNameMap.json"
import type { EquipmentBuildResult, BuildSummary } from "@/app/api/builds/equipment/route"
import { cn } from "@/lib/utils"
import { TierGroup } from "@/utils/tier"
import { ItemIcon, WinRateSpan, SLOTS, SLOT_LABELS } from "./shared"

// ─── 타입 ──────────────────────────────────────────────────────────────────────

interface TraitSubOption {
  code: number | null
  totalGames: number
  pickRate: number
  winRate: number
}

interface TraitSecondaryInfo {
  secGroup: TraitGroup
  totalGames: number
  pickRate: number
  winRate: number
  optionTrait1Options: TraitSubOption[]
  optionTrait2Options: TraitSubOption[]
}

interface TraitMainGroupData {
  mainGroup: TraitGroup
  totalGames: number
  groupPickRate: number
  groupWinRate: number
  mainCoreOptions: TraitSubOption[]
  sub1Options: TraitSubOption[]
  sub2Options: TraitSubOption[]
  secondaries: TraitSecondaryInfo[]
}

interface Props {
  characterCode: number
  tier: TierGroup
  patchVersion: string | null
  bestWeapon: number | null
}

// ─── 특성 아이콘 헬퍼 ────────────────────────────────────────────────────────────

type TraitGroup = "havoc" | "fortification" | "support" | "chaos" | "unknown"

const GROUP_CONFIG: Record<TraitGroup, { letter: string; name: string; bg: string; text: string; ring: string }> = {
  havoc:         { letter: "파", name: "파괴",   bg: "bg-red-500/20",     text: "text-red-400",     ring: "ring-red-400/50" },
  fortification: { letter: "저", name: "저항",   bg: "bg-blue-500/20",    text: "text-blue-400",    ring: "ring-blue-400/50" },
  support:       { letter: "지", name: "지원",   bg: "bg-emerald-500/20", text: "text-emerald-400", ring: "ring-emerald-400/50" },
  chaos:         { letter: "혼", name: "혼돈",   bg: "bg-purple-500/20",  text: "text-purple-400",  ring: "ring-purple-400/50" },
  unknown:       { letter: "?",  name: "기타",   bg: "bg-[var(--color-surface-2)]", text: "text-[var(--color-muted-foreground)]", ring: "ring-[var(--color-border)]" },
}

function getTraitGroup(code: number): TraitGroup {
  if (code === 7000501) return "chaos"   // 벽력: 혼돈 메인 특성
  const sub = Math.floor(code / 100)
  if (sub === 70107) return "chaos"
  if (sub === 71108) return "support"

  const prefix = Math.floor(code / 100000)
  if (prefix === 70) return "havoc"
  if (prefix === 71) return "fortification"
  if (prefix === 72) return "support"
  if (prefix === 73) return "chaos"
  return "unknown"
}

function TraitIconSmall({ code, size = 24 }: { code: number; size?: number }) {
  const [imgError, setImgError] = React.useState(false)
  const group = getTraitGroup(code)
  const config = GROUP_CONFIG[group]

  if (imgError) {
    return (
      <span
        className={cn("inline-flex items-center justify-center rounded-sm shrink-0 font-bold text-[10px]", config.bg, config.text)}
        style={{ width: size, height: size }}
      >
        {config.letter}
      </span>
    )
  }

  return (
    <Image
      src={`/TraitSkill/TraitSkillIcon_${code}.png`}
      alt={String(code)}
      width={size}
      height={size}
      className="shrink-0 rounded-sm"
      onError={() => setImgError(true)}
    />
  )
}

// ─── 헬퍼 컴포넌트 ─────────────────────────────────────────────────────────────

function SectionDivider({ title }: { title: string }) {
  return (
    <div className="flex items-center gap-2 py-1">
      <span className="text-xs font-semibold text-[var(--color-foreground)]">{title}</span>
      <div className="flex-1 h-px bg-[var(--color-border)]" />
    </div>
  )
}

// ─── 피라미드 트리 행 ──────────────────────────────────────────────────────────

function TreeRow({
  options,
  traitNames,
  groupConfig,
}: {
  options: TraitSubOption[]
  traitNames: Record<number, string>
  groupConfig: (typeof GROUP_CONFIG)[TraitGroup]
}) {
  if (options.length === 0) return null
  const maxPick = Math.max(...options.map((o) => o.pickRate))
  return (
    <div className="flex items-center justify-center gap-2 sm:gap-3">
      {options.map((opt, i) => {
        if (opt.code == null) return null
        const isTop = opt.pickRate === maxPick
        return (
          <div key={i} className="flex flex-col items-center shrink-0 gap-1">
            <div className={cn(
              "rounded-full transition-all",
              isTop
                ? `ring-2 ${groupConfig.ring} p-0.5`
                : "opacity-35 grayscale"
            )}>
              <TraitIconSmall code={opt.code} size={isTop ? 36 : 28} />
            </div>
            <span className={cn(
              "text-[10px] font-medium truncate max-w-[56px] text-center",
              isTop ? "text-[var(--color-foreground)]" : "text-[var(--color-muted-foreground)]"
            )}>
              {traitNames[opt.code] ?? opt.code}
            </span>
            <div className="flex gap-1.5">
              <span className={cn("text-[9px]", isTop ? "text-[var(--color-primary)]" : "text-[var(--color-muted-foreground)]")}>
                {opt.pickRate.toFixed(1)}%
              </span>
              <span className={cn("text-[9px]", opt.winRate >= 12.5 ? "text-[var(--color-accent-gold)]" : "text-[var(--color-danger)]")}>
                {opt.winRate.toFixed(1)}%
              </span>
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ─── 요약 패널 행 ──────────────────────────────────────────────────────────────

function SummaryRow({
  option,
  label,
  traitNames,
}: {
  option: TraitSubOption
  label: string
  traitNames: Record<number, string>
}) {
  if (option.code == null) return null
  return (
    <div className="flex items-center gap-2.5 px-3 py-1.5">
      <TraitIconSmall code={option.code} size={24} />
      <div className="flex flex-col min-w-0">
        <span className="text-xs font-medium text-[var(--color-foreground)] truncate">
          {traitNames[option.code] ?? option.code}
        </span>
        <span className="text-[10px] text-[var(--color-muted-foreground)]">{label}</span>
      </div>
      <div className="ml-auto flex items-center gap-2 shrink-0">
        <span className="text-[10px] text-[var(--color-primary)]">{option.pickRate.toFixed(1)}%</span>
        <span className={cn("text-[10px]", option.winRate >= 12.5 ? "text-[var(--color-accent-gold)]" : "text-[var(--color-danger)]")}>
          {option.winRate.toFixed(1)}%
        </span>
      </div>
    </div>
  )
}

// ─── TOP BUILDS (메인특성 컬럼 없는 버전) ─────────────────────────────────────

function TopBuildsTableFiltered({
  builds,
  itemNames,
}: {
  builds: BuildSummary[]
  itemNames: Record<number, string>
}) {
  return (
    <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]/80 overflow-hidden">
      <div className="border-b border-[var(--color-border)] bg-[var(--color-surface-2)] px-4 py-2">
        <span className="text-xs font-semibold text-[var(--color-foreground)]">TOP BUILDS</span>
      </div>

      {/* 모바일 카드 레이아웃 */}
      <div className="sm:hidden divide-y divide-[var(--color-border)]">
        {builds.map((b, i) => (
          <div
            key={i}
            className={cn(
              "px-2.5 py-2 space-y-1.5",
              i === 0 && "bg-[var(--color-accent-gold)]/5"
            )}
          >
            <div className="flex items-center justify-between">
              <span className={cn("text-xs font-bold", i === 0 ? "text-[var(--color-accent-gold)]" : "text-[var(--color-muted-foreground)]")}>
                #{i + 1}
              </span>
              <div className="flex items-center gap-2 text-[11px]">
                <span className="text-[var(--color-foreground)]">픽 {b.pickRate.toFixed(1)}%</span>
                <WinRateSpan winRate={b.winRate} />
              </div>
            </div>
            <div className="flex items-center gap-1 justify-center overflow-x-auto pb-0.5 scrollbar-hide">
              {SLOTS.map((s) => {
                const code = b[s]
                return (
                  <div key={s} className="flex flex-col items-center gap-0.5 shrink-0 min-w-0">
                    <ItemIcon code={code} size={28} />
                    {code != null && (
                      <span className="text-[9px] text-[var(--color-muted-foreground)] max-w-[40px] truncate text-center">
                        {itemNames[code] ?? code}
                      </span>
                    )}
                  </div>
                )
              })}
            </div>
            <div className="flex items-center justify-center gap-2.5 text-[11px] text-[var(--color-foreground)]">
              <span>순위 #{b.averageRank.toFixed(1)}</span>
              <span>RP {b.averageRP.toFixed(0)}</span>
            </div>
          </div>
        ))}
      </div>

      {/* 데스크탑 테이블 레이아웃 */}
      <div className="hidden sm:block overflow-x-auto">
      <table className="w-full text-sm min-w-[640px]">
        <thead>
          <tr className="border-b border-[var(--color-border)] text-[var(--color-muted-foreground)] text-xs">
            <th className="px-3 py-2 text-left font-medium w-8">#</th>
            {SLOTS.map((s) => (
              <th key={s} className="px-2 py-2 text-center font-medium">
                {SLOT_LABELS[s]}
              </th>
            ))}
            <th className="px-3 py-2 text-right font-medium w-16">픽률</th>
            <th className="px-3 py-2 text-right font-medium w-16">승률</th>
            <th className="px-3 py-2 text-right font-medium w-16">평균순위</th>
            <th className="px-3 py-2 text-right font-medium w-16">평균RP</th>
          </tr>
        </thead>
        <tbody>
          {builds.map((b, i) => (
            <tr
              key={i}
              className={cn(
                "border-b border-[var(--color-border)] last:border-0 transition-colors hover:bg-[var(--color-surface-2)]",
                i === 0 && "bg-[var(--color-accent-gold)]/5"
              )}
            >
              <td className="px-3 py-2 text-left">
                <span
                  className={cn(
                    "text-xs font-bold",
                    i === 0
                      ? "text-[var(--color-accent-gold)]"
                      : "text-[var(--color-muted-foreground)]"
                  )}
                >
                  {i + 1}
                </span>
              </td>
              {SLOTS.map((s) => {
                const code = b[s]
                return (
                  <td key={s} className="px-2 py-2 text-center">
                    <div className="flex flex-col items-center gap-0.5">
                      <ItemIcon code={code} size={36} />
                      {code != null && (
                        <span className="text-[9px] text-[var(--color-muted-foreground)] max-w-[52px] truncate">
                          {itemNames[code] ?? code}
                        </span>
                      )}
                    </div>
                  </td>
                )
              })}
              <td className="px-3 py-2 text-right text-xs text-[var(--color-foreground)]">
                {b.pickRate.toFixed(1)}%
              </td>
              <td className="px-3 py-2 text-right text-xs">
                <WinRateSpan winRate={b.winRate} />
              </td>
              <td className="px-3 py-2 text-right text-xs text-[var(--color-foreground)]">
                #{b.averageRank.toFixed(1)}
              </td>
              <td className="px-3 py-2 text-right text-xs text-[var(--color-foreground)]">
                {b.averageRP.toFixed(0)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      </div>
    </div>
  )
}

// ─── 슬롯별 인기 아이템 ────────────────────────────────────────────────────────

function SlotPopularityGrid({
  slotPopularity,
  itemNames,
}: {
  slotPopularity: EquipmentBuildResult["slotPopularity"]
  itemNames: Record<number, string>
}) {
  return (
    <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]/80 overflow-hidden">
      <div className="border-b border-[var(--color-border)] bg-[var(--color-surface-2)] px-4 py-2">
        <span className="text-xs font-semibold text-[var(--color-foreground)]">슬롯별 인기 아이템</span>
      </div>

      {/* 모바일: 슬롯별 가로 스크롤 카드 */}
      <div className="sm:hidden divide-y divide-[var(--color-border)]">
        {SLOTS.map((slot) => {
          const items = slotPopularity[slot]
          if (items.length === 0) return null
          return (
            <div key={slot} className="px-2.5 py-2">
              <p className="text-[11px] font-medium text-[var(--color-muted-foreground)] mb-1.5">
                {SLOT_LABELS[slot]}
              </p>
              <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-hide">
                {items.map((item, i) => (
                  <div
                    key={item.code}
                    className={cn(
                      "flex flex-col items-center gap-0.5 rounded-lg px-1.5 py-1.5 min-w-[52px] shrink-0",
                      i === 0 && "bg-[var(--color-accent-gold)]/5 ring-1 ring-[var(--color-accent-gold)]/20"
                    )}
                  >
                    <ItemIcon code={item.code} size={26} />
                    <span className="text-[9px] text-[var(--color-foreground)] text-center max-w-[48px] truncate leading-tight">
                      {itemNames[item.code] ?? item.code}
                    </span>
                    <span className="text-[9px] text-[var(--color-primary)]">{item.pickRate.toFixed(1)}%</span>
                    <span className="text-[9px] text-[var(--color-foreground)]">
                      {item.winRate.toFixed(1)}%
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )
        })}
      </div>

      {/* 태블릿: 3열 + 2열 그리드 (sm~md) */}
      <div className="hidden sm:block md:hidden">
        <div className="grid grid-cols-3 divide-x divide-[var(--color-border)]">
          {SLOTS.slice(0, 3).map((slot) => {
            const items = slotPopularity[slot]
            return (
              <div key={slot} className="flex flex-col">
                <div className="px-2 py-1.5 text-center text-[11px] font-medium text-[var(--color-muted-foreground)] border-b border-[var(--color-border)] bg-[var(--color-surface-2)]/60">
                  {SLOT_LABELS[slot]}
                </div>
                {items.length === 0 ? (
                  <div className="py-4 text-center text-xs text-[var(--color-muted-foreground)]">-</div>
                ) : (
                  <div className="divide-y divide-[var(--color-border)]/50">
                    {items.map((item, i) => (
                      <div
                        key={item.code}
                        className={cn(
                          "flex flex-col items-center gap-0.5 px-1.5 py-1.5 transition-colors hover:bg-[var(--color-surface-2)]",
                          i === 0 && "bg-[var(--color-accent-gold)]/5"
                        )}
                      >
                        <ItemIcon code={item.code} size={30} />
                        <span className="text-[9px] text-[var(--color-foreground)] text-center max-w-full truncate w-full leading-tight">
                          {itemNames[item.code] ?? item.code}
                        </span>
                        <span className="text-[9px] text-[var(--color-primary)]">{item.pickRate.toFixed(1)}%</span>
                        <WinRateSpan winRate={item.winRate} />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>
        <div className="grid grid-cols-2 divide-x divide-[var(--color-border)] border-t border-[var(--color-border)]">
          {SLOTS.slice(3).map((slot) => {
            const items = slotPopularity[slot]
            return (
              <div key={slot} className="flex flex-col">
                <div className="px-2 py-1.5 text-center text-[11px] font-medium text-[var(--color-muted-foreground)] border-b border-[var(--color-border)] bg-[var(--color-surface-2)]/60">
                  {SLOT_LABELS[slot]}
                </div>
                {items.length === 0 ? (
                  <div className="py-4 text-center text-xs text-[var(--color-muted-foreground)]">-</div>
                ) : (
                  <div className="divide-y divide-[var(--color-border)]/50">
                    {items.map((item, i) => (
                      <div
                        key={item.code}
                        className={cn(
                          "flex flex-col items-center gap-0.5 px-1.5 py-1.5 transition-colors hover:bg-[var(--color-surface-2)]",
                          i === 0 && "bg-[var(--color-accent-gold)]/5"
                        )}
                      >
                        <ItemIcon code={item.code} size={30} />
                        <span className="text-[9px] text-[var(--color-foreground)] text-center max-w-full truncate w-full leading-tight">
                          {itemNames[item.code] ?? item.code}
                        </span>
                        <span className="text-[9px] text-[var(--color-primary)]">{item.pickRate.toFixed(1)}%</span>
                        <WinRateSpan winRate={item.winRate} />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* 데스크탑: 5열 그리드 (md+) */}
      <div className="hidden md:block">
        <div className="grid grid-cols-5 divide-x divide-[var(--color-border)]">
          {SLOTS.map((slot) => {
            const items = slotPopularity[slot]
            return (
              <div key={slot} className="flex flex-col min-w-[84px] flex-1">
                <div className="px-3 py-2 text-center text-xs font-medium text-[var(--color-muted-foreground)] border-b border-[var(--color-border)] bg-[var(--color-surface-2)]/60">
                  {SLOT_LABELS[slot]}
                </div>
                {items.length === 0 ? (
                  <div className="py-6 text-center text-xs text-[var(--color-muted-foreground)]">-</div>
                ) : (
                  <div className="divide-y divide-[var(--color-border)]/50">
                    {items.map((item, i) => (
                      <div
                        key={item.code}
                        className={cn(
                          "flex flex-col items-center gap-1 px-2 py-2 transition-colors hover:bg-[var(--color-surface-2)]",
                          i === 0 && "bg-[var(--color-accent-gold)]/5"
                        )}
                      >
                        <ItemIcon code={item.code} size={34} />
                        <span className="text-[9px] text-[var(--color-foreground)] text-center max-w-full truncate w-full leading-tight">
                          {itemNames[item.code] ?? item.code}
                        </span>
                        <span className="text-[9px] text-[var(--color-primary)]">
                          {item.pickRate.toFixed(1)}%
                        </span>
                        <WinRateSpan winRate={item.winRate} />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// ─── 메인 컴포넌트 ─────────────────────────────────────────────────────────────

export function CharacterDetailedAnalyzer({ characterCode, tier, patchVersion, bestWeapon }: Props) {
  const [traitBuilds, setTraitBuilds] = React.useState<TraitMainGroupData[]>([])
  const [selectedComboIdx, setSelectedComboIdx] = React.useState<number>(-1)
  const [equipData, setEquipData] = React.useState<EquipmentBuildResult | null>(null)
  const [traitLoading, setTraitLoading] = React.useState(false)
  const [equipLoading, setEquipLoading] = React.useState(false)
  const [traitNames, setTraitNames] = React.useState<Record<number, string>>({})
  const itemNames = itemNameMap as Record<number, string>

  // 특성 이름 사전 로드 (최초 1회)
  React.useEffect(() => {
    fetch("/api/traits/names")
      .then((r) => r.json())
      .then((d) => setTraitNames(d.names ?? {}))
      .catch(() => {})
  }, [])

  // 메인 특성 그룹 로드
  React.useEffect(() => {
    if (!patchVersion) return

    setTraitLoading(true)
    setTraitBuilds([])
    setSelectedComboIdx(-1)
    setEquipData(null)

    const params = new URLSearchParams({
      characterCode: String(characterCode),
      tier,
      patchVersion,
      ...(bestWeapon != null ? { bestWeapon: String(bestWeapon) } : {}),
    })

    fetch(`/api/builds/traits/main?${params}`)
      .then((r) => r.json())
      .then((d) => {
        const builds: TraitMainGroupData[] = d.builds ?? []
        setTraitBuilds(builds)
        if (builds.length > 0) {
          setSelectedComboIdx(0)
        }
      })
      .catch(() => setTraitBuilds([]))
      .finally(() => setTraitLoading(false))
  }, [characterCode, tier, patchVersion, bestWeapon])

  // 장비 빌드 로드 (조합 선택 시 — 가장 인기 있는 mainCore 기준)
  const selectedGroup = selectedComboIdx >= 0 ? traitBuilds[selectedComboIdx] ?? null : null
  const selectedMainCore = selectedGroup?.mainCoreOptions.reduce<TraitSubOption | null>((best, o) => !best || o.pickRate > best.pickRate ? o : best, null)?.code ?? null

  React.useEffect(() => {
    if (selectedComboIdx < 0 || !patchVersion || selectedMainCore == null) return

    setEquipLoading(true)
    setEquipData(null)

    const params = new URLSearchParams({
      characterCode: String(characterCode),
      tier,
      patchVersion,
      mainCore: String(selectedMainCore),
      ...(bestWeapon != null ? { bestWeapon: String(bestWeapon) } : {}),
    })

    fetch(`/api/builds/equipment?${params}`)
      .then((r) => r.json())
      .then((d) => setEquipData(d))
      .catch(() => setEquipData(null))
      .finally(() => setEquipLoading(false))
  }, [selectedComboIdx, selectedMainCore, characterCode, tier, patchVersion, bestWeapon])

  const sortedTopBuilds = React.useMemo(() => {
    if (!equipData?.topBuilds) return []
    return [...equipData.topBuilds].sort((a, b) => b.averageRP - a.averageRP)
  }, [equipData])

  // ── 로딩 ─────────────────────────────────────────────────────────────────────
  if (traitLoading) {
    return (
      <div className="space-y-3">
        <div className="h-10 rounded-lg bg-[var(--color-surface)] animate-pulse" />
        <div className="h-40 rounded-lg bg-[var(--color-surface)] animate-pulse" />
        <div className="h-40 rounded-lg bg-[var(--color-surface)] animate-pulse" />
      </div>
    )
  }

  // ── 데이터 없음 ──────────────────────────────────────────────────────────────
  if (traitBuilds.length === 0) {
    return (
      <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]/80 p-8 flex flex-col items-center gap-2 text-[var(--color-muted-foreground)]">
        <Layers className="h-8 w-8 opacity-40" />
        <p className="text-sm">상세분석 데이터가 없습니다.</p>
      </div>
    )
  }

  const hasPrimaryTraits =
    selectedGroup &&
    (selectedGroup.sub1Options.length > 0 || selectedGroup.sub2Options.length > 0)

  const hasSecondaryTraits =
    selectedGroup &&
    selectedGroup.secondaries.length > 0

  const hasEquipData =
    equipData &&
    (equipData.topBuilds.length > 0 ||
      SLOTS.some((s) => equipData.slotPopularity[s].length > 0))

  return (
    <div className="space-y-4">
      {/* 주특성 그룹 선택 */}
      <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]/80 p-2.5 sm:p-4">
        <p className="mb-1.5 sm:mb-3 text-[11px] sm:text-xs font-semibold text-[var(--color-muted-foreground)]">주특성</p>

        <div className="flex gap-1.5 sm:gap-2 overflow-x-auto sm:overflow-x-visible pb-1 sm:pb-0 scrollbar-hide sm:flex-wrap">
          {traitBuilds.map((group, i) => {
            const isSelected = selectedComboIdx === i
            const mConfig = GROUP_CONFIG[group.mainGroup]
            const topCore = group.mainCoreOptions.reduce<TraitSubOption | null>((best, o) => !best || o.pickRate > best.pickRate ? o : best, null)?.code
            const barWidth = group.groupPickRate
            return (
              <button
                key={i}
                onClick={() => setSelectedComboIdx(i)}
                className={cn(
                  "flex flex-col rounded-lg border px-2 sm:px-3 py-1.5 sm:py-2 text-[11px] sm:text-xs transition-colors min-w-[90px] sm:min-w-[100px] shrink-0 sm:shrink touch-manipulation",
                  isSelected
                    ? "border-[var(--color-primary)] bg-[var(--color-primary)]/15 text-[var(--color-primary)]"
                    : "border-[var(--color-border)] bg-[var(--color-surface-2)] text-[var(--color-foreground)] active:border-[var(--color-primary)]/50 sm:hover:border-[var(--color-primary)]/50"
                )}
              >
                <div className="flex items-center gap-1.5">
                  {topCore != null &&<TraitIconSmall code={topCore} size={22} />}
                  <span className={cn("font-medium", mConfig.text)}>{mConfig.name}</span>
                </div>
                <div className="flex items-center gap-1 sm:gap-2 mt-0.5">
                  <span className={cn("text-[9px] sm:text-[10px]", isSelected ? "text-[var(--color-primary)]/80" : "text-[var(--color-muted-foreground)]")}>
                    픽 {group.groupPickRate.toFixed(1)}%
                  </span>
                  <span className={cn("text-[9px] sm:text-[10px]", group.groupWinRate >= 12.5 ? "text-[var(--color-accent-gold)]" : "text-[var(--color-danger)]")}>
                    승 {group.groupWinRate.toFixed(1)}%
                  </span>
                </div>
                <div className="mt-0.5 sm:mt-1 h-0.5 sm:h-1 w-full rounded-full bg-[var(--color-border)]">
                  <div
                    className={cn("h-full rounded-full transition-all", isSelected ? "bg-[var(--color-primary)]" : "bg-[var(--color-muted-foreground)]")}
                    style={{ width: `${barWidth}%` }}
                  />
                </div>
              </button>
            )
          })}
        </div>

        {/* 선택된 조합 요약 */}
        {selectedGroup && (
          <div className="mt-2 sm:mt-3 flex items-center justify-between sm:justify-start gap-2 sm:gap-4 rounded-md bg-[var(--color-surface-2)] border border-[var(--color-border)] px-2.5 sm:px-4 py-2">
            <div className="flex items-center gap-1">
              <span className="text-[10px] sm:text-xs text-[var(--color-muted-foreground)]">총</span>
              <span className="text-[10px] sm:text-xs font-bold text-[var(--color-foreground)]">{selectedGroup.totalGames.toLocaleString()}판</span>
            </div>
            <div className="h-3 w-px bg-[var(--color-border)]" />
            <div className="flex items-center gap-1">
              <span className="text-[10px] sm:text-xs text-[var(--color-muted-foreground)]">픽률</span>
              <span className="text-[10px] sm:text-xs font-bold text-[var(--color-primary)]">{selectedGroup.groupPickRate.toFixed(1)}%</span>
            </div>
            <div className="h-3 w-px bg-[var(--color-border)]" />
            <div className="flex items-center gap-1">
              <span className="text-[10px] sm:text-xs text-[var(--color-muted-foreground)]">승률</span>
              <span className={cn(
                "text-[10px] sm:text-xs font-bold",
                selectedGroup.groupWinRate >= 12.5 ? "text-[var(--color-accent-gold)]" : "text-[var(--color-danger)]"
              )}>
                {selectedGroup.groupWinRate.toFixed(1)}%
              </span>
            </div>
          </div>
        )}
      </div>

      {/* 선택된 조합 상세 */}
      {selectedGroup && (
        <>
          {/* 특성 트리 + 요약 */}
          {(hasPrimaryTraits || hasSecondaryTraits) && (() => {
            const mainConfig = GROUP_CONFIG[selectedGroup.mainGroup]
            const topMainCore = selectedGroup.mainCoreOptions.reduce<TraitSubOption | null>((best, o) => !best || o.pickRate > best.pickRate ? o : best, null)?.code

            return (
              <div className="space-y-4">
                <div className="flex flex-col lg:flex-row gap-4">
                  {/* 왼쪽: 주특성 트리 */}
                  <div className="flex-1 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]/80 p-4 sm:p-5">
                    {hasPrimaryTraits && (
                      <div className="flex flex-col items-center gap-3">
                        {topMainCore != null &&(
                          <div className={cn("rounded-full p-1 ring-2", mainConfig.ring)}>
                            <TraitIconSmall code={topMainCore} size={40} />
                          </div>
                        )}
                        <TreeRow options={selectedGroup.mainCoreOptions} traitNames={traitNames} groupConfig={mainConfig} />
                        <TreeRow options={selectedGroup.sub1Options} traitNames={traitNames} groupConfig={mainConfig} />
                        <TreeRow options={selectedGroup.sub2Options} traitNames={traitNames} groupConfig={mainConfig} />
                      </div>
                    )}
                  </div>

                  {/* 오른쪽: 주특성 요약 */}
                  <div className="lg:w-[240px] shrink-0 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]/80 overflow-hidden self-start">
                    {hasPrimaryTraits && (
                      <>
                        <div className={cn("flex items-center gap-2 px-3 py-2 border-b border-[var(--color-border)]", mainConfig.bg)}>
                          {topMainCore != null &&<TraitIconSmall code={topMainCore} size={18} />}
                          <span className={cn("text-xs font-bold", mainConfig.text)}>
                            주 특성: {mainConfig.name}
                          </span>
                        </div>
                        <div className="py-1 divide-y divide-[var(--color-border)]/30">
                          {(() => { const top = [...selectedGroup.sub1Options].sort((a, b) => b.pickRate - a.pickRate)[0]; return top ? <SummaryRow option={top} label={`${mainConfig.name}, 핵심`} traitNames={traitNames} /> : null })()}
                          {(() => { const top = [...selectedGroup.sub2Options].sort((a, b) => b.pickRate - a.pickRate)[0]; return top ? <SummaryRow option={top} label={`${mainConfig.name}, 보조`} traitNames={traitNames} /> : null })()}
                        </div>
                      </>
                    )}
                  </div>
                </div>

                {/* 부특성 3열 동시 표시 */}
                {hasSecondaryTraits && (
                  <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]/80 overflow-hidden">
                    <div className="px-3 sm:px-4 py-2 border-b border-[var(--color-border)] bg-[var(--color-surface-2)]/60">
                      <span className="text-[11px] sm:text-xs font-semibold text-[var(--color-muted-foreground)]">부특성 조합</span>
                    </div>
                    <div className={cn(
                      "grid gap-px bg-[var(--color-border)]/30",
                      selectedGroup.secondaries.length === 1 && "grid-cols-1",
                      selectedGroup.secondaries.length === 2 && "grid-cols-2",
                      selectedGroup.secondaries.length >= 3 && "grid-cols-1 sm:grid-cols-3",
                    )}>
                      {selectedGroup.secondaries.map((sec, si) => {
                        const secConfig = GROUP_CONFIG[sec.secGroup]
                        return (
                          <div key={si} className="bg-[var(--color-surface)]/80 p-3 sm:p-4">
                            {/* 부특성 그룹 헤더 */}
                            <div className="flex items-center justify-between mb-3">
                              <div className="flex items-center gap-2">
                                <div className={cn("flex items-center justify-center rounded-full h-6 w-6", secConfig.bg)}>
                                  <span className={cn("text-xs font-black", secConfig.text)}>{secConfig.letter}</span>
                                </div>
                                <span className={cn("text-xs font-bold", secConfig.text)}>{secConfig.name}</span>
                              </div>
                              <div className="flex gap-2 text-[10px]">
                                <span className="text-[var(--color-muted-foreground)]">픽 {sec.pickRate.toFixed(0)}%</span>
                                <span className={cn(sec.winRate >= 12.5 ? "text-[var(--color-accent-gold)]" : "text-[var(--color-danger)]")}>
                                  승 {sec.winRate.toFixed(1)}%
                                </span>
                              </div>
                            </div>
                            {/* 부특성 트리 */}
                            <div className="flex flex-col items-center gap-2">
                              <TreeRow options={sec.optionTrait1Options} traitNames={traitNames} groupConfig={secConfig} />
                              <TreeRow options={sec.optionTrait2Options} traitNames={traitNames} groupConfig={secConfig} />
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}
              </div>
            )
          })()}

          {/* 아이템 빌드 */}
          {equipLoading ? (
            <div className="space-y-3">
              <div className="h-40 rounded-lg bg-[var(--color-surface)] animate-pulse" />
              <div className="h-60 rounded-lg bg-[var(--color-surface)] animate-pulse" />
            </div>
          ) : hasEquipData ? (
            <div className="space-y-4">
              <SectionDivider title="아이템 빌드" />
              {equipData!.topBuilds.length > 0 && (
                <TopBuildsTableFiltered
                  builds={sortedTopBuilds}
                  itemNames={itemNames}
                />
              )}
              {SLOTS.some((s) => equipData!.slotPopularity[s].length > 0) && (
                <SlotPopularityGrid
                  slotPopularity={equipData!.slotPopularity}
                  itemNames={itemNames}
                />
              )}
            </div>
          ) : (
            <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]/80 p-6 text-center text-sm text-[var(--color-muted-foreground)]">
              이 특성의 아이템 빌드 데이터가 없습니다.
            </div>
          )}
        </>
      )}
    </div>
  )
}
