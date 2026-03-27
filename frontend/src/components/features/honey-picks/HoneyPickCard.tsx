"use client"

import * as React from "react"
import Image from "next/image"
import { cn } from "@/lib/utils"
import type { HoneyPickData } from "@/app/api/meta/honey-picks/route"
import type { CharacterPatchNote } from "@/data/patch-notes"

export function getOverallChangeType(patchNote: CharacterPatchNote): "buff" | "nerf" | "rework" {
  const types = patchNote.changes.map((c) => c.changeType)
  if (types.every((t) => t === "buff")) return "buff"
  if (types.every((t) => t === "nerf")) return "nerf"
  if (types.includes("buff") && types.includes("nerf")) return "rework"
  return types[0] ?? "rework"
}

export const CHANGE_LABEL: Record<string, { text: string; color: string }> = {
  buff: { text: "BUFF", color: "text-[var(--color-stat-up)] bg-[var(--color-stat-up)]/10" },
  nerf: { text: "NERF", color: "text-[var(--color-stat-down)] bg-[var(--color-stat-down)]/10" },
  rework: { text: "ADJUST", color: "text-[var(--color-primary)] bg-[var(--color-primary)]/10" },
}

interface HoneyPickCardProps {
  pick: HoneyPickData
  name: string
  weaponName: string
  halfUrl: string
  patchNote: CharacterPatchNote | null
  changeLabel: { text: string; color: string } | null
  isCenter: boolean
  rank: number
  cardWidth: number
  onCardClick: () => void
  onPatchNoteExpand?: () => void
}

export function HoneyPickCard({
  pick,
  name,
  weaponName,
  halfUrl,
  patchNote,
  changeLabel,
  isCenter,
  rank,
  cardWidth,
  onCardClick,
}: HoneyPickCardProps) {
  return (
    <div
      className="shrink-0 px-1"
      style={{ width: `${cardWidth}%` }}
    >
      <div
        className={cn(
          "group/card relative cursor-pointer transition-all duration-500 ease-out rounded-xl",
          isCenter ? "z-20 overflow-visible" : "brightness-[0.55] overflow-hidden"
        )}
        onClick={onCardClick}
      >
        {/* Main card */}
        <div className="relative w-full aspect-[4/5] shrink-0 overflow-hidden rounded-xl bg-[var(--color-surface-2)]">
          <Image
            src={halfUrl}
            alt={name}
            fill
            className={cn(
              "object-cover object-top transition-transform duration-700",
              isCenter && "group-hover/card:scale-105"
            )}
            sizes="33vw"
            priority
          />

          {/* Bottom gradient */}
          <div className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />

          {/* Rank badge */}
          <div className={cn(
            "absolute top-2 left-2 flex h-6 w-6 items-center justify-center rounded-md text-[11px] font-bold",
            isCenter
              ? "bg-[var(--color-accent-gold)]/20 text-[var(--color-accent-gold)]"
              : "bg-black/40 text-[var(--color-muted-foreground)]"
          )}>
            {rank}
          </div>

          {/* Change label */}
          {isCenter && changeLabel && (
            <div className="absolute top-2 right-2">
              <span className={cn("rounded px-1.5 py-0.5 text-[9px] font-bold", changeLabel.color)}>
                {changeLabel.text}
              </span>
            </div>
          )}

          {/* Info panel */}
          <div className={cn(
            "absolute inset-x-2 bottom-2 rounded-lg transition-all",
            isCenter ? "p-2.5" : "p-2"
          )}>
            <div className="min-w-0">
              <p className={cn(
                "font-bold truncate text-white",
                isCenter ? "text-sm" : "text-xs"
              )}>
                {name}
              </p>
              {isCenter && (
                <p className="text-[10px] text-white/60 truncate mt-0.5">
                  {weaponName}
                </p>
              )}
            </div>

            {/* Stats - center only */}
            {isCenter && (
              <div className="flex items-center gap-1.5 mt-2 pt-2 border-t border-white/10">
                <div className="flex-1 text-center">
                  <p className="text-[8px] text-white/50 uppercase tracking-wider">승률</p>
                  <p className={cn(
                    "text-[13px] font-bold tabular-nums leading-tight",
                    pick.winRate >= 60 ? "text-[var(--color-accent-gold)]" : "text-white"
                  )}>
                    {pick.winRate.toFixed(1)}%
                  </p>
                  <p className="text-[9px] font-medium text-[var(--color-stat-up)] mt-0.5 tabular-nums">
                    +{pick.winRateDelta.toFixed(1)}
                  </p>
                </div>
                <div className="w-px h-7 bg-white/10" />
                <div className="flex-1 text-center">
                  <p className="text-[8px] text-white/50 uppercase tracking-wider">픽률</p>
                  <p className="text-[13px] font-bold tabular-nums leading-tight text-white">
                    {pick.pickRate.toFixed(1)}%
                  </p>
                  <p className="text-[9px] font-medium text-[var(--color-stat-up)] mt-0.5 tabular-nums">
                    +{pick.pickRateDelta.toFixed(1)}
                  </p>
                </div>
                <div className="w-px h-7 bg-white/10" />
                <div className="flex-1 text-center">
                  <p className="text-[8px] text-white/50 uppercase tracking-wider">RP</p>
                  <p className={cn(
                    "text-[13px] font-bold tabular-nums leading-tight",
                    pick.averageRP >= 0 ? "text-[var(--color-accent-gold)]" : "text-white/60"
                  )}>
                    {pick.averageRP >= 0 ? "+" : ""}{pick.averageRP.toFixed(0)}
                  </p>
                  <p className={cn(
                    "text-[9px] font-medium mt-0.5 tabular-nums",
                    pick.averageRPDelta >= 0 ? "text-[var(--color-stat-up)]" : "text-[var(--color-stat-down)]"
                  )}>
                    {pick.averageRPDelta >= 0 ? "+" : ""}{pick.averageRPDelta.toFixed(1)}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Patch note hover panel - desktop only */}
        {isCenter && patchNote && (
          <div className={cn(
            "hidden sm:block absolute top-0 left-full h-full w-0 group-hover/card:w-52 overflow-hidden transition-all duration-500 ease-out rounded-r-xl",
            "bg-[var(--color-surface)]/95 backdrop-blur-xl border-l border-[var(--color-border)]"
          )}>
            <div className="w-52 h-full p-3 flex flex-col gap-2 overflow-y-auto">
              <div className="flex items-center gap-1.5">
                {changeLabel && (
                  <span className={cn("rounded px-1.5 py-0.5 text-[9px] font-bold", changeLabel.color)}>
                    {changeLabel.text}
                  </span>
                )}
                <span className="text-[10px] text-[var(--color-muted-foreground)]">
                  패치 {patchNote.patch}
                </span>
              </div>

              <div className="flex flex-col gap-1.5">
                {patchNote.changes.map((change, ci) => {
                  const label = CHANGE_LABEL[change.changeType]
                  return (
                    <div key={ci} className="flex flex-col gap-0.5">
                      <div className="flex items-center gap-1">
                        <span className={cn("rounded px-1 py-0.5 text-[8px] font-bold", label.color)}>
                          {label.text}
                        </span>
                        <span className="text-[10px] font-medium text-[var(--color-foreground)]">
                          {change.target}
                        </span>
                      </div>
                      {change.valueSummary && (
                        <p className="text-[9px] text-[var(--color-muted-foreground)] pl-1 break-words leading-tight">
                          {change.valueSummary}
                        </p>
                      )}
                    </div>
                  )
                })}
              </div>

              <div className="mt-auto pt-2 border-t border-[var(--color-border)]/40">
                <div className="flex items-center justify-between text-[10px]">
                  <span className="text-[var(--color-muted-foreground)]">승률 변화</span>
                  <span className="font-semibold text-[var(--color-stat-up)] tabular-nums">
                    +{pick.winRateDelta.toFixed(1)}%
                  </span>
                </div>
                <div className="flex items-center justify-between text-[10px] mt-0.5">
                  <span className="text-[var(--color-muted-foreground)]">RP 변화</span>
                  <span className={cn(
                    "font-semibold tabular-nums",
                    pick.averageRPDelta >= 0 ? "text-[var(--color-stat-up)]" : "text-[var(--color-stat-down)]"
                  )}>
                    {pick.averageRPDelta >= 0 ? "+" : ""}{pick.averageRPDelta.toFixed(1)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
