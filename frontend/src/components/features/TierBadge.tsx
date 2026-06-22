import type { Tier } from "@/lib/design-tokens";
import { cn } from "@/lib/utils";

const tierStyles: Record<Tier, string> = {
  S: "border-[var(--color-tier-s)] bg-[var(--color-tier-s)] text-white ring-[color-mix(in_srgb,var(--color-tier-s)_42%,transparent)]",
  A: "border-[var(--color-tier-a)] bg-[var(--color-tier-a)] text-white ring-[color-mix(in_srgb,var(--color-tier-a)_40%,transparent)]",
  B: "border-[var(--color-tier-b)] bg-[var(--color-tier-b)] text-white ring-[color-mix(in_srgb,var(--color-tier-b)_40%,transparent)]",
  C: "border-[var(--color-tier-c)] bg-[var(--color-tier-c)] text-white ring-[color-mix(in_srgb,var(--color-tier-c)_42%,transparent)]",
  D: "border-[var(--color-tier-d)] bg-[var(--color-tier-d)] text-white ring-[color-mix(in_srgb,var(--color-tier-d)_40%,transparent)]",
};

interface TierBadgeProps {
  tier: Tier;
  className?: string;
}

export function TierBadge({ tier, className }: TierBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex h-7 min-w-7 items-center justify-center rounded ring-1 text-[11px] font-[var(--font-plex-mono)] font-black shadow-[inset_0_-2px_0_rgba(15,23,42,0.18)]",
        "border",
        tierStyles[tier],
        className
      )}
    >
      {tier}
    </span>
  );
}
