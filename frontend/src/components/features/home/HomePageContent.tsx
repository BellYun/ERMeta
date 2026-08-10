import { BookOpenText, Gauge, Hourglass, Info, Network, SlidersHorizontal } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { CharacterSearchCombobox } from "@/components/features/character-analysis/CharacterSearchCombobox";
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
      <section className="home-search-hero" aria-labelledby="home-search-title">
        <div className="home-search-hero__inner">
          <div className="home-search-hero__main">
            <div className="home-search-hero__eyebrow">
              <span>ER&amp;GG</span>
              {defaultPatch && !isSeasonPreparing ? (
                <span>{t("patch", { patch: defaultPatch })}</span>
              ) : null}
            </div>
            <h1 id="home-search-title" className="home-search-hero__title">
              {t("title")}
            </h1>
            <p className="home-search-hero__subtitle">
              {isSeasonPreparing
                ? t("preparing.subtitle")
                : hasRankingData
                  ? t("subtitle", { count: trackedMatches })
                  : t("fallback.subtitle", { patch: fallbackPatch })}
            </p>
            <div className="home-search-hero__search-wrap">
              <CharacterSearchCombobox className="home-search-hero__search" scroll={false} />
              <span className="home-search-hero__shortcut" aria-hidden="true">
                ⌘ K
              </span>
            </div>

            <nav className="home-search-hero__quick-links" aria-label={t("title")}>
              <a href={`/${locale}/synergy-detail`}>
                <Network className="h-4 w-4" aria-hidden="true" />
                {t("guide.comboTitle")}
              </a>
              <a href={patchAnalysisHref}>
                <Gauge className="h-4 w-4" aria-hidden="true" />
                {t("patchAnalysisCta")}
              </a>
              <a href={`/${locale}/methodology`}>
                <BookOpenText className="h-4 w-4" aria-hidden="true" />
                {t("guide.cta")}
              </a>
            </nav>
          </div>

          <aside className="home-search-hero__status" aria-label={t("matchMetric")}>
            <div className="home-search-hero__status-head">
              <span className="home-search-hero__pulse" aria-hidden="true" />
              <span>
                {isSeasonPreparing ? t("preparing.kicker") : t("patch", { patch: fallbackPatch })}
              </span>
            </div>
            <p className="home-search-hero__status-label">
              {hasRankingData && !isSeasonPreparing
                ? t("matchMetric")
                : isSeasonPreparing
                  ? t("preparing.title")
                  : t("fallback.title")}
            </p>
            <p className="home-search-hero__status-value">
              {hasRankingData && !isSeasonPreparing ? trackedMatches : fallbackPatch}
            </p>
            <p className="home-search-hero__status-body">
              {isSeasonPreparing
                ? t("preparing.body")
                : hasRankingData
                  ? t("matchMetricDescription", { patch: defaultPatch })
                  : t("fallback.body")}
            </p>
            {isSeasonPreparing ? (
              <Hourglass className="home-search-hero__status-icon" aria-hidden="true" />
            ) : null}
          </aside>
        </div>

        <div className="home-search-hero__foot">
          <p>
            <Info className="h-3.5 w-3.5" aria-hidden="true" />
            <span>{t("preseasonPolicyNotice")}</span>
          </p>
          {showHomeStats ? (
            <a href="#home-mobile-filter" aria-label={t("filterCta")}>
              <SlidersHorizontal className="h-4 w-4" aria-hidden="true" />
              {t("filterCta")}
            </a>
          ) : null}
        </div>
      </section>

      {showHomeStats ? (
        <HomeDashboardSections
          patches={patches}
          homeMetaStats={homeMetaStats}
          defaultPatch={defaultPatch}
        />
      ) : (
        <section className="home-empty-index" aria-labelledby="home-empty-title">
          <div className="home-empty-index__copy">
            <p>
              {isSeasonPreparing
                ? t("preparing.kicker")
                : t("fallback.kicker", { patch: fallbackPatch })}
            </p>
            <h2 id="home-empty-title">
              {isSeasonPreparing ? t("preparing.title") : t("fallback.title")}
            </h2>
            <span>{isSeasonPreparing ? t("preparing.body") : t("fallback.body")}</span>
          </div>
          <nav className="home-empty-index__links" aria-label={t("title")}>
            {[
              { href: `/${locale}/character/1`, label: t("fallback.characterCta") },
              { href: `/${locale}/synergy-detail`, label: t("guide.comboTitle") },
              { href: patchAnalysisHref, label: t("fallback.analysisCta") },
              { href: `/${locale}/patches`, label: t("fallback.patchCta") },
              { href: `/${locale}/methodology`, label: t("fallback.methodologyCta") },
            ].map((link, index) => (
              <a key={link.href} href={link.href}>
                <span>{String(index + 1).padStart(2, "0")}</span>
                <strong>{link.label}</strong>
              </a>
            ))}
          </nav>
        </section>
      )}
    </div>
  );
}
