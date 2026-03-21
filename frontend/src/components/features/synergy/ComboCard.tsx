"use client"

import * as React from "react"
import Image from "next/image"
import { cn } from "@/lib/utils"
import { getCharacterMiniWebpUrl } from "@/lib/characterMap"
import type { TrioResult } from "./types"

export function ComboCard({
  rec,
  rank,
  getCharName,
  selectedAllies,
  compact = false,
  priorityImages = false,
  onNavigateAnalysis,
}: {
  rec: TrioResult
  rank: number
  getCharName: (code: number) => string
  selectedAllies: number[]
  compact?: boolean
  /** true면 이미지를 priority로 즉시 로드 (상위 카드용) */
  priorityImages?: boolean
  onNavigateAnalysis?: (code: number) => void
}) {
  // 선택한 아군을 앞에, 추천 캐릭터를 마지막에 표시
  const allChars = [rec.character1, rec.character2, rec.character3]
  const allies: number[] = []
  const rest: number[] = []
  for (const code of allChars) {
    if (selectedAllies.includes(code) && allies.length < selectedAllies.length) {
      allies.push(code)
    } else {
      rest.push(code)
    }
  }
  // 선택 순서 유지
  allies.sort((a, b) => selectedAllies.indexOf(a) - selectedAllies.indexOf(b))
  const chars = [...allies, ...rest]
  const isSmallSample = rec.totalGames <= 10

  return (
    <div className="group flex items-center gap-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]/80 px-3 py-2.5 hover:bg-[var(--color-primary)]/[0.04] hover:border-[var(--color-primary)]/20 transition-all duration-200">
      {/* 순위 */}
      <span className="w-5 shrink-0 text-center text-xs font-bold text-[var(--color-muted-foreground)] group-hover:text-[var(--color-primary)]">
        {rank}
      </span>

      {/* 3캐릭터 */}
      <div className="flex items-center gap-1">
        {chars.map((code, i) => {
          const isRecommended = !selectedAllies.includes(code)
          const charContent = (
            <div className="flex flex-col items-center gap-0.5">
              <div
                className={cn(
                  "relative h-8 w-8 overflow-hidden rounded-md bg-[var(--color-border)]",
                  isRecommended && "ring-2 ring-[var(--color-accent-gold)]",
                  isRecommended && "group-hover/char:ring-[var(--color-primary)] transition-all"
                )}
              >
                <Image
                  src={getCharacterMiniWebpUrl(code)}
                  alt={getCharName(code)}
                  fill
                  className="object-cover"
                  sizes="32px"
                  loading={priorityImages ? "eager" : "lazy"}
                  priority={priorityImages}
                />
              </div>
              {!compact && (
                <span className={cn(
                  "w-10 truncate text-center text-[9px]",
                  isRecommended
                    ? "text-[var(--color-accent-gold)] group-hover/char:text-[var(--color-primary)]"
                    : "text-[var(--color-muted-foreground)]"
                )}>
                  {getCharName(code)}
                </span>
              )}
            </div>
          )
          return (
            <React.Fragment key={code}>
              {isRecommended && onNavigateAnalysis ? (
                <button
                  type="button"
                  onClick={() => onNavigateAnalysis(code)}
                  className="group/char relative z-10 cursor-pointer flex items-center gap-1"
                  title={`${getCharName(code)} 분석 보기`}
                >
                  {charContent}
                  {rest.length === 1 && (
                    <span className="rounded-md border border-[var(--color-primary)]/30 bg-[var(--color-primary)]/10 px-1.5 py-0.5 text-[9px] font-medium text-[var(--color-primary)] group-hover/char:bg-[var(--color-primary)]/20 group-hover/char:border-[var(--color-primary)]/50 transition-colors whitespace-nowrap">
                      분석보기
                    </span>
                  )}
                </button>
              ) : (
                charContent
              )}
              {i < 2 && (
                <span className="text-[10px] text-[var(--color-border)]">+</span>
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
      {compact ? (
        <div className="ml-auto flex flex-col items-end gap-0.5">
          <span
            className={cn(
              "text-xs font-semibold",
              rec.winRate >= 60
                ? "text-[var(--color-accent-gold)]"
                : rec.winRate >= 55
                ? "text-[var(--color-foreground)]"
                : "text-[var(--color-muted-foreground)]"
            )}
          >
            {rec.winRate.toFixed(1)}%
          </span>
          <span className={cn(
            "text-[10px]",
            rec.averageRP > 0
              ? "text-[var(--color-accent-gold)]"
              : rec.averageRP < 0
              ? "text-[var(--color-danger)]"
              : "text-[var(--color-muted-foreground)]"
          )}>
            {rec.averageRP > 0 ? "+" : ""}{rec.averageRP.toFixed(1)} RP
          </span>
        </div>
      ) : (
        <div className="ml-auto flex items-center gap-3 sm:gap-6 text-right">
          <div className="flex flex-col">
            <span className="text-[10px] text-[var(--color-muted-foreground)]">승률</span>
            <span
              className={cn(
                "text-sm font-semibold",
                rec.winRate >= 60
                  ? "text-[var(--color-accent-gold)]"
                  : rec.winRate >= 55
                  ? "text-[var(--color-foreground)]"
                  : "text-[var(--color-muted-foreground)]"
              )}
            >
              {rec.winRate.toFixed(1)}%
            </span>
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] text-[var(--color-muted-foreground)]">평균 RP</span>
            <span className={cn(
              "text-sm font-semibold",
              rec.averageRP > 0
                ? "text-[var(--color-accent-gold)]"
                : rec.averageRP < 0
                ? "text-[var(--color-danger)]"
                : "text-[var(--color-muted-foreground)]"
            )}>
              {rec.averageRP > 0 ? "+" : ""}{rec.averageRP.toFixed(1)}
            </span>
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] text-[var(--color-muted-foreground)]">게임 수</span>
            <span className="text-sm text-[var(--color-muted-foreground)]">
              {rec.totalGames.toLocaleString()}
            </span>
          </div>
          <div className="hidden sm:flex flex-col">
            <span className="text-[10px] text-[var(--color-muted-foreground)]">평균 순위</span>
            <span className="text-sm text-[var(--color-muted-foreground)]">
              #{rec.averageRank.toFixed(1)}
            </span>
          </div>
        </div>
      )}

    </div>
  )
}
