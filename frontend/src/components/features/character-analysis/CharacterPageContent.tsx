"use client";

import { BarChart3 } from "lucide-react";
import { useTranslations } from "next-intl";
import { Suspense } from "react";
import type { CharacterStatsResponse } from "@/app/api/character/stats/[characterCode]/route";
import { CharacterAnalysisClient } from "@/components/features/CharacterAnalysisClient";
import { SectionErrorBoundary } from "@/components/features/SectionErrorBoundary";

interface CharacterPageContentProps {
  code: number;
  patches: string[];
  initialStats: CharacterStatsResponse | null;
  initialPrevStats: CharacterStatsResponse | null;
}

export function CharacterPageContent({
  code,
  patches,
  initialStats,
  initialPrevStats,
}: CharacterPageContentProps) {
  const t = useTranslations("characterPage");

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
          </div>
        </div>
      </section>

      <div className="min-h-[4800px] sm:min-h-[3200px]">
        <SectionErrorBoundary sectionName={t("sectionName")}>
          <Suspense fallback={<div className="min-h-[4800px] sm:min-h-[3200px]" aria-hidden />}>
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
