import type { Tier } from "@/lib/design-tokens";
import { cn } from "@/lib/utils";

const tierStyles: Record<Tier, string> = {
  S: "bg-[var(--color-surface)] text-[var(--color-foreground)] ring-[var(--color-border)]",
  A: "bg-[var(--color-surface)] text-[var(--color-foreground)] ring-[var(--color-border)]",
  B: "bg-[var(--color-surface)] text-[var(--color-foreground)] ring-[var(--color-border)]",
  C: "bg-[var(--color-surface)] text-[var(--color-foreground)] ring-[var(--color-border)]",
  D: "bg-[var(--color-surface)] text-[var(--color-muted-foreground)] ring-[var(--color-border)]",
};

interface TierBadgeProps {
  tier: Tier;
  className?: string;
}

export function TierBadge({ tier, className }: TierBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex h-7 w-7 items-center justify-center rounded ring-1 text-[11px] font-[var(--font-plex-mono)] font-bold",
        tierStyles[tier],
        className
      )}
    >
      {tier}
    </span>
  );
}
