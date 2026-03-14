"use client"

import * as React from "react"
import { BarChart2 } from "lucide-react"
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts"
import { cn } from "@/lib/utils"
import { PatchTooltip } from "./PatchNoteComponents"
import type { CharacterStatsResponse } from "@/app/api/character/stats/[characterCode]/route"

interface PatchComparisonTabProps {
  chartData: { patch: string; winRate: number; averageRP: number }[]
  stats: CharacterStatsResponse | null
  loading: boolean
  selectedCode: number
}

export function PatchComparisonTab({ chartData, stats, loading, selectedCode }: PatchComparisonTabProps) {
  if (loading) {
    return <div className="h-40 rounded-lg bg-[var(--color-surface)] animate-pulse" />
  }

  if (!stats || stats.totalGames === 0) {
    return (
      <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]/80 p-8 flex flex-col items-center gap-2 text-[var(--color-muted-foreground)]">
        <BarChart2 className="h-8 w-8 opacity-40" />
        <p className="text-sm">데이터가 없습니다.</p>
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]/80 p-3 sm:p-5 space-y-3 sm:space-y-4 overflow-hidden">
      {/* 멀티 패치 트렌드 차트 */}
      {chartData.length < 2 ? (
        <div className="flex flex-col items-center gap-2 py-6 sm:py-8 text-[var(--color-muted-foreground)]">
          <BarChart2 className="h-8 w-8 opacity-40" />
          <p className="text-sm">비교할 패치 데이터가 부족합니다.</p>
          <p className="text-xs">최소 2개 패치의 데이터가 필요합니다.</p>
        </div>
      ) : (
        <div className="space-y-3 sm:space-y-4">
          <p className="text-xs font-medium text-[var(--color-muted-foreground)]">
            패치별 트렌드
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            {/* 승률 트렌드 */}
            <div className="min-w-0">
              <p className="mb-1.5 sm:mb-2 text-xs text-[var(--color-muted-foreground)]">승률 (%)</p>
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
                        metricLabel="승률"
                        format={(v) => `${v.toFixed(2)}%`}
                      />
                    )}
                  />
                  <ReferenceLine
                    y={12.5}
                    stroke="var(--color-muted-foreground)"
                    strokeDasharray="4 4"
                    strokeOpacity={0.5}
                    label={{ value: "기대값", position: "right", fill: "var(--color-muted-foreground)", fontSize: 9 }}
                  />
                  <Line
                    dataKey="winRate"
                    stroke="var(--color-primary)"
                    strokeWidth={2}
                    dot={{ r: 3, fill: "var(--color-primary)" }}
                    activeDot={{ r: 5 }}
                  />
                </LineChart>
              </ResponsiveContainer>
              </div>
            </div>

            {/* 평균 RP 트렌드 */}
            <div className="min-w-0">
              <p className="mb-1.5 sm:mb-2 text-xs text-[var(--color-muted-foreground)]">평균 RP</p>
              <div className="h-[160px] sm:h-[220px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 4, right: 8, left: -12, bottom: 16 }}>
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
                        metricLabel="평균 RP"
                        format={(v) => v.toFixed(1)}
                      />
                    )}
                  />
                  <Line
                    dataKey="averageRP"
                    stroke="var(--color-accent-gold)"
                    strokeWidth={2}
                    dot={{ r: 3, fill: "var(--color-accent-gold)" }}
                    activeDot={{ r: 5 }}
                  />
                </LineChart>
              </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 패치별 수치 테이블 */}
      {chartData.length >= 2 && (
        <div className="overflow-x-auto -mx-1 scrollbar-thin">
          <table className="w-full text-xs min-w-[280px]">
            <thead>
              <tr className="border-b border-[var(--color-border)] text-[var(--color-muted-foreground)]">
                <th className="px-2 sm:px-3 py-1.5 sm:py-2 text-left font-medium">패치</th>
                <th className="px-2 sm:px-3 py-1.5 sm:py-2 text-right font-medium">승률</th>
                <th className="px-2 sm:px-3 py-1.5 sm:py-2 text-right font-medium">평균 RP</th>
              </tr>
            </thead>
            <tbody>
              {[...chartData].reverse().map((d, i) => {
                const isCurrent = i === 0
                return (
                  <tr
                    key={d.patch}
                    className={cn(
                      "border-b border-[var(--color-border)]/50 last:border-0",
                      isCurrent && "bg-[var(--color-primary)]/5"
                    )}
                  >
                    <td className="px-2 sm:px-3 py-1.5 text-left text-[var(--color-foreground)]">
                      {d.patch}
                      {isCurrent && (
                        <span className="ml-1 sm:ml-1.5 rounded bg-[var(--color-primary)]/20 px-1 py-0.5 text-[9px] text-[var(--color-primary)]">현재</span>
                      )}
                    </td>
                    <td className={cn(
                      "px-2 sm:px-3 py-1.5 text-right font-medium",
                      d.winRate > 12.5 ? "text-[var(--color-accent-gold)]" : "text-[var(--color-danger)]"
                    )}>
                      {d.winRate.toFixed(2)}%
                    </td>
                    <td className="px-2 sm:px-3 py-1.5 text-right text-[var(--color-foreground)]">
                      {d.averageRP.toFixed(1)}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
