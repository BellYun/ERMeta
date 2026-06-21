"use client";

import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { SectionErrorBoundary } from "@/components/features/SectionErrorBoundary";
import { FocusWeaponPool } from "./FocusWeaponPool";
import { SynergyDetailResults } from "./SynergyDetailResults";
import { WeaponAllySelector } from "./WeaponAllySelector";

export function SynergyDetailInteractive() {
  const t = useTranslations("synergyInteractive");
  const searchParams = useSearchParams();
  const isShareLanding =
    searchParams.get("source") === "share" || searchParams.get("utm_source") === "ergg_share";

  return (
    <div className="flex flex-col gap-5 sm:gap-6">
      {isShareLanding && (
        <div
          role="status"
          className="dashboard-panel px-3 py-2.5 text-sm text-[var(--color-foreground)] sm:px-4 sm:py-3"
        >
          {t("shareLanding")}
        </div>
      )}

      <section className="dashboard-panel p-3.5 sm:p-4 lg:p-5">
        <div className="mb-3.5 flex flex-wrap items-center gap-x-3 gap-y-2 sm:mb-4">
          <div className="flex items-center gap-2.5">
            <span className="flex h-7 w-7 items-center justify-center rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] text-xs font-semibold text-[var(--color-muted-foreground)]">
              1
            </span>
            <h2 className="text-[1.05rem] font-bold text-[var(--color-foreground)] sm:text-[1.18rem]">
              {t("poolTitle")}
            </h2>
          </div>
          <span className="text-xs text-[var(--color-muted-foreground)]">{t("poolHint")}</span>
        </div>
        <SectionErrorBoundary sectionName={t("poolSection")}>
          <FocusWeaponPool />
        </SectionErrorBoundary>
      </section>

      <div className="grid gap-5 xl:grid-cols-[360px_minmax(0,1fr)]">
        <section className="dashboard-panel p-3.5 sm:p-4 lg:p-5">
          <div className="mb-3.5 flex flex-wrap items-center gap-x-3 gap-y-2 sm:mb-4">
            <div className="flex items-center gap-2.5">
              <span className="flex h-7 w-7 items-center justify-center rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] text-xs font-semibold text-[var(--color-muted-foreground)]">
                2
              </span>
              <h2 className="text-[1.05rem] font-bold text-[var(--color-foreground)] sm:text-[1.18rem]">
                {t("alliesTitle")}
              </h2>
            </div>
            <span className="text-xs text-[var(--color-muted-foreground)]">{t("alliesHint")}</span>
          </div>
          <SectionErrorBoundary sectionName={t("alliesSection")}>
            <WeaponAllySelector />
          </SectionErrorBoundary>
        </section>

        <section className="dashboard-panel min-w-0 p-3.5 sm:p-4 lg:p-5">
          <div className="mb-3.5 flex flex-wrap items-center gap-x-3 gap-y-2 sm:mb-4">
            <div className="flex items-center gap-2.5">
              <span className="flex h-7 w-7 items-center justify-center rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] text-xs font-semibold text-[var(--color-muted-foreground)]">
                3
              </span>
              <h2 className="text-[1.05rem] font-bold text-[var(--color-foreground)] sm:text-[1.18rem]">
                {t("resultsTitle")}
              </h2>
            </div>
            <span className="text-xs text-[var(--color-muted-foreground)]">{t("resultsHint")}</span>
          </div>
          <SectionErrorBoundary sectionName={t("resultsSection")}>
            <SynergyDetailResults />
          </SectionErrorBoundary>
        </section>
      </div>
    </div>
  );
}
