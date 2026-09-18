"use client";

import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { usesEarnedRP } from "@/lib/rpMetric";
import { PatchTooltip } from "./PatchNoteComponents";

export interface PatchTrendDatum {
  patch: string;
  winRate: number;
  averageRP: number;
}

interface PatchComparisonChartsProps {
  chartData: PatchTrendDatum[];
  selectedCode: number;
  winRateLabel: string;
  averageRpLabel: string;
  expectedLabel: string;
}

export default function PatchComparisonCharts({
  chartData,
  selectedCode,
  winRateLabel,
  averageRpLabel,
  expectedLabel,
}: PatchComparisonChartsProps) {
  // The RP formula changed at 12.4. Break the trend line at that boundary.
  const rpChartData = chartData.map((row) => ({
    ...row,
    oldRP: usesEarnedRP(row.patch) ? null : row.averageRP,
    normalizedRP: usesEarnedRP(row.patch) ? row.averageRP : null,
  }));
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
      {/* 승률 트렌드 */}
      <div className="min-w-0">
        <p className="mb-1.5 sm:mb-2 text-xs text-[var(--color-muted-foreground)]">
          {winRateLabel} (%)
        </p>
        <div className="h-[160px] sm:h-[220px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 4, right: 8, left: -16, bottom: 16 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
              <XAxis
                dataKey="patch"
                tick={{ fill: "var(--color-muted-foreground)", fontSize: 9 }}
                tickLine={false}
                axisLine={false}
                angle={-45}
                textAnchor="end"
                height={40}
              />
              <YAxis
                domain={["auto", "auto"]}
                tick={{ fill: "var(--color-muted-foreground)", fontSize: 9 }}
                tickLine={false}
                axisLine={false}
                unit="%"
                width={36}
              />
              <Tooltip
                content={(props) => (
                  <PatchTooltip
                    {...props}
                    selectedCode={selectedCode}
                    metricLabel={winRateLabel}
                    format={(v) => `${v.toFixed(2)}%`}
                  />
                )}
              />
              <ReferenceLine
                y={12.5}
                stroke="var(--color-muted-foreground)"
                strokeDasharray="4 4"
                strokeOpacity={0.5}
                label={{
                  value: expectedLabel,
                  position: "insideTopRight",
                  fill: "var(--color-muted-foreground)",
                  fontSize: 9,
                }}
              />
              <Line
                dataKey="winRate"
                stroke="var(--color-foreground)"
                strokeWidth={2}
                dot={{ r: 3, fill: "var(--color-foreground)" }}
                activeDot={{ r: 5 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* 평균 RP 트렌드 */}
      <div className="min-w-0">
        <p className="mb-1.5 sm:mb-2 text-xs text-[var(--color-muted-foreground)]">
          {averageRpLabel}
        </p>
        <div className="h-[160px] sm:h-[220px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={rpChartData} margin={{ top: 4, right: 8, left: -12, bottom: 16 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
              <XAxis
                dataKey="patch"
                tick={{ fill: "var(--color-muted-foreground)", fontSize: 9 }}
                tickLine={false}
                axisLine={false}
                angle={-45}
                textAnchor="end"
                height={40}
              />
              <YAxis
                domain={["auto", "auto"]}
                tick={{ fill: "var(--color-muted-foreground)", fontSize: 9 }}
                tickLine={false}
                axisLine={false}
                width={36}
              />
              <Tooltip
                content={(props) => (
                  <PatchTooltip
                    {...props}
                    selectedCode={selectedCode}
                    metricLabel={averageRpLabel}
                    format={(v) => v.toFixed(1)}
                  />
                )}
              />
              <Line
                dataKey="oldRP"
                stroke="var(--color-stat-up)"
                strokeWidth={2}
                dot={{ r: 3, fill: "var(--color-stat-up)" }}
                activeDot={{ r: 5 }}
              />
              <Line
                dataKey="normalizedRP"
                stroke="var(--color-stat-up)"
                strokeWidth={2}
                dot={{ r: 3, fill: "var(--color-stat-up)" }}
                activeDot={{ r: 5 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
