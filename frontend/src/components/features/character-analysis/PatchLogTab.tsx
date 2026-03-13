"use client"

import * as React from "react"
import { getCharacterPatchNote } from "@/data/patch-notes"
import { cn } from "@/lib/utils"
import { CHANGE_TYPE_CONFIG } from "./constants"
import { ChangeTypeBadge } from "./PatchNoteComponents"

interface PatchLogTabProps {
  patches: string[]
  selectedCode: number
}

export function PatchLogTab({ patches, selectedCode }: PatchLogTabProps) {
  if (patches.length === 0) {
    return (
      <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]/80 p-8 text-center text-sm text-[var(--color-muted-foreground)]">
        패치 정보를 불러오는 중...
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {patches.slice(0, 5).map((patch, i) => {
        const note = getCharacterPatchNote(selectedCode, patch)
        return (
          <div key={patch} className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]/80 overflow-hidden">
            {/* 패치 버전 헤더 */}
            <div className="flex items-center gap-2 border-b border-[var(--color-border)] bg-[var(--color-surface-2)] px-4 py-2">
              <span className="text-xs font-semibold text-[var(--color-foreground)]">{patch}</span>
              {i === 0 && (
                <span className="rounded bg-[var(--color-primary)]/20 px-1.5 py-0.5 text-[10px] text-[var(--color-primary)]">현재</span>
              )}
            </div>
            {/* 변경 내역 */}
            {!note || note.changes.length === 0 ? (
              <div className="px-4 py-3 text-xs text-[var(--color-muted-foreground)]">변경 사항 없음</div>
            ) : (
              <div className="divide-y divide-[var(--color-border)]">
                {note.changes.map((change, idx) => {
                  const config = CHANGE_TYPE_CONFIG[change.changeType]
                  return (
                    <div key={idx} className="flex gap-3 px-4 py-3 hover:bg-[var(--color-surface-2)] transition-colors">
                      <div className="pt-0.5"><ChangeTypeBadge type={change.changeType} /></div>
                      <div className="flex flex-1 flex-col gap-1 min-w-0">
                        <div className="flex items-center justify-between gap-2 flex-wrap">
                          <span className="text-sm font-medium text-[var(--color-foreground)]">{change.target}</span>
                          {change.valueSummary && (
                            <span className={cn("text-xs font-mono shrink-0", config.colorClass)}>{change.valueSummary}</span>
                          )}
                        </div>
                        <ul className="space-y-0.5">
                          {change.description.map((desc, di) => (
                            <li key={di} className="text-xs text-[var(--color-muted-foreground)] before:content-['•'] before:mr-1.5">{desc}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
