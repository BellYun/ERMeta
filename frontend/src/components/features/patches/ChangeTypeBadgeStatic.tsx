import { RefreshCw, TrendingDown, TrendingUp } from "lucide-react";
import type { ChangeType } from "@/data/patch-notes";
import { cn } from "@/lib/utils";

const CONFIG: Record<
  ChangeType,
  {
    colorClass: string;
    bgClass: string;
    Icon: React.FC<{ className?: string }>;
  }
> = {
  buff: {
    colorClass: "text-[var(--color-success)]",
    bgClass: "bg-[var(--color-success)]/14 border-[var(--color-success)]/28",
    Icon: TrendingUp,
  },
  nerf: {
    colorClass: "text-[var(--color-danger)]",
    bgClass: "bg-[var(--color-danger)]/14 border-[var(--color-danger)]/28",
    Icon: TrendingDown,
  },
  rework: {
    colorClass: "text-[var(--color-primary)]",
    bgClass: "bg-[var(--color-primary)]/14 border-[var(--color-primary)]/28",
    Icon: RefreshCw,
  },
};

export function ChangeTypeBadgeStatic({
  type,
  label,
  count,
}: {
  type: ChangeType;
  label: string;
  count?: number;
}) {
  const config = CONFIG[type];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2 py-1 text-[11px] font-semibold tracking-[-0.02em]",
        config.bgClass,
        config.colorClass
      )}
    >
      <config.Icon className="h-3 w-3" />
      <span>{label}</span>
      {typeof count === "number" && <span className="font-mono">{count}</span>}
    </span>
  );
}
