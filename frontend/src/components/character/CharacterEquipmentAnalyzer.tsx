"use client"

import * as React from "react"
import { TierGroup } from "@/utils/tier"
import { cn } from "@/lib/utils"
import itemNameMap from "@/../const/itemNameMap.json"
import type { EquipmentBuildResult, BuildSummary, SlotItem, CoreItem } from "@/app/api/builds/equipment/route"
import { ItemIcon, WinRateSpan, SLOTS, SLOT_LABELS } from "./shared"

interface Props {
  characterCode: number
  tier: TierGroup
  patchVersion: string | null
  bestWeapon?: number | null
}

function SectionHeader({ title }: { title: string }) {
  return (
    <div className="border-b border-[var(--color-border)] bg-[var(--color-surface-2)] px-3 sm:px-4 py-2">
      <span className="text-xs font-semibold text-[var(--color-foreground)]">{title}</span>
    </div>
  )
}

function TopBuildsTable({
  builds,
  itemNames,
  traitNames,
}: {
  builds: BuildSummary[]
  itemNames: Record<number, string>
  traitNames: Record<number, string>
}) {
  return (
    <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]/80 overflow-hidden">
      <SectionHeader title="TOP BUILDS" />

      {/* 모바일 카드 레이아웃 (<640px) */}
      <div className="sm:hidden divide-y divide-[var(--color-border)]">
        {builds.map((b, i) => (
          <div
            key={i}
            className={cn(
              "px-3 py-2 space-y-1.5",
              i === 0 && "bg-[var(--color-accent-gold)]/5"
            )}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className={cn("text-xs font-bold", i === 0 ? "text-[var(--color-accent-gold)]" : "text-[var(--color-muted-foreground)]")}>
                  #{i + 1}
                </span>
                {b.mainCore != null && (
                  <span className="inline-flex items-center rounded-md px-1.5 py-0.5 text-[10px] font-medium bg-[var(--color-primary)]/20 text-[var(--color-primary)] ring-1 ring-[var(--color-primary)]/40">
                    {traitNames[b.mainCore] ?? b.mainCore}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-3 text-[10px]">
                <span className="text-[var(--color-muted-foreground)]">픽 {b.pickRate.toFixed(1)}%</span>
                <WinRateSpan winRate={b.winRate} />
              </div>
            </div>
            <div className="flex items-center gap-1.5 justify-center">
              {SLOTS.map((s) => {
                const code = b[s]
                return (
                  <div key={s} className="flex flex-col items-center gap-0.5">
                    <ItemIcon code={code} size={32} />
                    {code != null && (
                      <span className="text-[8px] text-[var(--color-muted-foreground)] max-w-[44px] truncate">
                        {itemNames[code] ?? code}
                      </span>
                    )}
                  </div>
                )
              })}
            </div>
            <div className="flex items-center justify-center gap-3 text-[10px] text-[var(--color-muted-foreground)]">
              <span>순위 #{b.averageRank.toFixed(1)}</span>
              <span>RP {b.averageRP.toFixed(0)}</span>
            </div>
          </div>
        ))}
      </div>

      {/* 태블릿 컴팩트 테이블 (640px~1024px) */}
      <div className="hidden sm:block lg:hidden overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-[var(--color-border)] text-[var(--color-muted-foreground)]">
              <th className="px-2 py-2 text-left font-medium w-6">#</th>
              <th className="px-1.5 py-2 text-center font-medium">특성</th>
              {SLOTS.map((s) => (
                <th key={s} className="px-1 py-2 text-center font-medium">{SLOT_LABELS[s]}</th>
              ))}
              <th className="px-2 py-2 text-right font-medium">픽률</th>
              <th className="px-2 py-2 text-right font-medium">승률</th>
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
                <td className="px-2 py-1.5 text-left">
                  <span className={cn("font-bold", i === 0 ? "text-[var(--color-accent-gold)]" : "text-[var(--color-muted-foreground)]")}>
                    {i + 1}
                  </span>
                </td>
                <td className="px-1.5 py-1.5 text-center">
                  {b.mainCore != null ? (
                    <span className="inline-flex items-center rounded-md px-1.5 py-0.5 text-[10px] font-medium bg-[var(--color-primary)]/20 text-[var(--color-primary)] ring-1 ring-[var(--color-primary)]/40 whitespace-nowrap">
                      {traitNames[b.mainCore] ?? b.mainCore}
                    </span>
                  ) : (
                    <span className="text-[var(--color-muted-foreground)]">—</span>
                  )}
                </td>
                {SLOTS.map((s) => {
                  const code = b[s]
                  return (
                    <td key={s} className="px-1 py-1.5 text-center">
                      <div className="flex flex-col items-center gap-0.5">
                        <ItemIcon code={code} size={28} />
                      </div>
                    </td>
                  )
                })}
                <td className="px-2 py-1.5 text-right text-[var(--color-muted-foreground)]">
                  {b.pickRate.toFixed(1)}%
                </td>
                <td className="px-2 py-1.5 text-right">
                  <WinRateSpan winRate={b.winRate} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* 데스크탑 풀 테이블 (≥1024px) */}
      <div className="hidden lg:block overflow-x-auto">
      <table className="w-full text-sm min-w-[640px]">
        <thead>
          <tr className="border-b border-[var(--color-border)] text-[var(--color-muted-foreground)] text-xs">
            <th className="px-3 py-2 text-left font-medium w-8">#</th>
            <th className="px-2 py-2 text-center font-medium">메인특성</th>
            {SLOTS.map((s) => (
              <th key={s} className="px-2 py-2 text-center font-medium">{SLOT_LABELS[s]}</th>
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
                    i === 0 ? "text-[var(--color-accent-gold)]" : "text-[var(--color-muted-foreground)]"
                  )}
                >
                  {i + 1}
                </span>
              </td>
              {/* 메인특성 */}
              <td className="px-2 py-2 text-center">
                {b.mainCore != null ? (
                  <span className="inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium bg-[var(--color-primary)]/20 text-[var(--color-primary)] ring-1 ring-[var(--color-primary)]/40 whitespace-nowrap">
                    {traitNames[b.mainCore] ?? b.mainCore}
                  </span>
                ) : (
                  <span className="text-xs text-[var(--color-muted-foreground)]">—</span>
                )}
              </td>
              {SLOTS.map((s) => {
                const code = b[s]
                return (
                  <td key={s} className="px-2 py-2 text-center">
                    <div className="flex flex-col items-center gap-0.5">
                      <ItemIcon code={code} size={36} />
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

function SlotPopularityGrid({
  slotPopularity,
  itemNames,
}: {
  slotPopularity: EquipmentBuildResult["slotPopularity"]
  itemNames: Record<number, string>
}) {
  return (
    <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]/80 overflow-hidden">
      <SectionHeader title="슬롯별 인기 아이템" />

      {/* 모바일: 슬롯별 가로 리스트 (스크롤 없음) */}
      <div className="md:hidden divide-y divide-[var(--color-border)]">
        {SLOTS.map((slot) => {
          const items = slotPopularity[slot]
          if (items.length === 0) return null
          return (
            <div key={slot} className="px-3 py-2.5">
              <p className="text-[10px] font-medium text-[var(--color-muted-foreground)] mb-2">
                {SLOT_LABELS[slot]}
              </p>
              <div className="flex gap-2 overflow-x-auto pb-1">
                {items.map((item, i) => (
                  <div
                    key={item.code}
                    className={cn(
                      "flex flex-col items-center gap-0.5 rounded-lg px-2 py-1.5 min-w-[56px] shrink-0",
                      i === 0 && "bg-[var(--color-accent-gold)]/5 ring-1 ring-[var(--color-accent-gold)]/20"
                    )}
                  >
                    <ItemIcon code={item.code} size={30} />
                    <span className="text-[8px] text-[var(--color-foreground)] text-center max-w-[52px] truncate leading-tight">
                      {itemNames[item.code] ?? item.code}
                    </span>
                    <span className="text-[8px] text-[var(--color-primary)]">{item.pickRate.toFixed(1)}%</span>
                    <span className={cn(
                      "text-[8px]",
                      item.winRate >= 55 ? "text-[var(--color-accent-gold)]" : "text-[var(--color-muted-foreground)]"
                    )}>
                      {item.winRate.toFixed(1)}%
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )
        })}
      </div>

      {/* 태블릿+: 5열 그리드 */}
      <div className="hidden md:block">
        <div className="grid grid-cols-5 divide-x divide-[var(--color-border)]">
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
                        <ItemIcon code={item.code} size={34} />
                        <span className="text-[9px] text-[var(--color-foreground)] text-center max-w-full truncate w-full leading-tight">
                          {itemNames[item.code] ?? item.code}
                        </span>
                        <span className="text-[9px] text-[var(--color-primary)]">픽률 {item.pickRate.toFixed(1)}%</span>
                        <WinRateSpan winRate={item.winRate} label="승률 " />
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

function CoreItemsList({
  coreItems,
  itemNames,
}: {
  coreItems: CoreItem[]
  itemNames: Record<number, string>
}) {
  return (
    <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]/80 overflow-hidden">
      <SectionHeader title="코어 아이템" />
      <div className="divide-y divide-[var(--color-border)]">
        {coreItems.map((item, i) => (
          <div
            key={item.code}
            className={cn(
              "px-3 md:px-4 py-2.5 hover:bg-[var(--color-surface-2)] transition-colors",
              i === 0 && "bg-[var(--color-accent-gold)]/5"
            )}
          >
            {/* 모바일: 컴팩트 2줄 (<640px) */}
            <div className="sm:hidden flex flex-col gap-1.5">
              <div className="flex items-center gap-2">
                <span className={cn("w-5 shrink-0 text-xs font-bold text-center", i === 0 ? "text-[var(--color-accent-gold)]" : "text-[var(--color-muted-foreground)]")}>
                  {i + 1}
                </span>
                <ItemIcon code={item.code} size={28} />
                <span className="flex-1 text-sm text-[var(--color-foreground)] truncate">
                  {itemNames[item.code] ?? item.code}
                </span>
              </div>
              <div className="flex items-center gap-3 pl-7 text-[10px]">
                <span className="text-[var(--color-primary)]">픽 {item.pickRate.toFixed(1)}%</span>
                <WinRateSpan winRate={item.winRate} label="승 " />
                <span className="text-[var(--color-muted-foreground)]">
                  {item.totalGames.toLocaleString()}판
                </span>
              </div>
            </div>
            {/* 태블릿: 한 줄, 판수 숨김 (640px~1024px) */}
            <div className="hidden sm:flex lg:hidden items-center gap-2">
              <span className={cn("w-5 shrink-0 text-xs font-bold text-center", i === 0 ? "text-[var(--color-accent-gold)]" : "text-[var(--color-muted-foreground)]")}>
                {i + 1}
              </span>
              <ItemIcon code={item.code} size={32} />
              <span className="flex-1 text-sm text-[var(--color-foreground)] truncate">
                {itemNames[item.code] ?? item.code}
              </span>
              <span className="text-xs text-[var(--color-primary)]">{item.pickRate.toFixed(1)}%</span>
              <WinRateSpan winRate={item.winRate} />
            </div>
            {/* 데스크탑: 풀 한 줄 (≥1024px) */}
            <div className="hidden lg:flex items-center gap-3">
              <span className={cn("w-5 shrink-0 text-xs font-bold text-center", i === 0 ? "text-[var(--color-accent-gold)]" : "text-[var(--color-muted-foreground)]")}>
                {i + 1}
              </span>
              <ItemIcon code={item.code} size={36} />
              <span className="flex-1 text-sm text-[var(--color-foreground)] truncate">
                {itemNames[item.code] ?? item.code}
              </span>
              <span className="text-xs text-[var(--color-primary)]">픽률 {item.pickRate.toFixed(1)}%</span>
              <WinRateSpan winRate={item.winRate} label="승률 " />
              <span className="text-xs text-[var(--color-muted-foreground)] w-16 text-right">
                {item.totalGames.toLocaleString()}판
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export function CharacterEquipmentAnalyzer({ characterCode, tier, patchVersion, bestWeapon }: Props) {
  const [data, setData] = React.useState<EquipmentBuildResult | null>(null)
  const itemNames = itemNameMap as Record<number, string>
  const [traitNames, setTraitNames] = React.useState<Record<number, string>>({})
  const [loading, setLoading] = React.useState(false)

  // 특성 이름 사전 로드 (최초 1회)
  React.useEffect(() => {
    fetch("/api/traits/names")
      .then((r) => r.json())
      .then((d) => setTraitNames(d.names ?? {}))
      .catch(() => {})
  }, [])

  // 장비 빌드 데이터 로드
  React.useEffect(() => {
    if (!patchVersion) return

    setLoading(true)
    setData(null)

    const params = new URLSearchParams({
      characterCode: String(characterCode),
      tier,
      patchVersion,
      ...(bestWeapon != null ? { bestWeapon: String(bestWeapon) } : {}),
    })

    fetch(`/api/builds/equipment?${params}`)
      .then((r) => r.json())
      .then((d) => setData(d))
      .catch(() => setData(null))
      .finally(() => setLoading(false))
  }, [characterCode, tier, patchVersion, bestWeapon])

  if (loading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-40 rounded-lg bg-[var(--color-surface)] animate-pulse" />
        ))}
      </div>
    )
  }

  const isEmpty =
    !data ||
    (data.topBuilds.length === 0 &&
      data.coreItems.length === 0 &&
      SLOTS.every((s) => data.slotPopularity[s].length === 0))

  if (isEmpty) {
    return (
      <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]/80 p-8 text-center text-sm text-[var(--color-muted-foreground)]">
        아이템 빌드 데이터가 없습니다.
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {data.topBuilds.length > 0 && (
        <TopBuildsTable builds={data.topBuilds} itemNames={itemNames} traitNames={traitNames} />
      )}
      {SLOTS.some((s) => data.slotPopularity[s].length > 0) && (
        <SlotPopularityGrid slotPopularity={data.slotPopularity} itemNames={itemNames} />
      )}
      {data.coreItems.length > 0 && (
        <CoreItemsList coreItems={data.coreItems} itemNames={itemNames} />
      )}
    </div>
  )
}
