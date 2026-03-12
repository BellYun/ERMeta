import { cn } from "@/lib/utils"
import type { Tier } from "@/lib/design-tokens"

const tierStyles: Record<Tier, string> = {
  S: "bg-[var(--color-tier-s)]/15 text-[var(--color-tier-s)] border-[var(--color-tier-s)]/30 shadow-[0_0_8px_var(--color-tier-s)20]",
  A: "bg-[var(--color-tier-a)]/15 text-[var(--color-tier-a)] border-[var(--color-tier-a)]/30",
  B: "bg-[var(--color-tier-b)]/15 text-[var(--color-tier-b)] border-[var(--color-tier-b)]/30",
  C: "bg-[var(--color-tier-c)]/15 text-[var(--color-tier-c)] border-[var(--color-tier-c)]/30",
  D: "bg-[var(--color-tier-d)]/10 text-[var(--color-tier-d)] border-[var(--color-tier-d)]/20",
}

interface TierBadgeProps {
  tier: Tier
  className?: string
}

export function TierBadge({ tier, className }: TierBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center justify-center w-7 h-7 rounded-md border text-xs font-black tracking-wide",
        tierStyles[tier],
        className
      )}
    >
      {tier}
    </span>
  )
}
