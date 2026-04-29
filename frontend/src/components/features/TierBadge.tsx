import type { Tier } from "@/lib/design-tokens";
import { cn } from "@/lib/utils";

const tierStyles: Record<Tier, string> = {
  S: "bg-[var(--color-tier-s)]/16 text-[var(--color-tier-s)] ring-[var(--color-tier-s)]/28",
  A: "bg-[var(--color-tier-a)]/16 text-[var(--color-tier-a)] ring-[var(--color-tier-a)]/28",
  B: "bg-[var(--color-tier-b)]/16 text-[var(--color-tier-b)] ring-[var(--color-tier-b)]/28",
  C: "bg-[var(--color-tier-c)]/16 text-[var(--color-tier-c)] ring-[var(--color-tier-c)]/28",
  D: "bg-[var(--color-tier-d)]/12 text-[var(--color-tier-d)] ring-[var(--color-tier-d)]/18",
};

interface TierBadgeProps {
  tier: Tier;
  className?: string;
}

export function TierBadge({ tier, className }: TierBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex h-7 w-7 items-center justify-center rounded-lg ring-1 text-[11px] font-[var(--font-plex-mono)] font-bold shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]",
        tierStyles[tier],
        className
      )}
    >
      {tier}
    </span>
  );
}
