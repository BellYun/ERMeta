"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { RecapPatchChange } from "@/lib/seasonRecap";
import { cn } from "@/lib/utils";

export interface ChartDatum {
  patch: string;
  averageRP: number | null;
  overallAverageRP?: number | null;
  patchChanges?: RecapPatchChange[];
  totalGames: number;
  hasData: boolean;
}

interface SeasonHallOfFameChartProps {
  data: ChartDatum[];
}

export default function SeasonHallOfFameChart({ data }: SeasonHallOfFameChartProps) {
  const hasComparison = data.some((datum) => datum.overallAverageRP != null);

  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} margin={{ top: 10, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
        <XAxis
          dataKey="patch"
          tick={<PatchAverageTick data={data} />}
          tickLine={false}
          axisLine={false}
          height={42}
          interval={0}
        />
        <YAxis
          domain={["auto", "auto"]}
          tick={{ fill: "var(--color-muted-foreground)", fontSize: 10 }}
          tickLine={false}
          axisLine={false}
          width={36}
        />
        <ReferenceLine y={0} stroke="var(--color-muted-foreground)" strokeOpacity={0.6} />
        <Tooltip content={<RPTooltip />} cursor={{ fill: "var(--color-surface-2)" }} />
        <Bar dataKey="averageRP" radius={[4, 4, 0, 0]}>
          {data.map((datum) => (
            <Cell
              key={datum.patch}
              fill={
                !datum.hasData
                  ? "var(--color-border)"
                  : (datum.averageRP ?? 0) >= 0
                    ? "var(--color-accent-foreground)"
                    : "var(--color-danger)"
              }
              fillOpacity={datum.hasData ? 0.86 : 0.3}
            />
          ))}
        </Bar>
        {hasComparison ? (
          <Line
            type="monotone"
            dataKey="overallAverageRP"
            stroke="var(--color-warning)"
            strokeWidth={2}
            dot={{
              r: 3,
              fill: "var(--color-surface)",
              stroke: "var(--color-warning)",
              strokeWidth: 2,
            }}
            activeDot={{ r: 4, stroke: "var(--color-warning)" }}
            connectNulls={false}
          />
        ) : null}
      </BarChart>
    </ResponsiveContainer>
  );
}

function PatchAverageTick({
  x = 0,
  y = 0,
  payload,
  data,
}: {
  x?: number;
  y?: number;
  payload?: { value?: string };
  data: ChartDatum[];
}) {
  const patch = payload?.value ?? "";
  const datum = data.find((item) => item.patch === patch);
  const averageRP = datum?.averageRP ?? null;
  const hasData = Boolean(datum?.hasData && averageRP != null);

  return (
    <g transform={`translate(${x},${y})`}>
      <text y={11} textAnchor="middle" fill="var(--color-muted-foreground)" fontSize={9}>
        {patch}
      </text>
      <text
        y={27}
        textAnchor="middle"
        fill={
          !hasData
            ? "var(--color-muted-foreground)"
            : (averageRP ?? 0) >= 0
              ? "var(--color-stat-up)"
              : "var(--color-danger)"
        }
        fontSize={10}
        fontWeight={700}
      >
        {hasData ? `${(averageRP ?? 0) >= 0 ? "+" : ""}${averageRP?.toFixed(1)}` : "—"}
      </text>
    </g>
  );
}

function RPTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{ payload: ChartDatum }>;
}) {
  if (!active || !payload?.length) return null;
  const datum = payload[0].payload;
  const hasComparison = datum.overallAverageRP != null;
  const difference =
    datum.averageRP != null && datum.overallAverageRP != null
      ? datum.averageRP - datum.overallAverageRP
      : null;

  return (
    <div className="max-w-[340px] rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 shadow-lg">
      <p className="text-[11px] font-semibold text-[var(--color-foreground)]">{datum.patch} 패치</p>
      {datum.hasData ? (
        <>
          <p
            className={cn(
              "mt-1 text-xs font-bold tabular-nums",
              (datum.averageRP ?? 0) >= 0
                ? "text-[var(--color-accent-foreground)]"
                : "text-[var(--color-danger)]"
            )}
          >
            {hasComparison ? "캐릭터 평균 RP" : "평균 RP"} {(datum.averageRP ?? 0) >= 0 ? "+" : ""}
            {(datum.averageRP ?? 0).toFixed(1)}
          </p>
          <p className="mt-0.5 text-[10px] text-[var(--color-muted-foreground)]">
            {datum.totalGames.toLocaleString()}게임
          </p>
        </>
      ) : (
        <p className="mt-1 text-[10px] text-[var(--color-muted-foreground)]">캐릭터 표본 없음</p>
      )}
      {hasComparison ? (
        <>
          <p className="mt-1 text-[10px] font-semibold tabular-nums text-[var(--color-warning)]">
            전체 평균 RP {(datum.overallAverageRP ?? 0) >= 0 ? "+" : ""}
            {(datum.overallAverageRP ?? 0).toFixed(1)}
          </p>
          {difference != null ? (
            <p className="mt-0.5 text-[10px] tabular-nums text-[var(--color-muted-foreground)]">
              전체 대비 {difference >= 0 ? "+" : ""}
              {difference.toFixed(1)} RP
            </p>
          ) : null}
        </>
      ) : null}
      {datum.patchChanges?.length ? (
        <div className="mt-2 border-t border-[var(--color-border)] pt-2">
          <p className="text-[10px] font-bold text-[var(--color-foreground)]">패치 내역</p>
          <ul className="mt-1.5 space-y-1.5">
            {datum.patchChanges.map((change, index) => (
              <li
                key={`${change.changeType}-${change.target}-${index}`}
                className="rounded border border-[var(--color-border)] bg-[var(--color-surface-2)] p-2"
              >
                <div className="flex items-start gap-1.5">
                  <PatchChangeBadge changeType={change.changeType} />
                  <p className="min-w-0 text-[10px] font-semibold leading-4 text-[var(--color-foreground)]">
                    {change.target}
                  </p>
                </div>
                <p className="mt-1 break-words text-[9px] leading-4 text-[var(--color-muted-foreground)]">
                  {change.valueSummary || change.description}
                </p>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <p className="mt-2 border-t border-[var(--color-border)] pt-2 text-[9px] text-[var(--color-muted-foreground)]">
          해당 캐릭터의 패치 변경 내역 없음
        </p>
      )}
    </div>
  );
}

function PatchChangeBadge({ changeType }: { changeType: RecapPatchChange["changeType"] }) {
  const config = {
    buff: { label: "상향", className: "text-[var(--color-success)]" },
    nerf: { label: "하향", className: "text-[var(--color-danger)]" },
    rework: { label: "조정", className: "text-[var(--color-foreground)]" },
  }[changeType];

  return (
    <span
      className={cn(
        "shrink-0 rounded border border-[var(--color-border)] bg-[var(--color-surface)] px-1.5 py-0.5 text-[9px] font-bold",
        config.className
      )}
    >
      {config.label}
    </span>
  );
}
