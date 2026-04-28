"use client";

import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { SectionErrorBoundary } from "@/components/features/SectionErrorBoundary";
import { FocusWeaponPool } from "./FocusWeaponPool";
import { SynergyDetailResults } from "./SynergyDetailResults";
import { WeaponAllySelector } from "./WeaponAllySelector";

/**
 * Iter6: 3개의 interactive 컴포넌트를 단일 번들로 묶어 dynamic import 횟수를 3→1로 축소.
 * - 이전: 3개의 체인 import → 각각 네트워크 RTT + 모듈 평가 → hydration 지연
 * - 현재: 단일 청크로 한 번에 로드, 세 컴포넌트가 동시에 interactive
 *
 * SSR/CSR 경계는 SynergyDetailClient가 담당 (ssr: false로 이 파일 전체를 lazy).
 */
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
          className="dashboard-panel px-4 py-3 text-sm text-[var(--color-foreground)]"
        >
          {t("shareLanding")}
        </div>
      )}

      <section className="dashboard-panel reveal reveal-d1 p-4 lg:p-5">
        <div className="mb-4 flex flex-wrap items-end gap-x-3 gap-y-2">
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-xl bg-[rgba(168,85,247,0.14)] text-xs font-bold text-[#c084fc]">
              1
            </span>
            <h2 className="text-[1.35rem] font-black tracking-[-0.04em] text-[var(--color-foreground)]">
              {t("poolTitle")}
            </h2>
          </div>
          <span className="pb-0.5 text-xs text-[var(--color-muted-foreground)]">
            {t("poolHint")}
          </span>
        </div>
        <SectionErrorBoundary sectionName={t("poolSection")}>
          <FocusWeaponPool />
        </SectionErrorBoundary>
      </section>

      <div className="grid gap-5 xl:grid-cols-[360px_minmax(0,1fr)]">
        <section className="dashboard-panel reveal reveal-d2 p-4 lg:p-5">
          <div className="mb-4 flex flex-wrap items-end gap-x-3 gap-y-2">
            <div className="flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-xl bg-[rgba(59,130,246,0.14)] text-xs font-bold text-[#60a5fa]">
                2
              </span>
              <h2 className="text-[1.35rem] font-black tracking-[-0.04em] text-[var(--color-foreground)]">
                {t("alliesTitle")}
              </h2>
            </div>
            <span className="pb-0.5 text-xs text-[var(--color-muted-foreground)]">
              {t("alliesHint")}
            </span>
          </div>
          <SectionErrorBoundary sectionName={t("alliesSection")}>
            <WeaponAllySelector />
          </SectionErrorBoundary>
        </section>

        <section className="dashboard-panel reveal reveal-d3 min-w-0 p-4 lg:p-5">
          <div className="mb-4 flex flex-wrap items-end gap-x-3 gap-y-2">
            <div className="flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-xl bg-[rgba(251,191,36,0.14)] text-xs font-bold text-[#fbbf24]">
                3
              </span>
              <h2 className="text-[1.35rem] font-black tracking-[-0.04em] text-[var(--color-foreground)]">
                {t("resultsTitle")}
              </h2>
            </div>
            <span className="pb-0.5 text-xs text-[var(--color-muted-foreground)]">
              {t("resultsHint")}
            </span>
          </div>
          <SectionErrorBoundary sectionName={t("resultsSection")}>
            <SynergyDetailResults />
          </SectionErrorBoundary>
        </section>
      </div>
    </div>
  );
}
