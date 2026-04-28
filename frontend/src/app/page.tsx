import { Activity, Crosshair, Sparkles } from "lucide-react";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import type { ReactNode } from "react";
import { FilterProvider } from "@/components/features/FilterContext";
import { GlobalFilter } from "@/components/features/GlobalFilter";
import { HoneyPicksSection } from "@/components/features/HoneyPicksSection";
import { TierRankingTable } from "@/components/features/TierRankingTable";
import { getCharacterName } from "@/lib/characterMap";
import { getPatches } from "@/lib/getPatches";
import { fetchHoneyPicksServer } from "@/lib/honeyPicks";
import { fetchRankingData } from "@/lib/ranking";

export const revalidate = 300;

export const metadata: Metadata = {
  title: { absolute: "메타분석 | 이리와지지" },
  description:
    "이터널리턴 최신 패치 기준 캐릭터 티어, 픽률, 승률, 평균 RP 통계. 다이아~상위 1000위 데이터 기반 실시간 메타 분석.",
  keywords: [
    "이리와지지",
    "이리와GG",
    "ERGG",
    "이터널리턴 티어표",
    "이터널리턴 메타",
    "이터널리턴 캐릭터 순위",
    "이터널리턴 승률",
    "이터널리턴 픽률",
  ],
  openGraph: {
    title: "메타 분석 | 이리와지지 ER&GG",
    description: "이터널리턴 최신 패치 기준 캐릭터 티어, 픽률, 승률, 평균 RP 통계.",
    url: "/",
  },
  twitter: {
    title: "메타 분석 | 이리와지지 ER&GG",
    description: "이터널리턴 최신 패치 기준 캐릭터 티어, 픽률, 승률, 평균 RP 통계.",
  },
  alternates: { canonical: "/" },
};

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

function InsightBlock({
  icon,
  title,
  body,
  accentClass,
}: {
  icon: ReactNode;
  title: string;
  body: string;
  accentClass: string;
}) {
  return (
    <div className="rounded-[20px] border border-[var(--color-border)] bg-[rgba(19,28,50,0.76)] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
      <div className="flex items-start gap-4">
        <div
          className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-white/8 ${accentClass}`}
        >
          {icon}
        </div>
        <div className="min-w-0">
          <p className="text-xl font-bold tracking-[-0.035em] text-[var(--color-foreground)]">
            {title}
          </p>
          <p className="mt-1 text-sm leading-6 text-[var(--color-muted-foreground)]">{body}</p>
        </div>
      </div>
    </div>
  );
}

export default async function Home() {
  const t = await getTranslations("home");
  const patches = await getPatches();
  const defaultPatch = patches[0] ?? "";
  const defaultTier = "MITHRIL";

  const [honeyData, rankingData] = defaultPatch
    ? await Promise.all([
        fetchHoneyPicksServer(defaultPatch, defaultTier),
        fetchRankingData(defaultPatch, defaultTier),
      ])
    : [
        { picks: [], patchVersion: "", previousPatch: null, tier: defaultTier },
        {
          rankings: [],
          previousRankings: [],
          patchVersion: "",
          previousPatch: null,
          tier: defaultTier,
        },
      ];

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
  const topMetaCount = Math.min(5, rankingData.rankings.length || 5);
  const risingName =
    honeyData.picks[0]?.characterNum != null
      ? getCharacterName(honeyData.picks[0].characterNum)
      : topBracket[0]?.characterNum != null
        ? getCharacterName(topBracket[0].characterNum)
        : "메타";
  const volumeBars = buildBarHeights(rankingData.rankings.map((row) => row.totalGames));
  const positiveRatio =
    rankingData.rankings.length > 0 ? positiveRpCount / rankingData.rankings.length : 0.42;

  return (
    <FilterProvider initialPatches={patches}>
      <div className="page-shell flex flex-col gap-5 lg:gap-6">
        <section className="dashboard-hero px-4 py-4 lg:px-5 lg:py-5">
          <div className="grid gap-3 lg:grid-cols-[minmax(0,1.08fr)_minmax(320px,0.92fr)] xl:grid-cols-[minmax(0,1fr)_minmax(260px,0.82fr)_150px_150px] 2xl:grid-cols-[minmax(320px,1.12fr)_360px_180px_180px]">
            <div className="flex flex-col justify-center px-2 py-2 lg:px-4">
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="text-[2.2rem] font-black tracking-[-0.055em] text-[var(--color-foreground)] lg:text-[3.35rem] lg:whitespace-nowrap">
                  {t("title")}
                </h1>
                <span className="inline-flex items-center gap-2 rounded-full border border-[rgba(74,222,128,0.18)] bg-[rgba(74,222,128,0.08)] px-3 py-1 text-sm font-semibold text-[var(--color-success)]">
                  <span className="h-2 w-2 rounded-full bg-[var(--color-success)] shadow-[0_0_10px_rgba(74,222,128,0.8)]" />
                  {t("live")}
                </span>
                <span className="rounded-xl border border-[var(--color-border)] bg-[rgba(255,255,255,0.04)] px-3 py-1 text-sm font-medium text-[var(--color-muted-foreground)]">
                  {t("patch", { patch: defaultPatch || "10.7" })}
                </span>
              </div>
              <p className="mt-3 max-w-[34rem] text-base leading-7 text-[var(--color-foreground)]/88 lg:text-[1.1rem]">
                {t("heroDescription")}
              </p>
              <p className="mt-1.5 text-sm text-[var(--color-muted-foreground)]">
                {t("subtitle", { count: trackedMatches })}
              </p>
            </div>

            <div className="metric-card flex min-h-[150px] flex-col justify-between px-5 py-5 lg:px-6">
              <div>
                <p className="metric-value text-[2.1rem] lg:text-[2.45rem]">{trackedMatches}</p>
                <p className="mt-1 text-sm text-[var(--color-muted-foreground)]">
                  {t("matchMetric")}
                </p>
              </div>
              <div className="mt-4 flex h-[70px] items-end gap-1">
                {volumeBars.map((height, index) => (
                  <span
                    key={`${height}-${index}`}
                    className="w-2 flex-1 rounded-full bg-[linear-gradient(180deg,rgba(37,99,235,0.24),rgba(59,130,246,0.9))]"
                    style={{ height }}
                  />
                ))}
              </div>
            </div>

            <div className="metric-card flex min-h-[150px] flex-col gap-6 px-5 py-5">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-[rgba(168,85,247,0.22)] bg-[rgba(139,92,246,0.12)] text-[#8b5cf6]">
                <Activity className="h-5 w-5" strokeWidth={2} />
              </div>
              <div>
                <p className="metric-value text-[2rem]">{averageWinRate.toFixed(1)}%</p>
                <p className="mt-1 text-sm text-[var(--color-muted-foreground)]">
                  {t("winRateMetric")}
                </p>
              </div>
            </div>

            <div className="metric-card flex min-h-[150px] flex-col justify-between px-5 py-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="metric-value text-[2rem]">{formatSigned(averageRp, 2)}</p>
                  <p className="mt-1 text-sm text-[var(--color-muted-foreground)]">
                    {t("rpMetric")}
                  </p>
                </div>
                <div
                  className="relative h-16 w-16 rounded-full"
                  style={{
                    background: `conic-gradient(var(--color-primary) ${positiveRatio * 360}deg, rgba(255,255,255,0.08) 0deg)`,
                  }}
                >
                  <div className="absolute inset-[8px] rounded-full bg-[rgba(8,13,26,0.96)]" />
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="dashboard-panel p-4 lg:p-5">
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
              <div className="flex flex-wrap items-end gap-x-4 gap-y-2">
                <h2 className="text-[1.9rem] font-black tracking-[-0.05em] text-[var(--color-foreground)]">
                  {t("topFiveTitle")}
                </h2>
                <p className="pb-1 text-sm text-[var(--color-muted-foreground)]">
                  {t("topFiveCaption")}
                </p>
              </div>
              <GlobalFilter />
            </div>

            <HoneyPicksSection
              initialData={honeyData.picks}
              initialPatchVersion={honeyData.patchVersion}
            />
          </div>
        </section>

        <section className="grid gap-5 xl:grid-cols-[minmax(0,1.6fr)_360px]">
          <div className="dashboard-panel p-4 lg:p-5">
            <div className="mb-4 flex flex-wrap items-end gap-x-4 gap-y-2">
              <h2 className="text-[1.85rem] font-black tracking-[-0.05em] text-[var(--color-foreground)]">
                {t("rankingTitle")}
              </h2>
              <p className="pb-1 text-sm text-[var(--color-muted-foreground)]">
                {t("rankingDescription")}
              </p>
            </div>
            <TierRankingTable initialData={rankingData} />
          </div>

          <div className="flex flex-col gap-5">
            <div className="dashboard-panel p-4 lg:p-5">
              <h2 className="text-[1.85rem] font-black tracking-[-0.05em] text-[var(--color-foreground)]">
                {t("insightTitle")}
              </h2>
              <div className="mt-4 flex flex-col gap-3">
                <InsightBlock
                  icon={<Sparkles className="h-5 w-5" strokeWidth={1.9} />}
                  accentClass="bg-[rgba(168,85,247,0.16)] text-[#c084fc]"
                  title={t("insightCards.rising.title")}
                  body={t("insightCards.rising.body", { name: risingName })}
                />
                <InsightBlock
                  icon={<Activity className="h-5 w-5" strokeWidth={1.9} />}
                  accentClass="bg-[rgba(59,130,246,0.16)] text-[#60a5fa]"
                  title={t("insightCards.rp.title")}
                  body={t("insightCards.rp.body", { count: positiveRpCount })}
                />
                <InsightBlock
                  icon={<Crosshair className="h-5 w-5" strokeWidth={1.9} />}
                  accentClass="bg-[rgba(34,197,94,0.16)] text-[#4ade80]"
                  title={t("insightCards.meta.title")}
                  body={t("insightCards.meta.body", { count: topMetaCount })}
                />
              </div>
            </div>
          </div>
        </section>
      </div>
    </FilterProvider>
  );
}
