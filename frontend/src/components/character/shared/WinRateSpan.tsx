"use client"

import { cn } from "@/lib/utils"

export function WinRateSpan({ winRate, label }: { winRate: number; label?: string }) {
  return (
    <span
      className={cn(
        "font-medium",
        winRate >= 55 ? "text-[var(--color-accent-gold)]" : "text-[var(--color-muted-foreground)]"
      )}
    >
      {label}{winRate.toFixed(1)}%
    </span>
  )
}
