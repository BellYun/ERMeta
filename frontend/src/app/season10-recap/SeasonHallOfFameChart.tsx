"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { cn } from "@/lib/utils";

export interface ChartDatum {
  patch: string;
  averageRP: number | null;
  totalGames: number;
  hasData: boolean;
}

interface SeasonHallOfFameChartProps {
  data: ChartDatum[];
}

export default function SeasonHallOfFameChart({ data }: SeasonHallOfFameChartProps) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} margin={{ top: 8, right: 8, left: -20, bottom: 4 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
        <XAxis
          dataKey="patch"
          tick={{ fill: "var(--color-muted-foreground)", fontSize: 10 }}
          tickLine={false}
          axisLine={false}
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
                    ? "var(--color-accent-gold)"
                    : "var(--color-danger)"
              }
              fillOpacity={datum.hasData ? 0.86 : 0.3}
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
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

  return (
    <div className="rounded-xl border border-[var(--color-border)] bg-[rgba(15,23,42,0.96)] px-3 py-2 shadow-lg">
      <p className="text-[11px] font-semibold text-[var(--color-foreground)]">{datum.patch} 패치</p>
      {datum.hasData ? (
        <>
          <p
            className={cn(
              "mt-1 text-xs font-bold tabular-nums",
              (datum.averageRP ?? 0) >= 0
                ? "text-[var(--color-accent-gold)]"
                : "text-[var(--color-danger)]"
            )}
          >
            평균 RP {(datum.averageRP ?? 0) >= 0 ? "+" : ""}
            {(datum.averageRP ?? 0).toFixed(1)}
          </p>
          <p className="mt-0.5 text-[10px] text-[var(--color-muted-foreground)]">
            {datum.totalGames.toLocaleString()}게임
          </p>
        </>
      ) : (
        <p className="mt-1 text-[10px] text-[var(--color-muted-foreground)]">데이터 없음</p>
      )}
    </div>
  );
}
