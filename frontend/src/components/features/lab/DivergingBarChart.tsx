/* Hallmark · pre-emit critique: P5 H5 E5 S5 R5 V4 */
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ComboEntry, ComboTrend } from "./types";

// ── helpers ────────────────────────────────────────────────────────────────

function formatDelta(n: number): string {
  return (n >= 0 ? "+" : "") + n.toFixed(1);
}

function formatGames(n: number): string {
  return n.toLocaleString("ko-KR");
}

function formatRp(n: number): string {
  return `${n >= 0 ? "+" : ""}${n.toFixed(2)}`;
}

const CONFIDENCE_LABEL = {
  high: "높음",
  medium: "보통",
  low: "낮음",
} as const;

// ── BarRow ─────────────────────────────────────────────────────────────────

interface BarRowProps {
  entry: ComboEntry;
  /** 0–100: bar fill width as % of the half-track */
  pct: number;
  variant: "strong" | "weak";
}

function BarStats({ entry, pct, variant }: BarRowProps) {
  const isStrong = variant === "strong";
  const deltaText = formatDelta(entry.delta);
  const gamesText = formatGames(entry.games);

  return (
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
        className="flex h-[14px] flex-1 overflow-hidden rounded-full bg-[var(--color-surface-2)]"
        style={{ justifyContent: isStrong ? "flex-start" : "flex-end" }}
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
          "w-[38px] shrink-0 text-xs font-semibold tabular-nums",
          isStrong
            ? "text-left text-[var(--color-tier-s)]"
            : "text-right text-[var(--color-danger)]"
        )}
      >
        {deltaText}
      </span>

      {/* Games */}
      <span className="w-[44px] shrink-0 text-right text-[10px] tabular-nums text-[var(--color-muted-foreground)]">
        {gamesText}판
      </span>
    </div>
  );
}

function TrendPanel({ trend }: { trend: ComboTrend }) {
  return (
    <div className="border-t border-[var(--color-border)] bg-[var(--color-surface-2)]/45 px-2.5 py-2.5">
      <p className="text-[13px] font-semibold text-[var(--color-foreground)]">
        {trend.focalLabel}과 잘 맞는 실험체 조합 경향
      </p>

      {trend.patterns.length === 0 ? (
        <div className="mt-1.5 text-[13px] leading-5 text-[var(--color-muted-foreground)]">
          <p>{trend.compositionLabel} 조합에서 상승하는 경향이 있습니다.</p>
          <p>세부 실험체 유형은 아직 표본이 부족합니다.</p>
        </div>
      ) : (
        <table className="mt-2 w-full table-fixed border-collapse text-left">
          <colgroup>
            <col className="w-[48%]" />
            <col className="w-[52%]" />
          </colgroup>
          <thead>
            <tr className="border-y border-[var(--color-border)]">
              <th
                scope="col"
                className="py-1.5 pr-2 text-sm font-semibold text-[var(--color-foreground)]"
              >
                내부 역할군
              </th>
              <th
                scope="col"
                className="border-l border-[var(--color-border)] py-1.5 pl-2 text-sm font-semibold text-[var(--color-foreground)]"
              >
                해당 실험체
              </th>
            </tr>
          </thead>
          {trend.patterns.map((pattern) => (
            <tbody
              key={pattern.partnerGroups.map((group) => `${group.role}:${group.fitRole}`).join("|")}
              className="divide-y divide-[var(--color-border)]/60 border-b-2 border-[var(--color-border)] last:border-b-0"
            >
              <tr className="bg-[var(--color-surface)]/70">
                <td
                  colSpan={2}
                  className="break-keep px-2 py-2 text-[13px] leading-5 tabular-nums text-[var(--color-foreground)]"
                >
                  <span className="font-semibold">유형 전체</span>
                  <span className="text-[var(--color-muted-foreground)]">
                    {` — ${formatGames(pattern.games)}판 · 평균 ${formatRp(pattern.avgRp)} RP · 보정 상승 ${formatRp(pattern.adjustedLift)} RP · 신뢰 ${CONFIDENCE_LABEL[pattern.confidence]}`}
                  </span>
                </td>
              </tr>
              {pattern.partnerGroups.map((group, groupIndex) => (
                <tr key={`${group.role}:${group.fitRole}:${groupIndex}`}>
                  <th
                    scope="row"
                    className="break-keep align-top py-2 pr-2 text-[13px] font-semibold leading-5 text-[var(--color-foreground)]"
                  >
                    {group.fitRole}형 {group.role}
                  </th>
                  <td className="break-keep border-l border-[var(--color-border)] align-top py-2 pl-2 text-[13px] leading-5 text-[var(--color-muted-foreground)]">
                    {group.characters.length > 0 ? group.characters.join(" · ") : "신뢰 표본 부족"}
                  </td>
                </tr>
              ))}
              <tr>
                <td
                  colSpan={2}
                  className="px-2 py-2 text-[13px] leading-5 text-[var(--color-muted-foreground)]"
                >
                  <p className="mb-1 font-semibold text-[var(--color-foreground)]">
                    확인된 실제 3인 성적
                  </p>
                  {pattern.actualCombinations.length > 0 ? (
                    <ul className="space-y-1.5">
                      {pattern.actualCombinations.map((combination) => (
                        <li
                          key={`${combination.characters.join(":")}:${combination.games}:${combination.avgRp}`}
                          className="break-keep"
                        >
                          <span className="font-medium text-[var(--color-foreground)]">
                            {combination.characters.join(" · ")}
                          </span>
                          <span className="tabular-nums">
                            {` — ${formatGames(combination.games)}판 · 평균 ${formatRp(combination.avgRp)} RP · 보정 상승 ${formatRp(combination.adjustedLift)} RP`}
                          </span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <span>
                      {formatGames(pattern.characterMinGames)}판 이상 상위 상승 조합에 없음
                    </span>
                  )}
                </td>
              </tr>
            </tbody>
          ))}
        </table>
      )}

      <p className="mt-2 border-t border-[var(--color-border)]/60 pt-1.5 text-[13px] text-[var(--color-muted-foreground)]">
        시즌 10·11 · {formatGames(trend.minGames)}판 이상 내부 유형 기준
      </p>
    </div>
  );
}

function BarRow({ entry, pct, variant }: BarRowProps) {
  const rowLabel = `${entry.multiset}: ${formatDelta(entry.delta)} RP, ${formatGames(entry.games)}게임`;

  if (variant === "strong" && entry.trend) {
    return (
      <li className="border-b border-[var(--color-border)]/40 last:border-b-0">
        <details className="group">
          <summary
            className="min-h-11 cursor-pointer list-none px-1 py-1.5 outline-none active:bg-[var(--color-surface-2)]/35 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--color-accent)] [&::-webkit-details-marker]:hidden"
            aria-label={`${rowLabel}. 조합 경향 보기`}
          >
            <div className="mb-1.5 flex min-w-0 items-center justify-between gap-2">
              <p className="min-w-0 truncate text-[11px] leading-snug text-[var(--color-muted-foreground)]">
                {entry.multiset}
              </p>
              <ChevronDown
                aria-hidden="true"
                className="h-3.5 w-3.5 shrink-0 text-[var(--color-muted-foreground)] transition-transform duration-200 group-open:rotate-180 motion-reduce:transition-none"
              />
            </div>
            <BarStats entry={entry} pct={pct} variant={variant} />
          </summary>
          <TrendPanel trend={entry.trend} />
        </details>
      </li>
    );
  }

  return (
    <li
      className="border-b border-[var(--color-border)]/40 py-1.5 last:border-b-0"
      aria-label={rowLabel}
    >
      <p className="mb-1.5 break-keep text-[11px] leading-snug text-[var(--color-muted-foreground)]">
        {entry.multiset}
      </p>
      <BarStats entry={entry} pct={pct} variant={variant} />
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
      <p className="mb-2 text-[11px] font-semibold" style={{ color: labelColor }}>
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
