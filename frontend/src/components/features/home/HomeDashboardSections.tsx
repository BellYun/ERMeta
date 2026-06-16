"use client";

import { useTranslations } from "next-intl";
import * as React from "react";
import { ADSENSE_SLOTS } from "@/components/ads/adsenseConfig";
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

interface HomeDashboardSectionsProps {
  patches: string[];
  homeMetaStats: HomeMetaStats;
  defaultPatch: string;
}

function HomeDashboardSectionsBody({
  homeMetaStats,
  defaultPatch,
}: Omit<HomeDashboardSectionsProps, "patches">) {
  const t = useTranslations("home");
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
    if (!selectedPatch || statsByPatchRef.current[selectedPatch]) return;

    const controller = new AbortController();
    setStatsError(null);

    fetch(`/api/meta/home-stats?patchVersion=${encodeURIComponent(selectedPatch)}`, {
      signal: controller.signal,
    })
      .then(async (res) => {
        const data = (await res.json()) as HomeMetaStats | { error?: string };
        if (!res.ok) throw new Error("error" in data ? data.error : undefined);
        return data as HomeMetaStats;
      })
      .then((stats) => {
        setStatsByPatch((current) => {
          const next = { ...current, [stats.patchVersion]: stats };
          statsByPatchRef.current = next;
          return next;
        });
      })
      .catch((err) => {
        if (err instanceof DOMException && err.name === "AbortError") return;
        setStatsError(err instanceof Error ? err.message : "데이터를 불러오지 못했습니다.");
      });

    return () => controller.abort();
  }, [selectedPatch]);

  const computedView = React.useMemo(() => {
    const view = buildHomeMetaView(selectedStats ?? createEmptyHomeMetaStats(selectedPatch), tier);
    return {
      honeyPicks: view.honeyPicks,
      rankingData: view.rankingData,
      honeyPatchVersion: view.rankingData.patchVersion,
    };
  }, [selectedPatch, selectedStats, tier]);

  return (
    <>
      <section id="home-mobile-filter" className="dashboard-panel p-3 sm:hidden">
        <GlobalFilter />
      </section>

      <section className="dashboard-panel p-4 lg:p-5">
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div className="flex flex-wrap items-end gap-x-4 gap-y-2">
              <h2 className="text-[1.5rem] font-black tracking-[-0.05em] text-[var(--color-foreground)] sm:text-[1.9rem]">
                {t("honeyPicksTitle")}
              </h2>
              <p className="pb-1 text-xs text-[var(--color-muted-foreground)] sm:text-sm">
                {t("topFiveCaption")}
              </p>
            </div>
            <div id="home-top-filter" className="hidden sm:block">
              <GlobalFilter />
            </div>
          </div>

          {isPreseasonPatch ? (
            <div className="rounded-2xl border border-[rgba(251,191,36,0.24)] bg-[rgba(251,191,36,0.08)] px-3.5 py-3 text-sm font-medium text-[var(--color-accent-gold)] sm:px-4">
              {t("preseasonNotice")}
            </div>
          ) : null}
          {statsError ? <p className="text-sm text-[var(--color-danger)]">{statsError}</p> : null}

          <HoneyPicksSection
            initialData={computedView.honeyPicks}
            initialPatchVersion={computedView.honeyPatchVersion}
          />
        </div>
      </section>

      <HomeFilterAside anchorId="home-top-filter" />

      <AdSlot
        slot={ADSENSE_SLOTS.homeRanking}
        className="dashboard-panel px-3 py-2.5 sm:px-4"
        minHeight={120}
      />

      <section className="dashboard-panel p-4 lg:p-5">
        <div className="mb-4 flex flex-wrap items-end gap-x-4 gap-y-2">
          <h2 className="text-[1.45rem] font-black tracking-[-0.05em] text-[var(--color-foreground)] sm:text-[1.85rem]">
            {t("rankingTitle")}
          </h2>
          <p className="pb-1 text-xs text-[var(--color-muted-foreground)] sm:text-sm">
            {t("rankingDescription")}
          </p>
        </div>
        <TierRankingTable initialData={computedView.rankingData} />
      </section>
    </>
  );
}

export function HomeDashboardSections(props: HomeDashboardSectionsProps) {
  return (
    <FilterProvider initialPatches={props.patches}>
      <HomeDashboardSectionsBody
        homeMetaStats={props.homeMetaStats}
        defaultPatch={props.defaultPatch}
      />
    </FilterProvider>
  );
}
