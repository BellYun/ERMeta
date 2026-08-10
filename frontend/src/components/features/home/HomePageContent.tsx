import { BookOpenText, Gauge, Hourglass, Info, SlidersHorizontal } from "lucide-react";
import { getTranslations } from "next-intl/server";
import type { HomeMetaStats } from "@/lib/homeMetaShared";
import type { RankingResponse } from "@/lib/ranking";
import { HomeDashboardSections } from "./HomeDashboardSections";

interface HomePageContentProps {
  locale: string;
  patches: string[];
  homeMetaStats: HomeMetaStats;
  rankingData: RankingResponse;
}

function formatMetricNumber(value: number) {
  if (!Number.isFinite(value) || value <= 0) return "";
  return new Intl.NumberFormat("en-US").format(Math.round(value));
}

export async function HomePageContent({
  locale,
  patches,
  homeMetaStats,
  rankingData,
}: HomePageContentProps) {
  const t = await getTranslations({ locale, namespace: "home" });
  const defaultPatch = patches[0] ?? "";
  const totalMatches = rankingData.rankings.reduce((sum, row) => sum + row.totalGames, 0);
  const hasRankingData = rankingData.rankings.length > 0 && totalMatches > 0;
  const trackedMatches = hasRankingData ? formatMetricNumber(totalMatches) : "";
  const fallbackPatch = defaultPatch || "11.7";
  const patchAnalysisHref = `/${locale}/patch-analysis/11.5`;
  const isSeasonPreparing = defaultPatch === "11.7";
  const showHomeStats = hasRankingData && !isSeasonPreparing;

  return (
    <div className="page-shell home-shell flex flex-col">
      <section className="home-stat-hero">
        <div className="home-stat-hero__head">
          <div className="home-stat-hero__copy">
            <div className="home-stat-hero__eyebrow">
              <span>ER&amp;GG</span>
              {defaultPatch && !isSeasonPreparing ? (
                <span>{t("patch", { patch: defaultPatch })}</span>
              ) : null}
            </div>
            <h1 className="home-stat-hero__title">{t("title")}</h1>
            <p className="home-stat-hero__subtitle">
              {isSeasonPreparing
                ? t("preparing.subtitle")
                : hasRankingData
                  ? t("subtitle", { count: trackedMatches })
                  : t("fallback.subtitle", { patch: fallbackPatch })}
            </p>
          </div>

          <div className="home-stat-hero__actions">
            <a href={patchAnalysisHref} className="home-stat-hero__action hidden sm:inline-flex">
              <Gauge className="h-4 w-4" strokeWidth={2} />
              {t("patchAnalysisCta")}
            </a>
            <a
              href={`/${locale}/methodology`}
              className="home-stat-hero__action hidden sm:inline-flex"
            >
              <BookOpenText className="h-4 w-4" strokeWidth={2} />
              {t("guide.cta")}
            </a>
            <a
              href="#home-mobile-filter"
              className="home-stat-hero__mobile-filter h-11 w-11 p-0 sm:hidden"
              aria-label={t("filterCta")}
            >
              <SlidersHorizontal className="h-4.5 w-4.5" strokeWidth={2} />
            </a>
          </div>
        </div>

        <div className="home-stat-hero__proof">
          <div className="home-stat-hero__metric">
            <p className="home-stat-hero__metric-label">
              {isSeasonPreparing
                ? t("preparing.kicker")
                : hasRankingData
                  ? t("matchMetric")
                  : t("fallback.kicker", { patch: fallbackPatch })}
            </p>
            <p className="home-stat-hero__figure">
              {hasRankingData && !isSeasonPreparing ? trackedMatches : fallbackPatch}
            </p>
          </div>

          <div className="home-stat-hero__context">
            {isSeasonPreparing ? (
              <>
                <span className="home-stat-hero__context-icon" aria-hidden="true">
                  <Hourglass className="h-4.5 w-4.5" />
                </span>
                <p className="home-stat-hero__context-label">{t("preparing.kicker")}</p>
                <h2 className="home-stat-hero__context-heading">{t("preparing.title")}</h2>
                <p className="home-stat-hero__context-body">{t("preparing.body")}</p>
              </>
            ) : hasRankingData ? (
              <>
                <p className="home-stat-hero__context-label">
                  {t("patch", { patch: defaultPatch })}
                </p>
                <h2 className="home-stat-hero__context-heading">{t("matchMetric")}</h2>
                <p className="home-stat-hero__context-body">
                  {t("matchMetricDescription", { patch: defaultPatch })}
                </p>
              </>
            ) : (
              <>
                <p className="home-stat-hero__context-label">
                  {t("fallback.kicker", { patch: fallbackPatch })}
                </p>
                <h2 className="home-stat-hero__context-heading">{t("fallback.title")}</h2>
                <p className="home-stat-hero__context-body">{t("fallback.body")}</p>
                <div className="home-stat-hero__fallback-links">
                  {[
                    { href: `/${locale}/character/1`, label: t("fallback.characterCta") },
                    { href: patchAnalysisHref, label: t("fallback.analysisCta") },
                    { href: `/${locale}/patches`, label: t("fallback.patchCta") },
                    { href: `/${locale}/methodology`, label: t("fallback.methodologyCta") },
                  ].map((link) => (
                    <a key={link.href} href={link.href} className="home-stat-hero__link">
                      {link.label}
                    </a>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>

        <p className="home-stat-hero__notice">
          <Info className="h-3.5 w-3.5" aria-hidden="true" />
          <span>{t("preseasonPolicyNotice")}</span>
        </p>
      </section>

      {showHomeStats ? (
        <HomeDashboardSections
          patches={patches}
          homeMetaStats={homeMetaStats}
          defaultPatch={defaultPatch}
        />
      ) : null}
    </div>
  );
}
