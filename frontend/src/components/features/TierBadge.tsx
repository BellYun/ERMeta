import type { Tier } from "@/lib/design-tokens"
import { cn } from "@/lib/utils"

const tierStyles: Record<Tier, string> = {
  S: "bg-[var(--color-tier-s)]/15 text-[var(--color-tier-s)] ring-[var(--color-tier-s)]/25",
  A: "bg-[var(--color-tier-a)]/15 text-[var(--color-tier-a)] ring-[var(--color-tier-a)]/25",
  B: "bg-[var(--color-tier-b)]/15 text-[var(--color-tier-b)] ring-[var(--color-tier-b)]/25",
  C: "bg-[var(--color-tier-c)]/15 text-[var(--color-tier-c)] ring-[var(--color-tier-c)]/25",
  D: "bg-[var(--color-tier-d)]/10 text-[var(--color-tier-d)] ring-[var(--color-tier-d)]/15",
}

interface TierBadgeProps {
  tier: Tier
  className?: string
}

export function TierBadge({ tier, className }: TierBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center justify-center w-6 h-6 rounded-md ring-1 text-[11px] font-black",
        tierStyles[tier],
        className
      )}
    >
      {tier}
    </span>
  )
}
