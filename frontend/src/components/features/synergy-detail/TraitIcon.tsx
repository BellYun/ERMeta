"use client"

import * as React from "react"
import Image from "next/image"
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

function getTraitIconUrl(code: number): string {
  return `/TraitSkill/TraitSkillIcon_${code}.png`
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
  const [imgError, setImgError] = React.useState(false)
  const group = getTraitGroup(code)
  const config = GROUP_CONFIG[group]
  const isSm = size === "sm"
  const iconSize = isSm ? 32 : 36

  const displayName = name ?? config.label

  return (
    <div
      className="inline-flex flex-col items-center gap-0.5"
      title={displayName}
    >
      <div className={cn(
        "inline-flex items-center justify-center",
        isSm ? "h-8 w-8" : "h-9 w-9"
      )}>
        {!imgError ? (
          <Image
            src={getTraitIconUrl(code)}
            alt={displayName}
            width={iconSize}
            height={iconSize}
            className="shrink-0 rounded-sm"
            onError={() => setImgError(true)}
          />
        ) : (
          <span className={cn("shrink-0 font-bold", config.text, isSm ? "text-[10px]" : "text-xs")}>
            {config.letter}
          </span>
        )}
      </div>
      <span className={cn(
        "w-14 truncate text-center font-medium",
        config.text,
        isSm ? "text-[9px]" : "text-[10px]"
      )}>
        {displayName}
      </span>
    </div>
  )
}
