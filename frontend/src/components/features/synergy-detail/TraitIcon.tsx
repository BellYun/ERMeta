"use client"

import { cn } from "@/lib/utils"

type TraitGroup = "havoc" | "fortification" | "support" | "cobalt" | "unknown"

const GROUP_CONFIG: Record<TraitGroup, { label: string; letter: string; bg: string; text: string; ring: string }> = {
  havoc:         { label: "포격",   letter: "포", bg: "bg-red-500/20",    text: "text-red-400",    ring: "ring-red-500/40" },
  fortification: { label: "요새화", letter: "요", bg: "bg-blue-500/20",   text: "text-blue-400",   ring: "ring-blue-500/40" },
  support:       { label: "지원",   letter: "지", bg: "bg-emerald-500/20", text: "text-emerald-400", ring: "ring-emerald-500/40" },
  cobalt:        { label: "코발트", letter: "코", bg: "bg-purple-500/20", text: "text-purple-400", ring: "ring-purple-500/40" },
  unknown:       { label: "?",     letter: "?",  bg: "bg-[var(--color-surface-2)]", text: "text-[var(--color-muted-foreground)]", ring: "ring-[var(--color-border)]" },
}

function getTraitGroup(code: number): TraitGroup {
  const prefix = Math.floor(code / 100000)
  if (prefix === 70) return "havoc"
  if (prefix === 71) return "fortification"
  if (prefix === 72) return "support"
  if (prefix === 73) return "cobalt"
  return "unknown"
}

export function TraitIcon({
  code,
  name,
  size = "sm",
}: {
  code: number
  name?: string | null
  size?: "sm" | "md"
}) {
  const group = getTraitGroup(code)
  const config = GROUP_CONFIG[group]
  const isSm = size === "sm"

  const displayName = name ?? config.label

  return (
    <div
      className={cn(
        "inline-flex items-center rounded-md ring-1",
        config.bg, config.ring,
        isSm ? "px-1.5 py-0.5" : "px-2 py-0.5"
      )}
      title={displayName}
    >
      <span className={cn(
        "truncate font-medium",
        config.text,
        isSm ? "text-[9px] max-w-[56px]" : "text-[10px] max-w-[72px]"
      )}>
        {displayName}
      </span>
    </div>
  )
}
