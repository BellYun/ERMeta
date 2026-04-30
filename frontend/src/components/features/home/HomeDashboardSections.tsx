"use client";

import { useTranslations } from "next-intl";
import type { HoneyPickData } from "@/app/api/meta/honey-picks/route";
import { FilterProvider, useFilter } from "@/components/features/FilterContext";
import { GlobalFilter } from "@/components/features/GlobalFilter";
import { HomeFilterAside } from "@/components/features/HomeFilterAside";
import { HoneyPicksSection } from "@/components/features/HoneyPicksSection";
import { TierRankingTable } from "@/components/features/TierRankingTable";
import type { RankingResponse } from "@/lib/ranking";

interface HomeDashboardSectionsProps {
  patches: string[];
  honeyPicks: HoneyPickData[];
  honeyPatchVersion: string;
  rankingData: RankingResponse;
  defaultPatch: string;
}

function HomeDashboardSectionsBody({
  honeyPicks,
  honeyPatchVersion,
  rankingData,
  defaultPatch,
}: Omit<HomeDashboardSectionsProps, "patches">) {
  const t = useTranslations("home");
  const { patch } = useFilter();
  const selectedPatch = patch || defaultPatch;
  const isPreseasonPatch = selectedPatch === "11.0";

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
    </>
  );
}

export function HomeDashboardSections(props: HomeDashboardSectionsProps) {
  return (
    <FilterProvider initialPatches={props.patches}>
      <HomeDashboardSectionsBody
        honeyPicks={props.honeyPicks}
        honeyPatchVersion={props.honeyPatchVersion}
        rankingData={props.rankingData}
        defaultPatch={props.defaultPatch}
      />
    </FilterProvider>
  );
}
