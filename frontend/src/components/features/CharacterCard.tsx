import Image from "next/image"
import { cn } from "@/lib/utils"
import type { PatchChange } from "@/data/patch-notes"

interface CharacterCardProps {
  name: string
  imageUrl: string
  rateChange: number
  patchChanges?: PatchChange[]
  className?: string
}

const CHANGE_LABEL: Record<PatchChange["changeType"], { label: string; className: string }> = {
  buff:   { label: "버프", className: "text-[var(--color-accent-gold)]" },
  nerf:   { label: "너프", className: "text-[var(--color-danger)]" },
  rework: { label: "변경", className: "text-blue-400" },
}

export function CharacterCard({ name, imageUrl, rateChange, patchChanges, className }: CharacterCardProps) {
  const isUp = rateChange >= 0
  const hasChanges = patchChanges && patchChanges.length > 0

  return (
    <div
      className={cn(
        "group relative flex items-center gap-3 rounded-lg bg-[var(--color-surface-2)] px-3 py-2.5 hover:bg-[var(--color-border)] transition-colors",
        className
      )}
    >
      <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-md bg-[var(--color-border)]">
        <Image
          src={imageUrl}
          alt={name}
          fill
          className="object-cover"
          sizes="48px"
        />
      </div>
      <div className="flex flex-col min-w-0">
        <span className="text-sm font-medium text-[var(--color-foreground)] truncate">{name}</span>
        <span
          className={cn(
            "text-xs font-semibold",
            isUp ? "text-[var(--color-accent-gold)]" : "text-[var(--color-danger)]"
          )}
        >
          {isUp ? "+" : ""}
          {rateChange.toFixed(1)} RP
        </span>
      </div>

      {hasChanges && (
        <div className="pointer-events-none absolute bottom-full left-0 right-0 z-50 mb-2 opacity-0 translate-y-1 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-200 ease-out">
          <div className="rounded-xl border border-white/10 bg-[var(--color-surface)]/80 backdrop-blur-md px-3 py-2.5 shadow-lg shadow-black/30 flex flex-col gap-2">
            {patchChanges.map((change, i) => {
              const { label, className: labelClass } = CHANGE_LABEL[change.changeType]
              return (
                <div key={i} className="flex flex-col gap-0.5">
                  <div className="flex items-center gap-1.5">
                    <span className={cn("text-[10px] font-bold shrink-0", labelClass)}>{label}</span>
                    <span className="text-[11px] text-[var(--color-foreground)]">{change.target}</span>
                  </div>
                  {change.valueSummary && (
                    <span className="text-[10px] text-[var(--color-muted-foreground)] pl-5 leading-snug">
                      {change.valueSummary}
                    </span>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
