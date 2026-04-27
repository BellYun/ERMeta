"use client";

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

  return (
    <div className="flex flex-col gap-5 sm:gap-6 mt-5 sm:mt-7">
      {/* ── Step 1: Weapon Pool ── */}
      <section className="reveal reveal-d1">
        <div className="flex items-center gap-2 mb-2.5">
          <span className="flex items-center justify-center h-5 w-5 rounded-md bg-[var(--color-accent-purple)]/15 text-[10px] font-bold text-[var(--color-accent-purple)]">
            1
          </span>
          <h2 className="text-sm font-bold text-[var(--color-foreground)]">{t("poolTitle")}</h2>
          <span className="text-[10px] text-[var(--color-muted-foreground)]">{t("poolHint")}</span>
        </div>
        <SectionErrorBoundary sectionName={t("poolSection")}>
          <FocusWeaponPool />
        </SectionErrorBoundary>
      </section>

      {/* ── Step 2 & 3: Selector + Results ── */}
      <div className="flex flex-col lg:flex-row gap-4 lg:gap-6">
        <section className="reveal reveal-d2 w-full lg:w-[340px] shrink-0">
          <div className="flex items-center gap-2 mb-2.5">
            <span className="flex items-center justify-center h-5 w-5 rounded-md bg-[var(--color-primary)]/15 text-[10px] font-bold text-[var(--color-primary)]">
              2
            </span>
            <h2 className="text-sm font-bold text-[var(--color-foreground)]">{t("alliesTitle")}</h2>
          </div>
          <SectionErrorBoundary sectionName={t("alliesSection")}>
            <WeaponAllySelector />
          </SectionErrorBoundary>
        </section>

        <section className="reveal reveal-d3 flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2.5">
            <span className="flex items-center justify-center h-5 w-5 rounded-md bg-[var(--color-accent-gold)]/15 text-[10px] font-bold text-[var(--color-accent-gold)]">
              3
            </span>
            <h2 className="text-sm font-bold text-[var(--color-foreground)]">
              {t("resultsTitle")}
            </h2>
          </div>
          <SectionErrorBoundary sectionName={t("resultsSection")}>
            <SynergyDetailResults />
          </SectionErrorBoundary>
        </section>
      </div>
    </div>
  );
}
