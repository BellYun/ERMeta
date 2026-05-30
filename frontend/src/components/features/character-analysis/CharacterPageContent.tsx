import { BarChart3 } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Suspense } from "react";
import type { CharacterStatsResponse } from "@/app/api/character/stats/[characterCode]/route";
import { CharacterAnalysisClient } from "@/components/features/CharacterAnalysisClient";
import { SectionErrorBoundary } from "@/components/features/SectionErrorBoundary";
import { LANGUAGE_BY_ROUTE_LOCALE, type RouteLocale } from "@/i18n/routing";
import { buildFallbackMap, resolveCharacterName } from "@/lib/characterMap";
import { loadL10nMap } from "@/lib/serverL10n";
import { resolveWeaponName } from "@/lib/weaponMap";

interface CharacterPageContentProps {
  locale: RouteLocale;
  code: number;
  patches: string[];
  initialStats: CharacterStatsResponse | null;
  initialPrevStats: CharacterStatsResponse | null;
}

function CharacterAnalysisFallback() {
  return (
    <div className="flex flex-col gap-5 sm:gap-6">
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.35fr)_340px]">
        <section className="dashboard-panel p-3.5 sm:p-4 lg:p-5">
          <div className="animate-pulse">
            <div className="h-40 rounded-[20px] bg-[rgba(255,255,255,0.04)] sm:h-48" />
          </div>
        </section>
        <section className="dashboard-panel p-3.5 sm:p-4 lg:p-5">
          <div className="animate-pulse">
            <div className="h-48 rounded-[20px] bg-[rgba(255,255,255,0.04)]" />
          </div>
        </section>
      </div>

      <div className="grid gap-5 xl:grid-cols-2">
        <section className="dashboard-panel p-3.5 sm:p-4 lg:p-5">
          <div className="animate-pulse">
            <div className="mb-4 h-6 w-28 rounded bg-[rgba(255,255,255,0.06)]" />
            <div className="h-64 rounded-[20px] bg-[rgba(255,255,255,0.04)]" />
          </div>
        </section>
        <section className="dashboard-panel p-3.5 sm:p-4 lg:p-5">
          <div className="animate-pulse">
            <div className="mb-4 h-6 w-24 rounded bg-[rgba(255,255,255,0.06)]" />
            <div className="h-64 rounded-[20px] bg-[rgba(255,255,255,0.04)]" />
          </div>
        </section>
        <section className="dashboard-panel p-3.5 sm:p-4 lg:p-5 xl:col-span-2">
          <div className="animate-pulse">
            <div className="mb-4 h-6 w-16 rounded bg-[rgba(255,255,255,0.06)]" />
            <div className="h-80 rounded-[20px] bg-[rgba(255,255,255,0.04)]" />
          </div>
        </section>
      </div>
    </div>
  );
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("en-US").format(Math.round(value));
}

function buildServerSummary(
  locale: RouteLocale,
  code: number,
  stats: CharacterStatsResponse | null
) {
  if (!stats || stats.totalGames <= 0) return null;

  const language = LANGUAGE_BY_ROUTE_LOCALE[locale];
  const l10n = loadL10nMap(language);
  const name = resolveCharacterName(code, l10n, buildFallbackMap());
  const topWeapon = stats.weapons[0] ?? null;
  const topWeaponName = topWeapon ? resolveWeaponName(topWeapon.bestWeapon, l10n) : null;
  const sample = formatNumber(stats.totalGames);
  const winRate = stats.winRate.toFixed(1);
  const pickRate = stats.pickRate.toFixed(1);
  const averageRp = stats.averageRP.toFixed(1);
  const top3Rate = stats.top3Rate.toFixed(1);

  if (locale === "ja") {
    return `${name}はパッチ${stats.patchVersion}の${stats.tier}基準で${sample}試合の標本があります。勝率は${winRate}%、ピック率は${pickRate}%、平均RPは${averageRp}、Top 3率は${top3Rate}%です。${
      topWeaponName
        ? `最も多く使われた武器は${topWeaponName}で、武器別成績と前パッチ比較を下の分析表で確認できます。`
        : "武器別成績と前パッチ比較を下の分析表で確認できます。"
    }`;
  }

  if (locale !== "ko") {
    return `${name} has a ${sample}-match sample on patch ${stats.patchVersion} in ${stats.tier}. The current win rate is ${winRate}%, pick rate is ${pickRate}%, average RP is ${averageRp}, and Top 3 rate is ${top3Rate}%. ${
      topWeaponName
        ? `The most played weapon is ${topWeaponName}, with weapon performance and patch comparison available in the analysis below.`
        : "Weapon performance and patch comparison are available in the analysis below."
    }`;
  }

  return `${name}는 패치 ${stats.patchVersion} ${stats.tier} 기준 ${sample}판 표본에서 승률 ${winRate}%, 픽률 ${pickRate}%, 평균 RP ${averageRp}, Top 3 비율 ${top3Rate}%를 기록했습니다. ${
    topWeaponName
      ? `가장 많이 선택된 무기는 ${topWeaponName}이며, 아래 분석에서 무기별 성과와 이전 패치 대비 변화를 함께 확인할 수 있습니다.`
      : "아래 분석에서 무기별 성과와 이전 패치 대비 변화를 함께 확인할 수 있습니다."
  }`;
}

export async function CharacterPageContent({
  locale,
  code,
  patches,
  initialStats,
  initialPrevStats,
}: CharacterPageContentProps) {
  const t = await getTranslations({ locale, namespace: "characterPage" });
  const serverSummary = buildServerSummary(locale, code, initialStats);

  return (
    <div className="page-shell flex flex-col gap-5 lg:gap-6">
      <section className="dashboard-hero px-3 py-3 sm:px-4 sm:py-4 lg:px-5 lg:py-5">
        <div className="px-1 py-1.5 sm:px-2 sm:py-2 lg:px-4">
          <div className="flex flex-col justify-center">
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-[rgba(59,130,246,0.18)] bg-[rgba(59,130,246,0.08)] px-3 py-1">
                <BarChart3 className="h-3.5 w-3.5 text-[var(--color-primary)]" />
                <span className="text-[10px] font-semibold uppercase tracking-[0.1em] text-[var(--color-primary)] sm:text-[11px]">
                  {t("badge")}
                </span>
              </span>
              <span className="inline-flex items-center gap-1 rounded-full bg-[var(--color-warning)]/10 border border-[var(--color-warning)]/20 px-2 py-0.5">
                <span className="text-[9px] font-bold text-[var(--color-warning)] uppercase">
                  {t("beta")}
                </span>
              </span>
              <span className="text-xs text-[var(--color-muted-foreground)] sm:text-sm">
                {t("patchBase", { patch: patches[0] ?? "—" })}
              </span>
            </div>

            <h1 className="mt-3 text-[1.9rem] font-black tracking-[-0.055em] text-[var(--color-foreground)] sm:mt-4 sm:text-[2.2rem] lg:text-[3.15rem]">
              {t("title")}
            </h1>
            <p className="mt-2.5 max-w-[42rem] text-[0.95rem] leading-6 text-[var(--color-foreground)]/88 sm:mt-3 sm:text-base sm:leading-7 lg:text-[1.05rem]">
              {t("subtitle")}
            </p>
            <p className="mt-2 text-xs text-[var(--color-warning)]/80 sm:text-sm">
              {t("imageNotice")}
            </p>
            {serverSummary ? (
              <p className="mt-3 max-w-[48rem] text-sm leading-6 text-[var(--color-muted-foreground)] sm:text-[0.95rem] sm:leading-7">
                {serverSummary}
              </p>
            ) : null}
          </div>
        </div>
      </section>

      <div className="min-h-[4800px] sm:min-h-[3200px]">
        <SectionErrorBoundary sectionName={t("sectionName")}>
          <Suspense fallback={<CharacterAnalysisFallback />}>
            <CharacterAnalysisClient
              key={code}
              initialPatches={patches}
              initialStats={initialStats}
              initialPrevStats={initialPrevStats}
              code={code}
            />
          </Suspense>
        </SectionErrorBoundary>
      </div>
    </div>
  );
}
