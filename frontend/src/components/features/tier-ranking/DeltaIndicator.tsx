import { cn } from "@/lib/utils"

export function DeltaIndicator({ current, previous, suffix = "", precision = 1 }: {
  current: number
  previous: number | undefined
  suffix?: string
  precision?: number
}) {
  if (previous === undefined) return null
  const diff = current - previous
  if (Math.abs(diff) < 0.05) return null

  const isPositive = diff > 0
  return (
    <span
      className={cn(
        "text-[10px] font-medium",
        isPositive ? "text-green-400" : "text-red-400"
      )}
    >
      {isPositive ? "+" : ""}{diff.toFixed(precision)}{suffix}
    </span>
  )
}
