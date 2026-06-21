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
    bgClass: "bg-[var(--color-surface)] border-[var(--color-border)]",
    Icon: TrendingUp,
  },
  nerf: {
    colorClass: "text-[var(--color-danger)]",
    bgClass: "bg-[var(--color-surface)] border-[var(--color-border)]",
    Icon: TrendingDown,
  },
  rework: {
    colorClass: "text-[var(--color-foreground)]",
    bgClass: "bg-[var(--color-surface)] border-[var(--color-border)]",
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
        "inline-flex items-center gap-1 rounded border px-2 py-1 text-[11px] font-semibold ",
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
