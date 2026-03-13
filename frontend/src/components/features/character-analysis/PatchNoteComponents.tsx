"use client"

import * as React from "react"
import { getCharacterPatchNote } from "@/data/patch-notes"
import type { ChangeType } from "@/data/patch-notes"
import { cn } from "@/lib/utils"
import { CHANGE_TYPE_CONFIG } from "./constants"

export function ChangeTypeBadge({ type }: { type: ChangeType }) {
  const config = CHANGE_TYPE_CONFIG[type]
  return (
    <span className={cn("inline-flex items-center gap-1 rounded border px-1.5 sm:px-2 py-0.5 text-xs font-semibold shrink-0", config.bgClass, config.colorClass)}>
      <config.Icon className="h-3 w-3" />
      <span className="hidden sm:inline">{config.label}</span>
    </span>
  )
}

export function PatchTooltip({
  active,
  payload,
  label,
  selectedCode,
  metricLabel,
  format,
}: {
  active?: boolean
  payload?: ReadonlyArray<{ value?: number | string | null }>
  label?: string | number
  selectedCode: number
  metricLabel: string
  format: (v: number) => string
}) {
  if (!active || !payload?.length) return null
  const rawValue = payload[0]?.value
  const value = typeof rawValue === "number" ? rawValue : undefined
  const patchLabel = label != null ? String(label) : ""
  const note = patchLabel ? getCharacterPatchNote(selectedCode, patchLabel) : undefined

  return (
    <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]/80 p-3 text-xs shadow-lg max-w-[220px]">
      <p className="mb-1 font-semibold text-[var(--color-foreground)]">{patchLabel || "-"}</p>
      <p className="text-[var(--color-muted-foreground)]">
        {metricLabel}:{" "}
        <span className="font-medium text-[var(--color-foreground)]">
          {value != null ? format(value) : "-"}
        </span>
      </p>
      {note && note.changes.length > 0 && (
        <div className="mt-2 border-t border-[var(--color-border)] pt-2 space-y-1">
          {note.changes.map((change, i) => {
            const config = CHANGE_TYPE_CONFIG[change.changeType]
            return (
              <div key={i} className="flex items-start gap-1.5">
                <span className={cn("shrink-0 font-bold", config.colorClass)}>
                  [{config.label}]
                </span>
                <span className="text-[var(--color-muted-foreground)] leading-tight">
                  {change.target}
                  {change.valueSummary && (
                    <span className={cn("ml-1 font-mono", config.colorClass)}>
                      {change.valueSummary}
                    </span>
                  )}
                </span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
