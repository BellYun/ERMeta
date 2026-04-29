"use client";

import { Activity, SlidersHorizontal } from "lucide-react";
import { useTranslations } from "next-intl";
import type { HoneyPickData } from "@/app/api/meta/honey-picks/route";
import { FilterProvider } from "@/components/features/FilterContext";
import { GlobalFilter } from "@/components/features/GlobalFilter";
import { HomeFilterAside } from "@/components/features/HomeFilterAside";
import { HoneyPicksSection } from "@/components/features/HoneyPicksSection";
import { TierRankingTable } from "@/components/features/TierRankingTable";
import type { RankingResponse } from "@/lib/ranking";

interface HomePageContentProps {
  patches: string[];
  honeyPicks: HoneyPickData[];
  honeyPatchVersion: string;
  rankingData: RankingResponse;
}

function formatMetricNumber(value: number) {
  if (!Number.isFinite(value) || value <= 0) return "0";
  return new Intl.NumberFormat("en-US").format(Math.round(value));
}

function formatSigned(value: number, digits = 1) {
  if (!Number.isFinite(value)) return "0";
  return `${value >= 0 ? "+" : ""}${value.toFixed(digits)}`;
}

function buildBarHeights(values: number[]) {
  if (values.length === 0) {
    return [28, 34, 40, 32, 46, 54, 50, 62, 58, 68, 56, 60];
  }

  const max = Math.max(...values, 1);
  return values.slice(0, 20).map((value) => Math.max(16, Math.round((value / max) * 78)));
}

function HomeDashboard({
  patches,
  honeyPicks,
  honeyPatchVersion,
  rankingData,
}: HomePageContentProps) {
  const t = useTranslations("home");
  const defaultPatch = patches[0] ?? "";
  const totalMatches = rankingData.rankings.reduce((sum, row) => sum + row.totalGames, 0);
  const trackedMatches = formatMetricNumber(totalMatches);
  const topBracket = rankingData.rankings.slice(0, 10);
  const averageWinRate =
    topBracket.length > 0
      ? topBracket.reduce((sum, row) => sum + row.winRate, 0) / topBracket.length
      : 0;
  const averageRp =
    topBracket.length > 0
      ? topBracket.reduce((sum, row) => sum + row.averageRP, 0) / topBracket.length
      : 0;
  const positiveRpCount = rankingData.rankings.filter((row) => row.averageRP > 0).length;
  const volumeBars = buildBarHeights(rankingData.rankings.map((row) => row.totalGames));
  const positiveRatio =
    rankingData.rankings.length > 0 ? positiveRpCount / rankingData.rankings.length : 0.42;

  return (
    <div className="page-shell flex flex-col gap-5 lg:gap-6">
      <section className="dashboard-hero px-3 py-3 sm:px-4 sm:py-4 lg:px-5 lg:py-5">
        <div className="grid grid-cols-2 gap-2.5 sm:gap-3 lg:grid-cols-[minmax(0,1.08fr)_minmax(320px,0.92fr)] xl:grid-cols-[minmax(0,1fr)_minmax(260px,0.82fr)_150px_150px] 2xl:grid-cols-[minmax(320px,1.12fr)_360px_180px_180px]">
          <div className="col-span-2 flex flex-col justify-center px-1 py-1.5 sm:px-2 sm:py-2 lg:px-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="text-[1.9rem] font-black tracking-[-0.055em] text-[var(--color-foreground)] sm:text-[2.2rem] lg:text-[3.35rem] lg:whitespace-nowrap">
                  {t("title")}
                </h1>
                <span className="inline-flex items-center gap-2 rounded-full border border-[rgba(74,222,128,0.18)] bg-[rgba(74,222,128,0.08)] px-2.5 py-1 text-[11px] font-semibold text-[var(--color-success)] sm:px-3 sm:text-sm">
                  <span className="h-2 w-2 rounded-full bg-[var(--color-success)] shadow-[0_0_10px_rgba(74,222,128,0.8)]" />
                  {t("live")}
                </span>
                {defaultPatch ? (
                  <span className="rounded-xl border border-[var(--color-border)] bg-[rgba(255,255,255,0.04)] px-2.5 py-1 text-[11px] font-medium text-[var(--color-muted-foreground)] sm:px-3 sm:text-sm">
                    {t("patch", { patch: defaultPatch })}
                  </span>
                ) : null}
              </div>

              <a
                href="#home-mobile-filter"
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[16px] border border-[var(--color-border)] bg-[rgba(255,255,255,0.03)] text-[var(--color-foreground)] sm:hidden"
                aria-label={t("filterCta")}
              >
                <SlidersHorizontal className="h-4.5 w-4.5" strokeWidth={2} />
              </a>
            </div>
            <p className="mt-2.5 max-w-[34rem] text-[0.95rem] leading-6 text-[var(--color-foreground)]/88 sm:mt-3 sm:text-base sm:leading-7 lg:text-[1.1rem]">
              {t("heroDescription")}
            </p>
            <p className="mt-1.5 text-xs text-[var(--color-muted-foreground)] sm:text-sm">
              {t("subtitle", { count: trackedMatches })}
            </p>
          </div>

          <div className="metric-card col-span-2 flex min-h-[126px] flex-col justify-between px-4 py-4 sm:min-h-[150px] sm:px-5 sm:py-5 lg:px-6">
            <div>
              <p className="metric-value text-[1.85rem] sm:text-[2.1rem] lg:text-[2.45rem]">
                {trackedMatches}
              </p>
              <p className="mt-1 text-xs text-[var(--color-muted-foreground)] sm:text-sm">
                {t("matchMetric")}
              </p>
            </div>
            <div className="mt-3 flex h-[52px] items-end gap-1 sm:mt-4 sm:h-[70px]">
              {volumeBars.map((height, index) => (
                <span
                  key={`${height}-${index}`}
                  className="w-2 flex-1 rounded-full bg-[linear-gradient(180deg,rgba(37,99,235,0.24),rgba(59,130,246,0.9))]"
                  style={{ height: Math.max(12, Math.round(height * 0.8)) }}
                />
              ))}
            </div>
          </div>

          <div className="metric-card flex min-h-[116px] flex-col gap-4 px-4 py-4 sm:min-h-[150px] sm:gap-6 sm:px-5 sm:py-5">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-[rgba(168,85,247,0.22)] bg-[rgba(139,92,246,0.12)] text-[#8b5cf6] sm:h-12 sm:w-12">
              <Activity className="h-4 w-4 sm:h-5 sm:w-5" strokeWidth={2} />
            </div>
            <div>
              <p className="metric-value text-[1.55rem] sm:text-[2rem]">
                {averageWinRate.toFixed(1)}%
              </p>
              <p className="mt-1 text-xs text-[var(--color-muted-foreground)] sm:text-sm">
                {t("winRateMetric")}
              </p>
            </div>
          </div>

          <div className="metric-card flex min-h-[116px] flex-col justify-between px-4 py-4 sm:min-h-[150px] sm:px-5 sm:py-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="metric-value text-[1.55rem] sm:text-[2rem]">
                  {formatSigned(averageRp, 2)}
                </p>
                <p className="mt-1 text-xs text-[var(--color-muted-foreground)] sm:text-sm">
                  {t("rpMetric")}
                </p>
              </div>
              <div
                className="relative h-12 w-12 rounded-full sm:h-16 sm:w-16"
                style={{
                  background: `conic-gradient(var(--color-primary) ${positiveRatio * 360}deg, rgba(255,255,255,0.08) 0deg)`,
                }}
              >
                <div className="absolute inset-[6px] rounded-full bg-[rgba(8,13,26,0.96)] sm:inset-[8px]" />
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="home-mobile-filter" className="dashboard-panel p-3 sm:hidden">
        <GlobalFilter />
      </section>

      <section className="dashboard-panel p-4 lg:p-5">
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div className="flex flex-wrap items-end gap-x-4 gap-y-2">
              <h2 className="text-[1.5rem] font-black tracking-[-0.05em] text-[var(--color-foreground)] sm:text-[1.9rem]">
                {t("topFiveTitle")}
              </h2>
              <p className="pb-1 text-xs text-[var(--color-muted-foreground)] sm:text-sm">
                {t("topFiveCaption")}
              </p>
            </div>
            <div id="home-top-filter" className="hidden sm:block">
              <GlobalFilter />
            </div>
          </div>

          <HoneyPicksSection initialData={honeyPicks} initialPatchVersion={honeyPatchVersion} />
        </div>
      </section>

      <HomeFilterAside anchorId="home-top-filter" />

      <section className="dashboard-panel p-4 lg:p-5">
        <div className="mb-4 flex flex-wrap items-end gap-x-4 gap-y-2">
          <h2 className="text-[1.45rem] font-black tracking-[-0.05em] text-[var(--color-foreground)] sm:text-[1.85rem]">
            {t("rankingTitle")}
          </h2>
          <p className="pb-1 text-xs text-[var(--color-muted-foreground)] sm:text-sm">
            {t("rankingDescription")}
          </p>
        </div>
        <TierRankingTable initialData={rankingData} />
      </section>
    </div>
  );
}

export function HomePageContent(props: HomePageContentProps) {
  return (
    <FilterProvider initialPatches={props.patches}>
      <HomeDashboard {...props} />
    </FilterProvider>
  );
}
