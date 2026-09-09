import { useLocale } from "next-intl";
import { cn } from "@/lib/utils";

export function DeltaIndicator({
  current,
  previous,
  suffix = "",
  precision = 1,
}: {
  current: number;
  previous: number | undefined;
  suffix?: string;
  precision?: number;
}) {
  const locale = useLocale();
  if (previous === undefined)
    return (
      <span className="block text-[10px] font-normal text-[var(--color-muted-foreground)]">
        {locale === "ko" ? "비교 없음" : locale === "ja" ? "比較なし" : "No comparison"}
      </span>
    );
  const diff = current - previous;
  if (Math.abs(diff) < 0.5 * 10 ** -precision)
    return <span className="block text-[11px] text-[var(--color-muted-foreground)]">—</span>;

  const isPositive = diff > 0;
  return (
    <span
      className={cn(
        "block whitespace-nowrap text-[11px] font-medium tabular-nums",
        isPositive ? "text-[var(--color-stat-up)]" : "text-[var(--color-stat-down)]"
      )}
    >
      {isPositive ? "↑ " : "↓ "}
      {Math.abs(diff).toFixed(precision)}
      {suffix}
    </span>
  );
}
