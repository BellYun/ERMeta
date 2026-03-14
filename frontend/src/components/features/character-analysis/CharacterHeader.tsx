"use client"

import * as React from "react"
import Image from "next/image"
import { TierBadge } from "../TierBadge"
import { StatCard, SkeletonCard } from "./StatCard"
import { TIER_LABELS, CHANGE_TYPE_CONFIG } from "./constants"
import { cn } from "@/lib/utils"
import { getCharacterName, getCharacterImageUrl } from "@/lib/characterMap"
import { analytics } from "@/lib/analytics"
import { resolveWeaponName } from "@/lib/weaponMap"
import { METRICS_TIER_GROUPS, TierGroup } from "@/utils/tier"
import type { Tier } from "@/lib/design-tokens"
import type { CharacterStatsResponse, WeaponStatItem } from "@/app/api/character/stats/[characterCode]/route"

type DisplayStat = CharacterStatsResponse | WeaponStatItem

interface CharacterHeaderProps {
  selectedCode: number
  selectedTier: TierGroup
  setSelectedTier: (tier: TierGroup) => void
  selectedWeapon: number | null
  setSelectedWeapon: (weapon: number | null) => void
  stats: CharacterStatsResponse | null
  displayStat: DisplayStat | null
  displayPrevStat: DisplayStat | null
  charTier: Tier | null
  currentPatch: string | null
  loading: boolean
  hasPreviousData: boolean
}

export function CharacterHeader({
  selectedCode,
  selectedTier,
  setSelectedTier,
  selectedWeapon,
  setSelectedWeapon,
  stats,
  displayStat,
  displayPrevStat,
  charTier,
  currentPatch,
  loading,
  hasPreviousData,
}: CharacterHeaderProps) {
  return (
    <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]/80 backdrop-blur-sm p-3 sm:p-5 overflow-hidden min-w-0">
      <div className="flex gap-3 sm:gap-4 items-start">
        <div className="relative h-16 w-16 sm:h-20 sm:w-20 shrink-0 overflow-hidden rounded-xl bg-[var(--color-border)]">
          <Image
            src={getCharacterImageUrl(selectedCode)}
            alt={getCharacterName(selectedCode)}
            fill
            className="object-cover"
            sizes="80px"
            unoptimized
          />
        </div>
        <div className="flex flex-1 flex-col gap-1.5 sm:gap-2 min-w-0">
          <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
            <h1 className="text-lg sm:text-2xl font-bold text-[var(--color-foreground)] truncate max-w-[140px] sm:max-w-none">
              {getCharacterName(selectedCode)}
            </h1>
            {charTier && <TierBadge tier={charTier} />}
          </div>
          <div className="flex items-center gap-1.5 flex-wrap">
            {currentPatch && (
              <span className="rounded bg-[var(--color-surface-2)] px-1.5 py-0.5 text-[10px] sm:text-xs text-[var(--color-muted-foreground)] border border-[var(--color-border)]">
                {currentPatch}
              </span>
            )}
            {displayStat && displayStat.totalGames > 0 && (
              <span className="rounded bg-[var(--color-surface-2)] px-1.5 py-0.5 text-[10px] sm:text-xs text-[var(--color-muted-foreground)] border border-[var(--color-border)]">
                총 {displayStat.totalGames.toLocaleString()}판
              </span>
            )}
          </div>
        </div>
      </div>
      <div className="flex flex-col gap-2.5 sm:gap-3 mt-2.5 sm:mt-3">
        <select
          value={selectedTier}
          onChange={(e) => { setSelectedTier(e.target.value as TierGroup); analytics.analysisTierChanged(e.target.value) }}
          className="w-full rounded bg-[var(--color-surface-2)] px-2 py-1.5 text-xs text-[var(--color-foreground)] border border-[var(--color-border)] cursor-pointer"
        >
          {METRICS_TIER_GROUPS.map((tg) => (
            <option key={tg} value={tg}>{TIER_LABELS[tg]}</option>
          ))}
        </select>

        {/* 무기 군 선택 */}
        {!loading && stats?.weapons && stats.weapons.length > 0 && (() => {
          const _maxPickRate = 100 // 픽률은 전체 대비 %이므로 100 기준
          return (
          <div className="overflow-x-auto -mx-1 px-1 pb-1">
            <div className="flex gap-1.5 sm:flex-wrap">
              <button
                onClick={() => setSelectedWeapon(null)}
                className={cn(
                  "flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs transition-colors shrink-0",
                  selectedWeapon === null
                    ? "border-[var(--color-primary)] bg-[var(--color-primary)]/15 text-[var(--color-primary)]"
                    : "border-[var(--color-border)] bg-[var(--color-surface-2)] text-[var(--color-foreground)] hover:border-[var(--color-primary)]/50"
                )}
              >
                <span className="font-medium">전체</span>
              </button>
              {stats.weapons.map((w) => {
                const isSelected = selectedWeapon === w.bestWeapon
                const barWidth = w.pickRate
                return (
                  <button
                    key={w.bestWeapon ?? "none"}
                    onClick={() => {
                      setSelectedWeapon(w.bestWeapon ?? null)
                      analytics.weaponSelected(selectedCode, w.bestWeapon ?? 0, resolveWeaponName(w.bestWeapon ?? undefined))
                    }}
                    className={cn(
                      "flex flex-col rounded-md border px-2.5 py-1 text-xs transition-colors min-w-[80px] shrink-0",
                      isSelected
                        ? "border-[var(--color-primary)] bg-[var(--color-primary)]/15 text-[var(--color-primary)]"
                        : "border-[var(--color-border)] bg-[var(--color-surface-2)] text-[var(--color-foreground)] hover:border-[var(--color-primary)]/50"
                    )}
                  >
                    <div className="flex items-center gap-1.5">
                      <span className="font-medium">{resolveWeaponName(w.bestWeapon ?? undefined)}</span>
                      <span
                        className={cn(
                          "text-[10px]",
                          isSelected
                            ? "text-[var(--color-primary)]/80"
                            : "text-[var(--color-muted-foreground)]"
                        )}
                      >
                        {w.pickRate.toFixed(1)}%
                      </span>
                    </div>
                    <div className="mt-1 h-1 w-full rounded-full bg-[var(--color-border)]">
                      <div
                        className={cn(
                          "h-full rounded-full transition-all",
                          isSelected ? "bg-[var(--color-primary)]" : "bg-[var(--color-muted-foreground)]"
                        )}
                        style={{ width: `${barWidth}%` }}
                      />
                    </div>
                  </button>
                )
              })}
            </div>
          </div>
          )
        })()}

        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 sm:gap-2">
            {[...Array(4)].map((_, i) => <SkeletonCard key={i} />)}
          </div>
        ) : displayStat && displayStat.totalGames > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 sm:gap-2">
            <StatCard
              label="픽률"
              value={`${displayStat.pickRate.toFixed(1)}%`}
              delta={hasPreviousData ? displayStat.pickRate - displayPrevStat!.pickRate : undefined}
              deltaLabel="%p"
            />
            <StatCard
              label="승률"
              value={`${displayStat.winRate.toFixed(1)}%`}
              delta={hasPreviousData ? displayStat.winRate - displayPrevStat!.winRate : undefined}
              deltaLabel="%p"
              gauge={{ current: displayStat.winRate, expected: 12.5, max: 25 }}
            />
            <StatCard
              label="평균 순위"
              value={`#${displayStat.averageRank.toFixed(1)}`}
              delta={hasPreviousData ? displayStat.averageRank - displayPrevStat!.averageRank : undefined}
              deltaInverted
              gauge={{ current: displayStat.averageRank, expected: 4.5, max: 8, inverted: true }}
            />
            <StatCard
              label="평균 RP"
              value={displayStat.averageRP.toFixed(1)}
              delta={hasPreviousData ? displayStat.averageRP - displayPrevStat!.averageRP : undefined}
            />
          </div>
        ) : (
          <p className="text-sm text-[var(--color-muted-foreground)]">
            {currentPatch ? "이 패치에서 데이터가 없습니다." : "패치 정보를 불러오는 중..."}
          </p>
        )}
      </div>
    </div>
  )
}
