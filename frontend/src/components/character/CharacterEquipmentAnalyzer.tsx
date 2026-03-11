"use client"

import * as React from "react"
import Image from "next/image"
import { TierGroup } from "@/utils/tier"
import { cn } from "@/lib/utils"
import itemImageMap from "@/../const/itemImageMap.json"
import type { EquipmentBuildResult, BuildSummary, SlotItem, CoreItem } from "@/app/api/builds/equipment/route"

interface Props {
  characterCode: number
  tier: TierGroup
  patchVersion: string | null
  bestWeapon?: number | null
}

const SLOT_LABELS: Record<string, string> = {
  weapon: "무기",
  chest: "갑옷",
  head: "머리",
  arm: "팔",
  leg: "다리",
}

const SLOTS = ["weapon", "chest", "head", "arm", "leg"] as const

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

function WinRateSpan({ winRate, label }: { winRate: number; label?: string }) {
  return (
    <span
      className={cn(
        "font-medium",
        winRate >= 55 ? "text-[var(--color-accent-gold)]" : "text-[var(--color-muted-foreground)]"
      )}
    >
      {label}{winRate.toFixed(1)}%
    </span>
  )
}

function SectionHeader({ title }: { title: string }) {
  return (
    <div className="border-b border-[var(--color-border)] bg-[var(--color-surface-2)] px-4 py-2">
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
      <div className="overflow-x-auto">
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
              "flex items-center gap-3 px-4 py-2.5 hover:bg-[var(--color-surface-2)] transition-colors",
              i === 0 && "bg-[var(--color-accent-gold)]/5"
            )}
          >
            <span
              className={cn(
                "w-5 shrink-0 text-xs font-bold text-center",
                i === 0 ? "text-[var(--color-accent-gold)]" : "text-[var(--color-muted-foreground)]"
              )}
            >
              {i + 1}
            </span>
            <ItemIcon code={item.code} size={32} />
            <span className="flex-1 text-sm text-[var(--color-foreground)] truncate">
              {itemNames[item.code] ?? item.code}
            </span>
            <span className="text-xs text-[var(--color-primary)]">픽률 {item.pickRate.toFixed(1)}%</span>
            <WinRateSpan winRate={item.winRate} label="승률 " />
            <span className="text-xs text-[var(--color-muted-foreground)] w-16 text-right">
              {item.totalGames.toLocaleString()}판
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

export function CharacterEquipmentAnalyzer({ characterCode, tier, patchVersion, bestWeapon }: Props) {
  const [data, setData] = React.useState<EquipmentBuildResult | null>(null)
  const [itemNames, setItemNames] = React.useState<Record<number, string>>({})
  const [traitNames, setTraitNames] = React.useState<Record<number, string>>({})
  const [loading, setLoading] = React.useState(false)

  // 이름 사전 로드 (최초 1회, 병렬)
  React.useEffect(() => {
    fetch("/api/items/names")
      .then((r) => r.json())
      .then((d) => setItemNames(d.names ?? {}))
      .catch(() => {})

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
