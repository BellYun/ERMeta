"use client"

import * as React from "react"
import Image from "next/image"
import { ChevronDown } from "lucide-react"
import { cn } from "@/lib/utils"
import { getCharacterMiniWebpUrl } from "@/lib/characterMap"
import { resolveWeaponName } from "@/lib/weaponMap"
import { TraitIcon } from "./TraitIcon"
import type { TrioWeaponResult } from "./types"

/** Level 1 (접힘): 캐릭터+무기 조합 (mainCore 집계) */
export interface GroupedCombo {
  character1: number; weaponType1: number
  character2: number; weaponType2: number
  character3: number; weaponType3: number
  totalGames: number
  winRate: number
  averageRP: number
  averageRank: number
  /** Level 2 (펼침): 특성별 브레이크다운 */
  traitVariants: TrioWeaponResult[]
}

interface OrderedMember {
  char: number
  weapon: number
}

function getOrderedMembers(group: GroupedCombo, selectedCharCodes: number[]): OrderedMember[] {
  const members: OrderedMember[] = [
    { char: group.character1, weapon: group.weaponType1 },
    { char: group.character2, weapon: group.weaponType2 },
    { char: group.character3, weapon: group.weaponType3 },
  ]
  const allies: OrderedMember[] = []
  const rest: OrderedMember[] = []
  for (const m of members) {
    if (selectedCharCodes.includes(m.char) && allies.length < selectedCharCodes.length) {
      allies.push(m)
    } else {
      rest.push(m)
    }
  }
  allies.sort((a, b) => selectedCharCodes.indexOf(a.char) - selectedCharCodes.indexOf(b.char))
  return [...allies, ...rest]
}

function getCoreForMember(m: OrderedMember, v: TrioWeaponResult): number | null {
  if (m.char === v.character1) return v.mainCore1
  if (m.char === v.character2) return v.mainCore2
  return v.mainCore3
}

export function ComboWeaponCard({
  group,
  rank,
  getCharName,
  getTraitName,
  selectedCharCodes,
}: {
  group: GroupedCombo
  rank: number
  getCharName: (code: number) => string
  getTraitName: (code: number) => string | null
  selectedCharCodes: number[]
}) {
  const [showTraits, setShowTraits] = React.useState(false)
  const ordered = React.useMemo(() => getOrderedMembers(group, selectedCharCodes), [group, selectedCharCodes])
  const isSmallSample = group.totalGames <= 10
  const sortedVariants = React.useMemo(
    () => [...group.traitVariants].sort((a, b) => b.averageRP - a.averageRP).slice(0, 10),
    [group.traitVariants]
  )

  return (
    <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]/80 transition-all duration-200 hover:border-[var(--color-primary)]/20">
      {/* 메인 행 */}
      <div className="flex items-center gap-2 px-3 py-2.5">
        {/* 순위 */}
        <span className="w-5 shrink-0 text-center text-xs font-bold text-[var(--color-muted-foreground)]">
          {rank}
        </span>

        {/* 3캐릭터 + 무기 */}
        <div className="flex items-center gap-1">
          {ordered.map((m, i) => {
            const isRecommended = !selectedCharCodes.includes(m.char)
            return (
              <React.Fragment key={`${m.char}-${m.weapon}`}>
                <div className="flex flex-col items-center gap-0.5">
                  <div
                    className={cn(
                      "relative h-8 w-8 overflow-hidden rounded-md bg-[var(--color-border)]",
                      isRecommended && "ring-2 ring-[var(--color-accent-gold)]"
                    )}
                  >
                    <Image
                      src={getCharacterMiniWebpUrl(m.char)}
                      alt={getCharName(m.char)}
                      fill
                      className="object-cover"
                      sizes="32px"
                    />
                  </div>
                  <span className={cn(
                    "w-12 truncate text-center text-[9px]",
                    isRecommended ? "text-[var(--color-accent-gold)]" : "text-[var(--color-muted-foreground)]"
                  )}>
                    {getCharName(m.char)}
                  </span>
                  <span className="text-[8px] text-[var(--color-muted-foreground)] truncate w-12 text-center">
                    {resolveWeaponName(m.weapon)}
                  </span>
                </div>
                {i < 2 && (
                  <span className="text-[10px] text-[var(--color-border)] self-start mt-3">+</span>
                )}
              </React.Fragment>
            )
          })}
        </div>

        {/* 소표본 배지 */}
        {isSmallSample && (
          <span className="text-[9px] bg-[var(--color-surface-2)] text-[var(--color-muted-foreground)] px-1.5 py-0.5 rounded shrink-0">
            소표본
          </span>
        )}

        {/* 스탯 */}
        <div className="ml-auto flex items-center gap-3 sm:gap-6 text-right">
          <StatCol label="승률" value={`${group.winRate.toFixed(1)}%`} color={
            group.winRate >= 60 ? "gold" : group.winRate >= 55 ? "foreground" : "muted"
          } />
          <StatCol label="평균 RP" value={`${group.averageRP > 0 ? "+" : ""}${group.averageRP.toFixed(1)}`} color={
            group.averageRP > 0 ? "gold" : group.averageRP < 0 ? "danger" : "muted"
          } />
          <StatCol label="게임 수" value={group.totalGames.toLocaleString()} color="muted" />
          <div className="hidden sm:flex flex-col">
            <span className="text-[10px] text-[var(--color-muted-foreground)]">평균 순위</span>
            <span className="text-sm text-[var(--color-muted-foreground)]">#{group.averageRank.toFixed(1)}</span>
          </div>

          {/* 특성 토글 */}
          <button
            type="button"
            onClick={() => setShowTraits((prev) => !prev)}
            className={cn(
              "inline-flex items-center gap-1 px-2 py-1 rounded-lg border text-[10px] font-medium transition-colors shrink-0",
              showTraits
                ? "border-[var(--color-primary)]/50 bg-[var(--color-primary)]/15 text-[var(--color-primary)]"
                : "border-[var(--color-border)] text-[var(--color-muted-foreground)] hover:border-[var(--color-primary)]/30 hover:text-[var(--color-primary)]"
            )}
          >
            특성
            <ChevronDown className={cn(
              "h-3 w-3 transition-transform duration-200",
              showTraits && "rotate-180"
            )} />
          </button>
        </div>
      </div>

      {/* 특성 브레이크다운 */}
      {showTraits && (
        <div className="px-3 py-2 flex flex-col gap-1.5 bg-[var(--color-surface-2)]/40 border-t border-[var(--color-border)]">
          {sortedVariants.map((v, vi) => (
            <div
              key={`${v.mainCore1}-${v.mainCore2}-${v.mainCore3}-${vi}`}
              className="flex items-center gap-2 rounded-lg bg-[var(--color-surface)]/60 px-3 py-2 border border-[var(--color-border)]/50"
            >
              {/* 특성 3개 — 캐릭터 순서와 동일 */}
              <div className="flex items-center gap-1.5 min-w-0">
                {ordered.map((m, mi) => {
                  const core = getCoreForMember(m, v)
                  return (
                    <React.Fragment key={`${m.char}-trait-${vi}`}>
                      <div className="flex flex-col items-center gap-0.5">
                        <span className="text-[9px] text-[var(--color-muted-foreground)] truncate w-14 text-center">
                          {getCharName(m.char)}
                        </span>
                        {core && core > 0 ? (
                          <TraitIcon code={core} name={getTraitName(core)} size="sm" />
                        ) : (
                          <span className="text-[9px] text-[var(--color-muted-foreground)]">-</span>
                        )}
                      </div>
                      {mi < 2 && <span className="text-[9px] text-[var(--color-border)] mt-2">·</span>}
                    </React.Fragment>
                  )
                })}
              </div>

              {/* 스탯 */}
              <div className="ml-auto flex items-center gap-3 sm:gap-5 text-right">
                <StatCol label="승률" value={`${v.winRate.toFixed(1)}%`} color={
                  v.winRate >= 60 ? "gold" : v.winRate >= 55 ? "foreground" : "muted"
                } small />
                <StatCol label="평균 RP" value={`${v.averageRP > 0 ? "+" : ""}${v.averageRP.toFixed(1)}`} color={
                  v.averageRP > 0 ? "gold" : v.averageRP < 0 ? "danger" : "muted"
                } small />
                <StatCol label="게임 수" value={v.totalGames.toLocaleString()} color="muted" small />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function StatCol({ label, value, color, small }: {
  label: string; value: string; color: "gold" | "foreground" | "muted" | "danger"; small?: boolean
}) {
  const colorClass = {
    gold: "text-[var(--color-accent-gold)]",
    foreground: "text-[var(--color-foreground)]",
    muted: "text-[var(--color-muted-foreground)]",
    danger: "text-[var(--color-danger)]",
  }[color]

  return (
    <div className="flex flex-col">
      <span className={cn("text-[var(--color-muted-foreground)]", small ? "text-[9px]" : "text-[10px]")}>{label}</span>
      <span className={cn("font-semibold", colorClass, small ? "text-xs" : "text-sm")}>{value}</span>
    </div>
  )
}
