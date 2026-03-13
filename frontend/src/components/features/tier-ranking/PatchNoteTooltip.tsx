import { cn } from "@/lib/utils"
import type { CharacterPatchNote } from "@/data/patch-notes"

export function PatchNoteTooltip({ patchNote }: { patchNote: CharacterPatchNote }) {
  const changeTypeLabel = (type: string) => {
    if (type === "buff") return { text: "BUFF", color: "text-green-400 bg-green-400/10 border-green-400/20" }
    if (type === "nerf") return { text: "NERF", color: "text-red-400 bg-red-400/10 border-red-400/20" }
    return { text: "REWORK", color: "text-blue-400 bg-blue-400/10 border-blue-400/20" }
  }

  return (
    <div className="absolute z-50 left-0 top-full mt-1 w-96 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 shadow-2xl shadow-black/40 pointer-events-none">
      <p className="text-xs font-medium text-[var(--color-muted-foreground)] mb-3">
        패치 {patchNote.patch} 변경사항
      </p>
      <div className="flex flex-col gap-3">
        {patchNote.changes.map((change, i) => {
          const { text, color } = changeTypeLabel(change.changeType)
          return (
            <div key={i} className="flex flex-col gap-1">
              <div className="flex items-center gap-2">
                <span className={cn("rounded px-1.5 py-0.5 text-[10px] font-bold border", color)}>
                  {text}
                </span>
                <span className="text-xs font-medium text-[var(--color-foreground)]">
                  {change.target}
                </span>
              </div>
              {change.valueSummary && (
                <p className="text-[11px] text-[var(--color-muted-foreground)] pl-1 break-words">
                  {change.valueSummary}
                </p>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
