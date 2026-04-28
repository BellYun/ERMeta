import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { Suspense } from "react";
import { CharacterPicker } from "@/components/features/character-analysis/CharacterPicker";
import { CHARACTER_CODES } from "@/components/features/character-analysis/constants";
import { fetchPatches, fetchStats } from "@/components/features/character-analysis/utils";
import { CharacterAnalysisClient } from "@/components/features/CharacterAnalysisClient";
import { SectionErrorBoundary } from "@/components/features/SectionErrorBoundary";
import { getCharacterName } from "@/lib/characterMap";
import { TierGroup } from "@/utils/tier";

/** 1시간마다 ISR 재생성 */
export const revalidate = 3600;

interface Props {
  params: Promise<{ code: string }>;
  searchParams: Promise<{ weapon?: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { code: rawCode } = await params;
  const code = parseInt(rawCode, 10);
  const name = !isNaN(code) ? getCharacterName(code) : null;
  const t = await getTranslations("characterMetadata");

  if (name && !name.startsWith("코드:")) {
    const title = t("titleWithName", { name });
    const description = t("descriptionWithName", { name });

    return {
      title,
      description,
      keywords: [
        t("keywords.character", { name }),
        t("keywords.build", { name }),
        t("keywords.winRate", { name }),
        t("keywords.stats", { name }),
        t("keywords.brand"),
        t("keywords.app"),
        t("keywords.analysis"),
      ],
      openGraph: {
        title: t("openGraphTitle", { title }),
        description,
        url: `/character/${code}`,
      },
      twitter: {
        title: t("twitterTitle", { title }),
        description,
      },
      alternates: { canonical: `/character/${code}` },
    };
  }

  return {
    title: t("titleFallback"),
    description: t("descriptionFallback"),
    keywords: [
      t("keywords.brand"),
      t("keywords.app"),
      t("keywords.analysis"),
      t("keywords.fallbackBuild"),
      t("keywords.fallbackStats"),
      t("keywords.fallbackWeapon"),
    ],
    openGraph: {
      title: t("openGraphTitle", { title: t("titleFallback") }),
      description: t("socialDescription"),
      url: "/character",
    },
    twitter: {
      title: t("twitterTitle", { title: t("titleFallback") }),
      description: t("socialDescription"),
    },
    alternates: { canonical: "/character" },
  };
}

/**
 * 캐릭터 분석 페이지 — on-demand ISR
 * 로케일/쿠키 기반 번역이 있어 빌드 타임 전체 prerender 대신 첫 요청 시 생성 후 재검증한다.
 */
export default async function CharacterPage({ params, searchParams }: Props) {
  const { code: rawCode } = await params;
  const { weapon: rawWeapon } = await searchParams;
  const code = parseInt(rawCode, 10);
  const weaponCode = rawWeapon ? parseInt(rawWeapon, 10) : null;
  const initialWeapon = weaponCode && !isNaN(weaponCode) ? weaponCode : null;

  if (isNaN(code) || !CHARACTER_CODES.includes(code)) {
    notFound();
  }

  const base = process.env.NEXT_PUBLIC_BASE_URL ?? "https://erwagg.com";
  const t = await getTranslations("characterPage");

  const patches = await fetchPatches(base);
  const [initialStats, initialPrevStats] = await Promise.all([
    patches[0] ? fetchStats(code, patches[0], TierGroup.MITHRIL, base) : null,
    patches[1] ? fetchStats(code, patches[1], TierGroup.MITHRIL, base) : null,
  ]);

  return (
    <>
      {/* ── Hero Zone ── */}
      <section className="analysis-hero -mx-3 sm:-mx-4 -mt-4 sm:-mt-5 px-3 sm:px-4 pt-5 sm:pt-8 pb-6 sm:pb-8 relative">
        <div className="max-w-6xl mx-auto">
          <div className="reveal flex flex-col gap-3">
            {/* Badge */}
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--color-primary)]/10 border border-[var(--color-primary)]/20 px-2.5 py-1">
                <svg
                  className="h-3 w-3 text-[var(--color-primary)]"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M7.5 14.25v2.25m3-4.5v4.5m3-6.75v6.75m3-9v9M6 20.25h12A2.25 2.25 0 0 0 20.25 18V6A2.25 2.25 0 0 0 18 3.75H6A2.25 2.25 0 0 0 3.75 6v12A2.25 2.25 0 0 0 6 20.25Z"
                  />
                </svg>
                <span className="text-[10px] sm:text-[11px] font-semibold text-[var(--color-primary)] uppercase tracking-[0.1em]">
                  {t("badge")}
                </span>
              </span>
              <span className="inline-flex items-center gap-1 rounded-full bg-[var(--color-warning)]/10 border border-[var(--color-warning)]/20 px-2 py-0.5">
                <span className="text-[9px] font-bold text-[var(--color-warning)] uppercase">
                  {t("beta")}
                </span>
              </span>
              <span className="text-[10px] sm:text-[11px] text-[var(--color-muted-foreground)]">
                {t("patchBase", { patch: patches[0] ?? "—" })}
              </span>
            </div>

            {/* Title */}
            <h1 className="text-[28px] sm:text-4xl font-black tracking-tight text-[var(--color-foreground)] leading-none">
              {t("title")}
            </h1>
            <p className="text-xs sm:text-sm text-[var(--color-muted-foreground)] max-w-lg">
              {t("subtitle")}
            </p>
            <p className="text-[11px] text-[var(--color-warning)]/80 mt-0.5">{t("imageNotice")}</p>
          </div>
        </div>

        {/* Bottom edge */}
        <div className="absolute bottom-0 inset-x-0 section-divider" />
      </section>

      <div className="reveal reveal-d2 mt-5 sm:mt-7 overflow-x-auto">
        <CharacterPicker code={code} currentPatch={patches[0] ?? null} />

        <div className="mt-4 sm:mt-5 min-h-[4800px] sm:min-h-[3200px]">
          <SectionErrorBoundary sectionName={t("sectionName")}>
            <Suspense fallback={<div className="min-h-[4800px] sm:min-h-[3200px]" aria-hidden />}>
              <CharacterAnalysisClient
                key={code}
                initialPatches={patches}
                initialStats={initialStats}
                initialPrevStats={initialPrevStats}
                code={code}
                initialWeapon={initialWeapon}
              />
            </Suspense>
          </SectionErrorBoundary>
        </div>
      </div>
    </>
  );
}
