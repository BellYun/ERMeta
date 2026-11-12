"use client";

import { useFormatter, useTranslations } from "next-intl";
import * as React from "react";
import {
  ADSENSE_SLOT_RESERVATIONS,
  ADSENSE_SLOTS,
  canRenderAdSlot,
} from "@/components/ads/adsenseConfig";
import { AdSlot } from "@/components/ads/AdSlot";
import { FilterProvider, useFilter } from "@/components/features/FilterContext";
import { GlobalFilter } from "@/components/features/GlobalFilter";
import { HomeFilterAside } from "@/components/features/HomeFilterAside";
import { HoneyPicksSection } from "@/components/features/HoneyPicksSection";
import { TierRankingTable } from "@/components/features/TierRankingTable";
import {
  buildHomeMetaView,
  createEmptyHomeMetaStats,
  type HomeMetaStats,
} from "@/lib/homeMetaShared";
import { loadHomeMetaSnapshot } from "@/lib/homeMetaSnapshot";

interface HomeDashboardSectionsProps {
  patches: string[];
  homeMetaStats: HomeMetaStats;
  defaultPatch: string;
  rankingOnly?: boolean;
}

const DeferredHoneyPicksSection = React.memo(HoneyPicksSection);
const DeferredTierRankingTable = React.memo(TierRankingTable);

function HomeDashboardSectionsBody({
  homeMetaStats,
  defaultPatch,
  rankingOnly = false,
}: Omit<HomeDashboardSectionsProps, "patches">) {
  const t = useTranslations("home");
  const format = useFormatter();
  const { patch, tier } = useFilter();
  const selectedPatch = patch || defaultPatch;
  const isPreseasonPatch = selectedPatch === "11.0";
  const [statsByPatch, setStatsByPatch] = React.useState<Record<string, HomeMetaStats>>(() => ({
    [homeMetaStats.patchVersion]: homeMetaStats,
  }));
  const statsByPatchRef = React.useRef(statsByPatch);
  const [statsError, setStatsError] = React.useState<string | null>(null);
  const selectedStats = statsByPatch[selectedPatch];

  React.useEffect(() => {
    setStatsError(null);
    if (!selectedPatch || statsByPatchRef.current[selectedPatch]) return;

    let cancelled = false;

    loadHomeMetaSnapshot(selectedPatch)
      .then((stats) => {
        if (cancelled) return;
        setStatsByPatch((current) => {
          const next = { ...current, [stats.patchVersion]: stats };
          statsByPatchRef.current = next;
          return next;
        });
      })
      .catch((err) => {
        if (cancelled) return;
        setStatsError(err instanceof Error ? err.message : "데이터를 불러오지 못했습니다.");
      });

    return () => {
      cancelled = true;
    };
  }, [selectedPatch]);

  const computedView = React.useMemo(() => {
    const view = buildHomeMetaView(selectedStats ?? createEmptyHomeMetaStats(selectedPatch), tier);
    return {
      honeyPicks: view.honeyPicks,
      rankingData: view.rankingData,
      honeyPatchVersion: view.rankingData.patchVersion,
    };
  }, [selectedPatch, selectedStats, tier]);

  const sampleCount = computedView.rankingData.rankings.reduce(
    (total, row) => total + row.totalGames,
    0
  );
  const isLoading = !selectedStats && !statsError;

  return (
    <div className="home-dashboard">
      {canRenderAdSlot(ADSENSE_SLOTS.homeRanking) ? (
        <AdSlot
          slot={ADSENSE_SLOTS.homeRanking}
          slotName="home_ranking"
          className="home-data-ad px-3 py-2.5 sm:px-4"
          reservation={ADSENSE_SLOT_RESERVATIONS.contentHorizontal}
        />
      ) : null}
      <section
        id="home-mobile-filter"
        className="home-analysis-context"
        aria-label={t("analysis.conditions")}
      >
        <div className="home-analysis-context__controls">
          <h2>{t("analysis.conditions")}</h2>
          <div id="home-top-filter">
            <GlobalFilter />
          </div>
        </div>
        <dl className="home-analysis-context__facts" aria-live="polite" aria-busy={isLoading}>
          <div>
            <dt>{t("analysis.sample")}</dt>
            <dd>{selectedStats && !statsError ? format.number(sampleCount) : "—"}</dd>
          </div>
          <div>
            <dt>{t("analysis.comparison")}</dt>
            <dd>{selectedStats?.previousPatch ?? "—"}</dd>
          </div>
          <div className="home-analysis-context__note">
            <dt>{t("analysis.reading")}</dt>
            <dd>{t("analysis.sampleNote")}</dd>
          </div>
        </dl>
        {isPreseasonPatch ? <p className="home-analysis-notice">{t("preseasonNotice")}</p> : null}
        {isLoading ? (
          <p className="home-analysis-notice" role="status">
            {t("analysis.loading")}
          </p>
        ) : null}
        {statsError ? (
          <p className="home-analysis-notice text-[var(--color-danger)]" role="alert">
            {t("analysis.error")}
          </p>
        ) : null}
      </section>

      <HomeFilterAside anchorId="home-top-filter" />

      <section
        className="home-data-section home-data-section--ranking"
        aria-labelledby="home-ranking-title"
        aria-busy={isLoading}
      >
        <div className="home-section-header home-analysis-heading">
          <div>
            <h2 id="home-ranking-title" className="dashboard-section-title">
              {t("rankingTitle")}
            </h2>
            <p>{t("rankingDescription")}</p>
          </div>
          {!rankingOnly && (
            <a href="#home-risers">
              {t("analysis.viewChanges")} <span aria-hidden="true">↓</span>
            </a>
          )}
        </div>
        {selectedStats && !statsError ? (
          <DeferredTierRankingTable initialData={computedView.rankingData} />
        ) : null}
      </section>

      {!rankingOnly && (
        <section
          id="home-risers"
          className="home-data-section home-data-section--risers"
          aria-labelledby="home-risers-title"
          aria-busy={isLoading}
        >
          <div className="home-section-header home-analysis-heading">
            <div>
              <h2 id="home-risers-title" className="dashboard-section-title">
                {t("honeyPicksTitle")}
              </h2>
              <p>{t("topFiveCaption")}</p>
            </div>
          </div>
          {selectedStats && !statsError ? (
            <DeferredHoneyPicksSection
              initialData={computedView.honeyPicks}
              initialPatchVersion={computedView.honeyPatchVersion}
            />
          ) : null}
        </section>
      )}
    </div>
  );
}

export function HomeDashboardSections(props: HomeDashboardSectionsProps) {
  return (
    <FilterProvider initialPatches={props.patches}>
      <HomeDashboardSectionsBody
        homeMetaStats={props.homeMetaStats}
        defaultPatch={props.defaultPatch}
        rankingOnly={props.rankingOnly}
      />
    </FilterProvider>
  );
}
