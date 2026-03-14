"use client"

import * as React from "react"
import { TrendingUp, TrendingDown, Minus } from "lucide-react"
import { cn } from "@/lib/utils"

export function DeltaBadge({ delta, inverted = false }: { delta: number; inverted?: boolean }) {
  if (delta === 0) return <Minus className="inline h-3.5 w-3.5 text-[var(--color-muted-foreground)]" />
  const positive = inverted ? delta < 0 : delta > 0
  const color = positive ? "text-[var(--color-accent-gold)]" : "text-[var(--color-danger)]"
  const Icon = delta > 0 ? TrendingUp : TrendingDown
  return (
    <span className={cn("inline-flex items-center gap-0.5 text-xs font-medium", color)}>
      <Icon className="h-3 w-3" />
      {delta > 0 ? "+" : ""}{delta.toFixed(2)}
    </span>
  )
}

export function SkeletonCard() {
  return <div className="h-16 rounded-lg bg-[var(--color-surface-2)] animate-pulse" />
}

export function StatCard({
  label,
  value,
  sub,
  delta,
  deltaLabel,
  deltaInverted,
  gauge,
}: {
  label: string
  value: string
  sub?: string
  delta?: number
  deltaLabel?: string
  deltaInverted?: boolean
  gauge?: { current: number; expected: number; max: number; inverted?: boolean }
}) {
  return (
    <div className="flex flex-col gap-0.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-2)]/80 px-2.5 sm:px-4 py-2.5 sm:py-3 overflow-hidden">
      <span className="text-[10px] sm:text-xs text-[var(--color-muted-foreground)]">{label}</span>
      <span className="text-base sm:text-lg font-bold text-[var(--color-foreground)] truncate">{value}</span>
      {delta !== undefined ? (
        <div className="flex items-center gap-0.5">
          <DeltaBadge delta={delta} inverted={deltaInverted} />
          {deltaLabel && (
            <span className="text-xs text-[var(--color-muted-foreground)]">{deltaLabel}</span>
          )}
        </div>
      ) : sub ? (
        <span className="text-xs text-[var(--color-muted-foreground)]">{sub}</span>
      ) : null}
      {gauge && (
        <div className="relative mt-1 h-1.5 w-full rounded-full bg-[var(--color-border)]">
          <div
            className={cn(
              "h-full rounded-full transition-all",
              (gauge.inverted ? gauge.current < gauge.expected : gauge.current > gauge.expected)
                ? "bg-[var(--color-accent-gold)]"
                : "bg-[var(--color-danger)]"
            )}
            style={{ width: `${Math.min((gauge.current / gauge.max) * 100, 100)}%` }}
          />
          <div
            className="absolute top-0 h-full w-px bg-[var(--color-foreground)]/40"
            style={{ left: `${(gauge.expected / gauge.max) * 100}%` }}
            title={`기대값: ${gauge.expected}`}
          />
        </div>
      )}
    </div>
  )
}
