"use client";

import { BarChart2 } from "lucide-react";
import dynamic from "next/dynamic";
import { useTranslations } from "next-intl";
import * as React from "react";
import type { CharacterStatsResponse } from "@/app/api/character/stats/[characterCode]/route";
import { cn } from "@/lib/utils";

// recharts 는 ~250KB. 두 LineChart 는 chartData.length>=2 분기에서만 렌더되므로 dynamic.
const PatchComparisonCharts = dynamic(() => import("./PatchComparisonCharts"), {
  ssr: false,
  loading: () => (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
      <div className="h-[160px] sm:h-[220px] animate-pulse rounded-lg bg-[var(--color-surface-2)]" />
      <div className="h-[160px] sm:h-[220px] animate-pulse rounded-lg bg-[var(--color-surface-2)]" />
    </div>
  ),
});

interface PatchComparisonTabProps {
  chartData: { patch: string; winRate: number; averageRP: number }[];
  stats: CharacterStatsResponse | null;
  loading: boolean;
  selectedCode: number;
}

export function PatchComparisonTab({
  chartData,
  stats,
  loading,
  selectedCode,
}: PatchComparisonTabProps) {
  const t = useTranslations("characterPatch");

  if (loading) {
    return <div className="h-40 rounded-lg bg-[var(--color-surface)] animate-pulse" />;
  }

  if (!stats || stats.totalGames === 0) {
    return (
      <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]/80 p-8 flex flex-col items-center gap-2 text-[var(--color-muted-foreground)]">
        <BarChart2 className="h-8 w-8 opacity-40" />
        <p className="text-sm">{t("noData")}</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]/80 p-3 sm:p-5 space-y-3 sm:space-y-4 overflow-hidden">
      {/* 멀티 패치 트렌드 차트 */}
      {chartData.length < 2 ? (
        <div className="flex flex-col items-center gap-2 py-6 sm:py-8 text-[var(--color-muted-foreground)]">
          <BarChart2 className="h-8 w-8 opacity-40" />
          <p className="text-sm">{t("notEnoughData")}</p>
          <p className="text-xs">{t("minTwoPatches")}</p>
        </div>
      ) : (
        <div className="space-y-3 sm:space-y-4">
          <p className="text-xs font-medium text-[var(--color-muted-foreground)]">
            {t("patchTrend")}
          </p>
          <PatchComparisonCharts
            chartData={chartData}
            selectedCode={selectedCode}
            winRateLabel={t("winRate")}
            averageRpLabel={t("averageRp")}
            expectedLabel={t("expected")}
          />
        </div>
      )}

      {/* 패치별 수치 테이블 */}
      {chartData.length >= 2 && (
        <div className="overflow-x-auto -mx-1 scrollbar-thin">
          <table className="w-full text-xs min-w-[280px]">
            <thead>
              <tr className="border-b border-[var(--color-border)] text-[var(--color-muted-foreground)]">
                <th className="px-2 sm:px-3 py-1.5 sm:py-2 text-left font-medium">{t("patch")}</th>
                <th className="px-2 sm:px-3 py-1.5 sm:py-2 text-right font-medium">
                  {t("winRate")}
                </th>
                <th className="px-2 sm:px-3 py-1.5 sm:py-2 text-right font-medium">
                  {t("averageRp")}
                </th>
              </tr>
            </thead>
            <tbody>
              {[...chartData].reverse().map((d, i) => {
                const isCurrent = i === 0;
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
                        <span className="ml-1 sm:ml-1.5 rounded bg-[var(--color-primary)]/20 px-1 py-0.5 text-[9px] text-[var(--color-primary)]">
                          {t("current")}
                        </span>
                      )}
                    </td>
                    <td
                      className={cn(
                        "px-2 sm:px-3 py-1.5 text-right font-medium",
                        d.winRate > 12.5
                          ? "text-[var(--color-accent-gold)]"
                          : "text-[var(--color-danger)]"
                      )}
                    >
                      {d.winRate.toFixed(2)}%
                    </td>
                    <td className="px-2 sm:px-3 py-1.5 text-right text-[var(--color-foreground)]">
                      {d.averageRP.toFixed(1)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
