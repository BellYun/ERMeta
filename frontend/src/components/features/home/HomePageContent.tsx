import {
  ArrowUpRight,
  BookOpenText,
  Gauge,
  Hourglass,
  Info,
  Network,
  SlidersHorizontal,
  Trophy,
} from "lucide-react";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { CharacterSearchCombobox } from "@/components/features/character-analysis/CharacterSearchCombobox";
import type { HomeMetaStats } from "@/lib/homeMetaShared";
import { HOME_META_CURRENT_PATCH, HOME_META_MIN_COLLECTED_GAMES } from "@/lib/homeMetaShared";
import type { RankingResponse } from "@/lib/ranking";
import { HomeDashboardSections } from "./HomeDashboardSections";

interface HomePageContentProps {
  locale: string;
  patches: string[];
  currentPatch: string;
  homeMetaStats: HomeMetaStats;
  rankingData: RankingResponse;
}

function formatMetricNumber(value: number) {
  if (!Number.isFinite(value) || value <= 0) return "";
  return new Intl.NumberFormat("en-US").format(Math.round(value));
}

const ESTIMATED_PARTICIPANTS_PER_MATCH = 21;

export async function HomePageContent({
  locale,
  patches,
  currentPatch,
  homeMetaStats,
  rankingData,
}: HomePageContentProps) {
  const t = await getTranslations({ locale, namespace: "home" });
  const defaultPatch = patches[0] ?? "";
  const rankingGames = rankingData.rankings.reduce((sum, row) => sum + row.totalGames, 0);
  const collectedGames = homeMetaStats.collectedGames ?? 0;
  const hasRankingData = rankingData.rankings.length > 0 && rankingGames > 0;
  const isCollectionReady =
    homeMetaStats.patchVersion === HOME_META_CURRENT_PATCH &&
    collectedGames >= HOME_META_MIN_COLLECTED_GAMES;
  const trackedMatches = isCollectionReady
    ? formatMetricNumber(collectedGames / ESTIMATED_PARTICIPANTS_PER_MATCH)
    : "";
  const fallbackPatch = currentPatch || defaultPatch || "12.1";
  const patchAnalysisHref = `/${locale}/patch-analysis/11.5`;
  const isPreseasonPreparing = currentPatch === "12.0";
  const isCollectionPending = !isPreseasonPreparing && !isCollectionReady;
  const isPreparing = isPreseasonPreparing || isCollectionPending;
  const showHomeStats = hasRankingData && !isPreparing;

  return (
    <div className="page-shell home-shell flex flex-col">
      {isPreparing ? (
        <section aria-labelledby="home-season-recap-title">
          <Link className="home-season-recap" href={`/${locale}/season11-recap`}>
            <span className="home-season-recap__season" aria-hidden="true">
              <Trophy />
              <span>SEASON</span>
              <strong>11</strong>
            </span>
            <span className="home-season-recap__copy">
              <span className="home-season-recap__eyebrow">{t("seasonRecap.eyebrow")}</span>
              <strong id="home-season-recap-title">{t("seasonRecap.title")}</strong>
              <span>{t("seasonRecap.body")}</span>
            </span>
            <span className="home-season-recap__cta">
              {t("seasonRecap.cta")}
              <ArrowUpRight aria-hidden="true" />
            </span>
          </Link>
        </section>
      ) : null}

      <section className="home-search-hero" aria-labelledby="home-search-title">
        <div className="home-search-hero__inner">
          <div className="home-search-hero__main">
            <div className="home-search-hero__eyebrow">
              <span>ER&amp;GG</span>
              {defaultPatch && !isPreseasonPreparing ? (
                <span>{t("patch", { patch: defaultPatch })}</span>
              ) : null}
            </div>
            <h1 id="home-search-title" className="home-search-hero__title">
              {t("title")}
            </h1>
            <p className="home-search-hero__subtitle">
              {isPreseasonPreparing
                ? t("preparing.subtitle")
                : isCollectionPending
                  ? t("collecting.subtitle", { patch: fallbackPatch })
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
                {isPreseasonPreparing
                  ? t("preparing.kicker")
                  : isCollectionPending
                    ? t("collecting.kicker", { patch: fallbackPatch })
                    : t("patch", { patch: fallbackPatch })}
              </span>
            </div>
            <p className="home-search-hero__status-label">
              {showHomeStats
                ? t("matchMetric")
                : isPreseasonPreparing
                  ? t("preparing.title")
                  : isCollectionPending
                    ? t("collecting.title")
                    : t("fallback.title")}
            </p>
            <p className="home-search-hero__status-value">
              {showHomeStats ? trackedMatches : isCollectionPending ? fallbackPatch : fallbackPatch}
            </p>
            <p className="home-search-hero__status-body">
              {isPreseasonPreparing
                ? t("preparing.body")
                : isCollectionPending
                  ? t("collecting.body")
                  : hasRankingData
                    ? t("matchMetricDescription", { patch: defaultPatch })
                    : t("fallback.body")}
            </p>
            {isPreparing ? (
              <Hourglass className="home-search-hero__status-icon" aria-hidden="true" />
            ) : null}
          </aside>
        </div>

        <div className="home-search-hero__foot">
          <p>
            <Info className="h-3.5 w-3.5" aria-hidden="true" />
            <span>
              {currentPatch === HOME_META_CURRENT_PATCH
                ? t("collectionPolicyNotice")
                : t("preseasonPolicyNotice")}
            </span>
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
              {isPreseasonPreparing
                ? t("preparing.kicker")
                : isCollectionPending
                  ? t("collecting.kicker", { patch: fallbackPatch })
                  : t("fallback.kicker", { patch: fallbackPatch })}
            </p>
            <h2 id="home-empty-title">
              {isPreseasonPreparing
                ? t("preparing.title")
                : isCollectionPending
                  ? t("collecting.title")
                  : t("fallback.title")}
            </h2>
            <span>
              {isPreseasonPreparing
                ? t("preparing.body")
                : isCollectionPending
                  ? t("collecting.body")
                  : t("fallback.body")}
            </span>
          </div>
          <nav className="home-empty-index__links" aria-label={t("title")}>
            {[
              { href: `/${locale}/character/1`, label: t("fallback.characterCta") },
              { href: `/${locale}/synergy-detail`, label: t("guide.comboTitle") },
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
