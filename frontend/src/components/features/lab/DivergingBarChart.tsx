import { cn } from "@/lib/utils";
import type { ComboEntry } from "./types";

// ── helpers ────────────────────────────────────────────────────────────────

function formatDelta(n: number): string {
  return (n >= 0 ? "+" : "") + n.toFixed(1);
}

function formatGames(n: number): string {
  return n.toLocaleString("ko-KR");
}

// ── BarRow ─────────────────────────────────────────────────────────────────

interface BarRowProps {
  entry: ComboEntry;
  /** 0–100: bar fill width as % of the half-track */
  pct: number;
  variant: "strong" | "weak";
}

function BarRow({ entry, pct, variant }: BarRowProps) {
  const isStrong = variant === "strong";
  const deltaText = formatDelta(entry.delta);
  const gamesText = formatGames(entry.games);

  return (
    <li
      className="py-1.5 border-b border-[var(--color-border)]/40 last:border-b-0"
      aria-label={`${entry.multiset}: ${deltaText} RP, ${gamesText}게임`}
    >
      {/* Label row */}
      <p className="text-[11px] text-[var(--color-muted-foreground)] leading-snug mb-1.5 break-keep">
        {entry.multiset}
      </p>

      {/* Bar + stats row */}
      <div
        className={cn(
          "flex items-center gap-1.5",
          // Weak bars: reverse so the bar "grows away" from the label
          !isStrong && "flex-row-reverse"
        )}
      >
        {/* Bar track */}
        <div
          aria-hidden="true"
          className="flex-1 h-[14px] rounded-full overflow-hidden bg-[var(--color-surface-2)]"
          style={{
            display: "flex",
            justifyContent: isStrong ? "flex-start" : "flex-end",
          }}
        >
          <div
            className="h-full rounded-full"
            style={{
              width: `${pct}%`,
              backgroundColor: isStrong ? "var(--color-tier-s)" : "var(--color-danger)",
              opacity: 0.82,
            }}
          />
        </div>

        {/* Delta value */}
        <span
          className={cn(
            "text-xs font-semibold tabular-nums shrink-0 w-[38px]",
            isStrong
              ? "text-[var(--color-tier-s)] text-left"
              : "text-[var(--color-danger)] text-right"
          )}
        >
          {deltaText}
        </span>

        {/* Games */}
        <span className="text-[10px] text-[var(--color-muted-foreground)] tabular-nums shrink-0 w-[44px] text-right">
          {gamesText}판
        </span>
      </div>
    </li>
  );
}

// ── Half panel ─────────────────────────────────────────────────────────────

interface HalfPanelProps {
  label: string;
  labelColor: string;
  entries: ComboEntry[];
  maxDelta: number;
  variant: "strong" | "weak";
  className?: string;
}

function HalfPanel({ label, labelColor, entries, maxDelta, variant, className }: HalfPanelProps) {
  const pct = (delta: number) =>
    maxDelta > 0 ? Math.round((Math.abs(delta) / maxDelta) * 100) : 0;

  return (
    <div className={cn("px-4 py-3", className)}>
      <p
        className="text-[11px] font-bold uppercase tracking-wide mb-2"
        style={{ color: labelColor }}
      >
        {label}
      </p>

      {entries.length === 0 ? (
        <p className="text-xs text-[var(--color-muted-foreground)] italic">표본 부족</p>
      ) : (
        <ul className="m-0 p-0 list-none">
          {entries.map((entry) => (
            <BarRow key={entry.multiset} entry={entry} pct={pct(entry.delta)} variant={variant} />
          ))}
        </ul>
      )}
    </div>
  );
}

// ── DivergingBarChart ──────────────────────────────────────────────────────

interface DivergingBarChartProps {
  /** Sorted desc by delta (positive RP) */
  strong: ComboEntry[];
  /** Sorted asc by delta (most negative first) */
  weak: ComboEntry[];
}

export function DivergingBarChart({ strong, weak }: DivergingBarChartProps) {
  // Shared scale: largest |delta| across all shown rows in this card
  const allDeltas = [...strong, ...weak].map((e) => Math.abs(e.delta));
  const maxDelta = allDeltas.length > 0 ? Math.max(...allDeltas) : 1;

  return (
    // On mobile: stack vertically. On sm+: side-by-side with a center divider.
    <div className="grid grid-cols-1 sm:grid-cols-[1fr_1px_1fr] divide-y sm:divide-y-0 divide-[var(--color-border)]">
      <HalfPanel
        label="강한 조합"
        labelColor="var(--color-tier-s)"
        entries={strong}
        maxDelta={maxDelta}
        variant="strong"
      />

      {/* Center axis divider (visible only on sm+) */}
      <div aria-hidden="true" className="hidden sm:block self-stretch bg-[var(--color-border)]" />

      <HalfPanel
        label="약한 조합"
        labelColor="var(--color-danger)"
        entries={weak}
        maxDelta={maxDelta}
        variant="weak"
      />
    </div>
  );
}
