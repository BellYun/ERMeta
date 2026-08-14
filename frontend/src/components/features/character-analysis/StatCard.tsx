"use client";

import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import * as React from "react";
import { cn } from "@/lib/utils";

export function DeltaBadge({ delta, inverted = false }: { delta: number; inverted?: boolean }) {
  if (delta === 0)
    return <Minus className="inline h-3.5 w-3.5 text-[var(--color-muted-foreground)]" />;
  const positive = inverted ? delta < 0 : delta > 0;
  const color = positive ? "text-[var(--color-stat-up)]" : "text-[var(--color-stat-down)]";
  const Icon = delta > 0 ? TrendingUp : TrendingDown;
  return (
    <span className={cn("inline-flex items-center gap-0.5 text-xs font-medium", color)}>
      <Icon className="h-3 w-3" />
      {delta > 0 ? "+" : ""}
      {delta.toFixed(2)}
    </span>
  );
}

export function SkeletonCard() {
  return (
    <div className="h-[68px] rounded-md border border-[var(--color-border)] bg-[var(--color-surface)]" />
  );
}

const ACCENT_COLORS = {
  blue: {
    border: "border-l-[var(--color-accent)]",
    gauge: "bg-[var(--color-accent)]",
  },
  gold: {
    border: "border-l-[var(--color-accent)]",
    gauge: "bg-[var(--color-accent)]",
  },
  purple: {
    border: "border-l-[var(--color-accent)]",
    gauge: "bg-[var(--color-accent)]",
  },
  green: {
    border: "border-l-[var(--color-accent)]",
    gauge: "bg-[var(--color-accent)]",
  },
};

export function StatCard({
  label,
  value,
  sub,
  delta,
  deltaLabel,
  deltaInverted,
  gauge,
  accent = "blue",
}: {
  label: string;
  value: string;
  sub?: string;
  delta?: number;
  deltaLabel?: string;
  deltaInverted?: boolean;
  gauge?: { current: number; expected: number; max: number; inverted?: boolean };
  accent?: keyof typeof ACCENT_COLORS;
}) {
  const colors = ACCENT_COLORS[accent];

  return (
    <div
      className={cn(
        "flex min-h-[68px] flex-col justify-between overflow-hidden rounded-md border border-[var(--color-border)] border-l-2 bg-[var(--color-surface)]",
        "px-2.5 py-2 sm:px-3",
        colors.border
      )}
    >
      <span className="text-[10px] font-semibold text-[var(--color-muted-foreground)]">
        {label}
      </span>
      <div className="mt-1 flex items-baseline gap-1.5">
        <span className="font-mono text-lg font-bold tabular-nums leading-none text-[var(--color-foreground)] sm:text-xl">
          {value}
        </span>
        {delta !== undefined && (
          <div className="flex items-center gap-0.5">
            <DeltaBadge delta={delta} inverted={deltaInverted} />
            {deltaLabel && (
              <span className="text-[10px] text-[var(--color-muted-foreground)]">{deltaLabel}</span>
            )}
          </div>
        )}
        {delta === undefined && sub && (
          <span className="text-[10px] text-[var(--color-muted-foreground)]">{sub}</span>
        )}
      </div>
      {gauge && (
        <div className="relative mt-1.5 h-1 w-full rounded-full bg-[var(--color-border)]/60">
          <div
            className={cn(
              "h-full rounded-full",
              (gauge.inverted ? gauge.current < gauge.expected : gauge.current > gauge.expected)
                ? colors.gauge
                : "bg-[var(--color-danger)]"
            )}
            style={{ width: `${Math.min((gauge.current / gauge.max) * 100, 100)}%` }}
          />
          <div
            className="absolute top-1/2 -translate-y-1/2 w-0.5 h-2.5 rounded-full bg-[var(--color-foreground)]/30"
            style={{ left: `${(gauge.expected / gauge.max) * 100}%` }}
            title={`기대값: ${gauge.expected}`}
          />
        </div>
      )}
    </div>
  );
}
