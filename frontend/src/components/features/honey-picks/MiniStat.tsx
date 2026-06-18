import { cn } from "@/lib/utils";

export function MiniStat({
  label,
  value,
  delta,
  highlight,
  gold,
}: {
  label: string;
  value: string;
  delta: number;
  highlight?: boolean;
  gold?: boolean;
}) {
  return (
    <div className="rounded-md bg-white px-1.5 py-1.5 text-center">
      <p className="text-[8px] leading-none text-[var(--color-muted-foreground)]">{label}</p>
      <p
        className={cn(
          "text-[12px] font-bold tabular-nums leading-tight mt-1",
          gold
            ? "text-[var(--color-accent-gold)]"
            : highlight
              ? "text-[var(--color-foreground)]"
              : "text-[var(--color-foreground)]/90"
        )}
      >
        {value}
      </p>
      <p
        className={cn(
          "text-[8px] font-semibold mt-0.5 tabular-nums leading-none",
          delta >= 0 ? "text-[var(--color-stat-up)]" : "text-[var(--color-stat-down)]"
        )}
      >
        {delta >= 0 ? "+" : ""}
        {delta.toFixed(1)}
      </p>
    </div>
  );
}
