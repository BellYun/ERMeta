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
  buff: { text: "BUFF", color: "text-green-400 bg-green-400/10 border-green-400/20" },
  nerf: { text: "NERF", color: "text-red-400 bg-red-400/10 border-red-400/20" },
  rework: { text: "ADJUST", color: "text-blue-400 bg-blue-400/10 border-blue-400/20" },
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
          isCenter ? "z-20 overflow-visible" : "brightness-[0.6] overflow-hidden"
        )}
        onClick={onCardClick}
      >
        {/* 메인 카드 (이미지 + 글래스 패널) */}
        <div className="relative w-full aspect-[4/5] shrink-0 overflow-hidden rounded-xl">
          {/* 풀 이미지 배경 */}
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

          {/* 하단 그라데이션 */}
          <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-[var(--color-surface)]/80 to-transparent" />

          {/* 순위 배지 */}
          <div className={cn(
            "absolute top-2.5 left-2.5 flex h-6 w-6 items-center justify-center rounded-full backdrop-blur-md text-[11px] font-bold",
            isCenter
              ? "bg-[var(--color-primary)]/20 text-[var(--color-primary)] ring-1 ring-[var(--color-primary)]/30"
              : "bg-[var(--color-surface)]/50 text-[var(--color-muted-foreground)] ring-1 ring-[var(--color-border)]"
          )}>
            {rank}
          </div>

          {/* 글래스모피즘 정보 패널 */}
          <div className={cn(
            "absolute inset-x-2 bottom-2 rounded-lg border backdrop-blur-xl transition-all duration-400",
            "bg-[var(--color-surface)]/50 border-[var(--color-border)]/60",
            isCenter ? "p-2.5" : "p-2"
          )}>
            {/* 이름 + 무기 */}
            <div className="flex items-center justify-between">
              <div className="min-w-0">
                <p className={cn(
                  "font-bold truncate text-[var(--color-foreground)]",
                  isCenter ? "text-sm" : "text-xs"
                )}>
                  {name}
                </p>
                {isCenter && (
                  <p className="text-[10px] text-[var(--color-muted-foreground)] truncate mt-0.5">
                    {weaponName}
                  </p>
                )}
              </div>
            </div>

            {/* 스탯 + 증가량 — 항상 표시 (센터만) */}
            {isCenter && (
              <div className="flex items-center gap-1.5 mt-2 pt-2 border-t border-[var(--color-border)]/40">
                <div className="flex-1 text-center">
                  <p className="text-[8px] text-[var(--color-muted-foreground)]">승률</p>
                  <p className={cn(
                    "text-[13px] font-bold tabular-nums leading-tight",
                    pick.winRate >= 60 ? "text-[var(--color-accent-gold)]" : "text-[var(--color-foreground)]"
                  )}>
                    {pick.winRate.toFixed(1)}%
                  </p>
                  <p className="text-[9px] font-medium text-green-400 mt-0.5">
                    +{pick.winRateDelta.toFixed(1)}
                  </p>
                </div>
                <div className="w-px h-8 bg-[var(--color-border)]/40" />
                <div className="flex-1 text-center">
                  <p className="text-[8px] text-[var(--color-muted-foreground)]">픽률</p>
                  <p className="text-[13px] font-bold tabular-nums leading-tight text-[var(--color-foreground)]">
                    {pick.pickRate.toFixed(1)}%
                  </p>
                  <p className="text-[9px] font-medium text-green-400 mt-0.5">
                    +{pick.pickRateDelta.toFixed(1)}
                  </p>
                </div>
                <div className="w-px h-8 bg-[var(--color-border)]/40" />
                <div className="flex-1 text-center">
                  <p className="text-[8px] text-[var(--color-muted-foreground)]">RP</p>
                  <p className={cn(
                    "text-[13px] font-bold tabular-nums leading-tight",
                    pick.averageRP >= 0 ? "text-[var(--color-accent-gold)]" : "text-[var(--color-muted-foreground)]"
                  )}>
                    {pick.averageRP >= 0 ? "+" : ""}{pick.averageRP.toFixed(0)}
                  </p>
                  <p className={cn(
                    "text-[9px] font-medium mt-0.5",
                    pick.averageRPDelta >= 0 ? "text-green-400" : "text-red-400"
                  )}>
                    {pick.averageRPDelta >= 0 ? "+" : ""}{pick.averageRPDelta.toFixed(1)}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* 패치노트 확장 패널 — 데스크탑: 호버시 오른쪽으로 펼침, 모바일: 바텀시트 */}
        {isCenter && patchNote && (
          <div className={cn(
            "hidden sm:block absolute top-0 left-full h-full w-0 group-hover/card:w-52 overflow-hidden transition-all duration-500 ease-out rounded-r-xl",
            "bg-[var(--color-surface)]/90 backdrop-blur-xl border-l border-[var(--color-border)]/60"
          )}>
            <div className="w-52 h-full p-3 flex flex-col gap-2 overflow-y-auto">
              {/* 패치 버전 */}
              <div className="flex items-center gap-1.5">
                {changeLabel && (
                  <span className={cn("rounded px-1.5 py-0.5 text-[9px] font-bold border", changeLabel.color)}>
                    {changeLabel.text}
                  </span>
                )}
                <span className="text-[10px] text-[var(--color-muted-foreground)]">
                  패치 {patchNote.patch}
                </span>
              </div>

              {/* 변경사항 목록 */}
              <div className="flex flex-col gap-1.5">
                {patchNote.changes.map((change, ci) => {
                  const label = CHANGE_LABEL[change.changeType]
                  return (
                    <div key={ci} className="flex flex-col gap-0.5">
                      <div className="flex items-center gap-1">
                        <span className={cn("rounded px-1 py-0.5 text-[8px] font-bold border", label.color)}>
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

              {/* 델타 요약 */}
              <div className="mt-auto pt-2 border-t border-[var(--color-border)]/40">
                <div className="flex items-center justify-between text-[10px]">
                  <span className="text-[var(--color-muted-foreground)]">승률 변화</span>
                  <span className="font-semibold text-green-400">
                    +{pick.winRateDelta.toFixed(1)}%
                  </span>
                </div>
                <div className="flex items-center justify-between text-[10px] mt-0.5">
                  <span className="text-[var(--color-muted-foreground)]">RP 변화</span>
                  <span className={cn(
                    "font-semibold",
                    pick.averageRPDelta >= 0 ? "text-green-400" : "text-red-400"
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
