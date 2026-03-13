"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import { CHANGE_LABEL } from "./HoneyPickCard"
import type { HoneyPickData } from "@/app/api/meta/honey-picks/route"
import type { CharacterPatchNote } from "@/data/patch-notes"

interface PatchNoteBottomSheetProps {
  pick: HoneyPickData
  patchNote: CharacterPatchNote
  changeLabel: { text: string; color: string } | null
  characterName: string
  onClose: () => void
  onNavigate: () => void
}

export function PatchNoteBottomSheet({
  pick,
  patchNote,
  changeLabel,
  characterName,
  onClose,
  onNavigate,
}: PatchNoteBottomSheetProps) {
  return (
    <div
      className="fixed inset-0 z-[100] sm:hidden"
      onClick={onClose}
    >
      {/* 어두운 배경 */}
      <div className="absolute inset-0 bg-black/70 animate-[fadeIn_200ms_ease-out]" />

      {/* 바텀시트 */}
      <div
        className="absolute inset-x-0 bottom-0 rounded-t-2xl border-t border-[var(--color-border)]/60 bg-[var(--color-surface)] backdrop-blur-xl animate-[slideUp_300ms_ease-out] max-h-[70vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 핸들 */}
        <div className="flex justify-center pt-3 pb-2">
          <div className="h-1 w-10 rounded-full bg-[var(--color-border)]" />
        </div>

        {/* 헤더 */}
        <div className="flex items-center justify-between px-4 pb-3 border-b border-[var(--color-border)]/40">
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-[var(--color-foreground)]">
              {characterName}
            </span>
            {changeLabel && (
              <span className={cn("rounded px-1.5 py-0.5 text-[10px] font-bold border", changeLabel.color)}>
                {changeLabel.text}
              </span>
            )}
            <span className="text-[11px] text-[var(--color-muted-foreground)]">
              패치 {patchNote.patch}
            </span>
          </div>
          <button
            onClick={onClose}
            className="text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)] text-lg leading-none p-1"
          >
            ✕
          </button>
        </div>

        {/* 변경사항 */}
        <div className="flex-1 overflow-y-auto px-4 py-3 flex flex-col gap-2.5">
          {patchNote.changes.map((change, ci) => {
            const label = CHANGE_LABEL[change.changeType]
            return (
              <div key={ci} className="flex flex-col gap-1">
                <div className="flex items-center gap-1.5">
                  <span className={cn("rounded px-1.5 py-0.5 text-[9px] font-bold border", label.color)}>
                    {label.text}
                  </span>
                  <span className="text-xs font-medium text-[var(--color-foreground)]">
                    {change.target}
                  </span>
                </div>
                {change.valueSummary && (
                  <p className="text-[11px] text-[var(--color-muted-foreground)] pl-1 leading-relaxed">
                    {change.valueSummary}
                  </p>
                )}
              </div>
            )
          })}
        </div>

        {/* 델타 요약 + 상세 분석 버튼 */}
        <div className="px-4 py-3 border-t border-[var(--color-border)]/40">
          <div className="flex items-center gap-4 mb-3">
            <div className="flex items-center gap-1.5 text-xs">
              <span className="text-[var(--color-muted-foreground)]">승률</span>
              <span className="font-semibold text-green-400">+{pick.winRateDelta.toFixed(1)}%</span>
            </div>
            <div className="flex items-center gap-1.5 text-xs">
              <span className="text-[var(--color-muted-foreground)]">RP</span>
              <span className={cn("font-semibold", pick.averageRPDelta >= 0 ? "text-green-400" : "text-red-400")}>
                {pick.averageRPDelta >= 0 ? "+" : ""}{pick.averageRPDelta.toFixed(1)}
              </span>
            </div>
          </div>
          <button
            onClick={onNavigate}
            className="w-full py-2.5 rounded-lg bg-[var(--color-primary)]/15 text-[var(--color-primary)] text-sm font-semibold hover:bg-[var(--color-primary)]/25 transition-colors"
          >
            상세 분석 보기
          </button>
        </div>
      </div>
    </div>
  )
}
