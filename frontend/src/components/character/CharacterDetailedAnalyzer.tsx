"use client"

import * as React from "react"
import Image from "next/image"
import { TierGroup } from "@/utils/tier"
import { cn } from "@/lib/utils"
import itemImageMap from "@/../const/itemImageMap.json"
import type { EquipmentBuildResult, BuildSummary } from "@/app/api/builds/equipment/route"

// ─── 타입 ──────────────────────────────────────────────────────────────────────

interface TraitSubOption {
  code: number | null
  totalGames: number
  pickRate: number
  winRate: number
}

interface TraitCoreGroup {
  mainCore: number | null
  totalGames: number
  groupPickRate: number
  groupWinRate: number
  sub1Options: TraitSubOption[]
  sub2Options: TraitSubOption[]
  sub3Options: TraitSubOption[]
  sub4Options: TraitSubOption[]
}

interface Props {
  characterCode: number
  tier: TierGroup
  patchVersion: string | null
  bestWeapon: number | null
}

// ─── 상수 ──────────────────────────────────────────────────────────────────────

const SLOTS = ["weapon", "chest", "head", "arm", "leg"] as const

const SLOT_LABELS: Record<string, string> = {
  weapon: "무기",
  chest: "갑옷",
  head: "머리",
  arm: "팔",
  leg: "다리",
}

// ─── 헬퍼 컴포넌트 ─────────────────────────────────────────────────────────────

function ItemIcon({ code, size = 32 }: { code: number | null; size?: number }) {
  if (code == null) {
    return (
      <div
        className="rounded bg-[var(--color-surface-2)] border border-[var(--color-border)]"
        style={{ width: size, height: size }}
      />
    )
  }

  const imgPath = (itemImageMap as Record<string, string>)[String(code)]
  if (!imgPath) {
    return (
      <div
        className="rounded bg-[var(--color-surface-2)] border border-[var(--color-border)] flex items-center justify-center"
        style={{ width: size, height: size }}
      >
        <span className="text-[8px] text-[var(--color-muted-foreground)]">?</span>
      </div>
    )
  }

  return (
    <Image
      src={imgPath}
      alt={String(code)}
      width={size}
      height={size}
      className="rounded object-contain"
      unoptimized
    />
  )
}

function WinRateSpan({ winRate }: { winRate: number }) {
  return (
    <span
      className={cn(
        "font-medium",
        winRate >= 55 ? "text-[var(--color-accent-gold)]" : "text-[var(--color-muted-foreground)]"
      )}
    >
      {winRate.toFixed(1)}%
    </span>
  )
}

function SectionDivider({ title }: { title: string }) {
  return (
    <div className="flex items-center gap-2 py-1">
      <span className="text-xs font-semibold text-[var(--color-foreground)]">{title}</span>
      <div className="flex-1 h-px bg-[var(--color-border)]" />
    </div>
  )
}

// ─── 서브 특성 슬롯 ────────────────────────────────────────────────────────────

function SubSlotRow({
  label,
  options,
  traitNames,
}: {
  label: string
  options: TraitSubOption[]
  traitNames: Record<number, string>
}) {
  if (options.length === 0) return null
  return (
    <div className="flex items-start gap-3 px-4 py-2">
      <span className="shrink-0 text-[10px] font-medium text-[var(--color-muted-foreground)] pt-1 w-10">
        {label}
      </span>
      <div className="flex flex-wrap gap-3">
        {options.map((opt, i) => {
          if (opt.code == null) return null
          return (
            <div key={i} className="flex flex-col items-center gap-0.5">
              <span className="inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium bg-[var(--color-surface-2)] text-[var(--color-foreground)]">
                {traitNames[opt.code] ?? opt.code}
              </span>
              <span className="text-[10px] whitespace-nowrap flex gap-1">
                <span className="text-[var(--color-primary)]">{opt.pickRate.toFixed(1)}%</span>
                <span
                  className={cn(
                    opt.winRate >= 55
                      ? "text-[var(--color-accent-gold)]"
                      : "text-[var(--color-muted-foreground)]"
                  )}
                >
                  {opt.winRate.toFixed(1)}%
                </span>
              </span>
            </div>
          )
        })}
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
    <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] overflow-hidden">
      <div className="border-b border-[var(--color-border)] bg-[var(--color-surface-2)] px-4 py-2">
        <span className="text-xs font-semibold text-[var(--color-foreground)]">TOP BUILDS</span>
      </div>
      <div className="overflow-x-auto">
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
                      <ItemIcon code={code} size={32} />
                      {code != null && (
                        <span className="text-[9px] text-[var(--color-muted-foreground)] max-w-[48px] truncate">
                          {itemNames[code] ?? code}
                        </span>
                      )}
                    </div>
                  </td>
                )
              })}
              <td className="px-3 py-2 text-right text-xs text-[var(--color-muted-foreground)]">
                {b.pickRate.toFixed(1)}%
              </td>
              <td className="px-3 py-2 text-right text-xs">
                <WinRateSpan winRate={b.winRate} />
              </td>
              <td className="px-3 py-2 text-right text-xs text-[var(--color-muted-foreground)]">
                #{b.averageRank.toFixed(1)}
              </td>
              <td className="px-3 py-2 text-right text-xs text-[var(--color-muted-foreground)]">
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
    <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] overflow-hidden">
      <div className="border-b border-[var(--color-border)] bg-[var(--color-surface-2)] px-4 py-2">
        <span className="text-xs font-semibold text-[var(--color-foreground)]">슬롯별 인기 아이템</span>
      </div>
      <div className="grid grid-cols-3 sm:grid-cols-5 divide-x divide-[var(--color-border)]">
        {SLOTS.map((slot) => {
          const items = slotPopularity[slot]
          return (
            <div key={slot} className="flex flex-col">
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
                      <ItemIcon code={item.code} size={28} />
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
  )
}

// ─── 메인 컴포넌트 ─────────────────────────────────────────────────────────────

export function CharacterDetailedAnalyzer({ characterCode, tier, patchVersion, bestWeapon }: Props) {
  const [traitBuilds, setTraitBuilds] = React.useState<TraitCoreGroup[]>([])
  const [selectedMainCore, setSelectedMainCore] = React.useState<number | null | "NONE">("NONE")
  const [equipData, setEquipData] = React.useState<EquipmentBuildResult | null>(null)
  const [traitLoading, setTraitLoading] = React.useState(false)
  const [equipLoading, setEquipLoading] = React.useState(false)
  const [traitNames, setTraitNames] = React.useState<Record<number, string>>({})
  const [itemNames, setItemNames] = React.useState<Record<number, string>>({})

  // 이름 사전 로드 (최초 1회, 병렬)
  React.useEffect(() => {
    fetch("/api/traits/names")
      .then((r) => r.json())
      .then((d) => setTraitNames(d.names ?? {}))
      .catch(() => {})

    fetch("/api/items/names")
      .then((r) => r.json())
      .then((d) => setItemNames(d.names ?? {}))
      .catch(() => {})
  }, [])

  // 메인 특성 그룹 로드
  React.useEffect(() => {
    if (!patchVersion) return

    setTraitLoading(true)
    setTraitBuilds([])
    setSelectedMainCore("NONE")
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
        const builds: TraitCoreGroup[] = d.builds ?? []
        setTraitBuilds(builds)
        if (builds.length > 0) {
          setSelectedMainCore(builds[0].mainCore)
        }
      })
      .catch(() => setTraitBuilds([]))
      .finally(() => setTraitLoading(false))
  }, [characterCode, tier, patchVersion, bestWeapon])

  // 장비 빌드 로드 (mainCore 선택 시)
  React.useEffect(() => {
    if (selectedMainCore === "NONE" || !patchVersion) return

    setEquipLoading(true)
    setEquipData(null)

    const params = new URLSearchParams({
      characterCode: String(characterCode),
      tier,
      patchVersion,
      mainCore: selectedMainCore == null ? "null" : String(selectedMainCore),
      ...(bestWeapon != null ? { bestWeapon: String(bestWeapon) } : {}),
    })

    fetch(`/api/builds/equipment?${params}`)
      .then((r) => r.json())
      .then((d) => setEquipData(d))
      .catch(() => setEquipData(null))
      .finally(() => setEquipLoading(false))
  }, [selectedMainCore, characterCode, tier, patchVersion, bestWeapon])

  const selectedGroup =
    selectedMainCore !== "NONE"
      ? traitBuilds.find((g) => g.mainCore === selectedMainCore) ?? null
      : null

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
      <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-8 text-center text-sm text-[var(--color-muted-foreground)]">
        상세분석 데이터가 없습니다.
      </div>
    )
  }

  const hasSubOptions =
    selectedGroup &&
    (selectedGroup.sub1Options.length > 0 ||
      selectedGroup.sub2Options.length > 0 ||
      selectedGroup.sub3Options.length > 0 ||
      selectedGroup.sub4Options.length > 0)

  const hasEquipData =
    equipData &&
    (equipData.topBuilds.length > 0 ||
      SLOTS.some((s) => equipData.slotPopularity[s].length > 0))

  return (
    <div className="space-y-4">
      {/* 메인 특성 선택 */}
      <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
        <p className="mb-3 text-xs font-semibold text-[var(--color-muted-foreground)]">메인 특성</p>
        <div className="flex flex-wrap gap-2">
          {traitBuilds.map((group, i) => {
            const isSelected = selectedMainCore === group.mainCore
            const name =
              group.mainCore != null
                ? (traitNames[group.mainCore] ?? String(group.mainCore))
                : "특성 없음"
            return (
              <button
                key={i}
                onClick={() => setSelectedMainCore(group.mainCore)}
                className={cn(
                  "flex flex-col items-center rounded-lg border px-3 py-2 text-xs transition-colors",
                  isSelected
                    ? "border-[var(--color-primary)] bg-[var(--color-primary)]/15 text-[var(--color-primary)]"
                    : "border-[var(--color-border)] bg-[var(--color-surface-2)] text-[var(--color-foreground)] hover:border-[var(--color-primary)]/50"
                )}
              >
                <span className="font-medium">{name}</span>
                <span
                  className={cn(
                    "text-[10px] mt-0.5",
                    isSelected
                      ? "text-[var(--color-primary)]/80"
                      : "text-[var(--color-muted-foreground)]"
                  )}
                >
                  픽률 {group.groupPickRate.toFixed(1)}%
                </span>
              </button>
            )
          })}
        </div>
      </div>

      {/* 선택된 특성 상세 */}
      {selectedMainCore !== "NONE" && (
        <>
          {/* 서브 특성 순위 */}
          {hasSubOptions && (
            <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] overflow-hidden">
              <div className="border-b border-[var(--color-border)] bg-[var(--color-surface-2)] px-4 py-2">
                <span className="text-xs font-semibold text-[var(--color-foreground)]">서브 특성 순위</span>
              </div>
              <div className="py-2 divide-y divide-[var(--color-border)]/40">
                <SubSlotRow
                  label="서브1"
                  options={selectedGroup!.sub1Options}
                  traitNames={traitNames}
                />
                <SubSlotRow
                  label="서브2"
                  options={selectedGroup!.sub2Options}
                  traitNames={traitNames}
                />
                <SubSlotRow
                  label="서브3"
                  options={selectedGroup!.sub3Options}
                  traitNames={traitNames}
                />
                <SubSlotRow
                  label="서브4"
                  options={selectedGroup!.sub4Options}
                  traitNames={traitNames}
                />
              </div>
            </div>
          )}

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
                  builds={equipData!.topBuilds}
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
            <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-6 text-center text-sm text-[var(--color-muted-foreground)]">
              이 특성의 아이템 빌드 데이터가 없습니다.
            </div>
          )}
        </>
      )}
    </div>
  )
}
