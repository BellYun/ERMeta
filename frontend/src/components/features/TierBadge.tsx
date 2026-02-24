import { cn } from "@/lib/utils"
import type { Tier } from "@/lib/design-tokens"

const tierStyles: Record<Tier, string> = {
  S: "bg-[var(--color-tier-s)]/20 text-[var(--color-tier-s)] border-[var(--color-tier-s)]/40",
  A: "bg-[var(--color-tier-a)]/20 text-[var(--color-tier-a)] border-[var(--color-tier-a)]/40",
  B: "bg-[var(--color-tier-b)]/20 text-[var(--color-tier-b)] border-[var(--color-tier-b)]/40",
  C: "bg-[var(--color-tier-c)]/20 text-[var(--color-tier-c)] border-[var(--color-tier-c)]/40",
  D: "bg-[var(--color-tier-d)]/20 text-[var(--color-tier-d)] border-[var(--color-tier-d)]/40",
}

interface TierBadgeProps {
  tier: Tier
  className?: string
}

export function TierBadge({ tier, className }: TierBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center justify-center w-7 h-7 rounded-md border text-xs font-bold",
        tierStyles[tier],
        className
      )}
    >
      {tier}
    </span>
  )
}
