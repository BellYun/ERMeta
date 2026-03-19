"use client"

import * as React from "react"
import Image from "next/image"
import { ChevronDown } from "lucide-react"
import { cn } from "@/lib/utils"
import { getCharacterImageUrl } from "@/lib/characterMap"
import { resolveWeaponName } from "@/lib/weaponMap"
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
  const [expanded, setExpanded] = React.useState(false)

  const members = [
    { char: group.character1, weapon: group.weaponType1 },
    { char: group.character2, weapon: group.weaponType2 },
    { char: group.character3, weapon: group.weaponType3 },
  ]

  // 선택한 아군을 앞에, 추천 캐릭터를 마지막에 표시
  const allies: typeof members = []
  const rest: typeof members = []
  for (const m of members) {
    if (selectedCharCodes.includes(m.char) && allies.length < selectedCharCodes.length) {
      allies.push(m)
    } else {
      rest.push(m)
    }
  }
  allies.sort((a, b) => selectedCharCodes.indexOf(a.char) - selectedCharCodes.indexOf(b.char))
  const ordered = [...allies, ...rest]

  const isSmallSample = group.totalGames <= 10
  const hasVariants = group.traitVariants.length > 1

  return (
    <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]/80 transition-all duration-200 hover:border-[var(--color-primary)]/20">
      {/* Level 1: 메인 행 */}
      <button
        type="button"
        onClick={() => hasVariants && setExpanded((prev) => !prev)}
        className={cn(
          "w-full flex items-center gap-2 px-3 py-2.5 text-left transition-colors",
          hasVariants && "cursor-pointer hover:bg-[var(--color-primary)]/[0.04]",
          !hasVariants && "cursor-default",
          expanded && "border-b border-[var(--color-border)]"
        )}
      >
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
                      src={getCharacterImageUrl(m.char)}
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

          {/* 펼침 화살표 */}
          {hasVariants && (
            <ChevronDown className={cn(
              "h-4 w-4 text-[var(--color-muted-foreground)] transition-transform duration-200 shrink-0",
              expanded && "rotate-180"
            )} />
          )}
        </div>
      </button>

      {/* Level 2: 특성 브레이크다운 */}
      {expanded && (
        <div className="px-3 py-2 flex flex-col gap-1.5 bg-[var(--color-surface-2)]/40">
          <p className="text-[10px] text-[var(--color-muted-foreground)] font-medium px-1 mb-0.5">
            메인 특성 조합별 성능
          </p>
          {group.traitVariants
            .sort((a, b) => b.totalGames - a.totalGames)
            .slice(0, 10)
            .map((v, vi) => (
            <div
              key={`${v.mainCore1}-${v.mainCore2}-${v.mainCore3}-${vi}`}
              className="flex items-center gap-2 rounded-lg bg-[var(--color-surface)]/60 px-3 py-2 border border-[var(--color-border)]/50"
            >
              {/* 특성 3개 */}
              <div className="flex items-center gap-1.5 min-w-0">
                {ordered.map((m, mi) => {
                  const core = m.char === v.character1 ? v.mainCore1
                    : m.char === v.character2 ? v.mainCore2
                    : v.mainCore3
                  return (
                    <React.Fragment key={`${m.char}-trait`}>
                      <div className="flex flex-col items-center">
                        <span className="text-[9px] text-[var(--color-muted-foreground)] truncate w-12 text-center">
                          {getCharName(m.char)}
                        </span>
                        <span className="text-[10px] text-[var(--color-primary)] font-medium truncate w-14 text-center">
                          {core && core > 0 ? (getTraitName(core) ?? `특성${core}`) : "-"}
                        </span>
                      </div>
                      {mi < 2 && <span className="text-[9px] text-[var(--color-border)]">·</span>}
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
