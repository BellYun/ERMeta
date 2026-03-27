"use client"

export function WinRateSpan({ winRate, label }: { winRate: number; label?: string }) {
  return (
    <span className="font-medium text-[var(--color-foreground)]">
      {label}{winRate.toFixed(1)}%
    </span>
  )
}
