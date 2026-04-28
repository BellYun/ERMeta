import { BarChart3, Search, Swords } from "lucide-react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { Suspense } from "react";
import { CHARACTER_CODES } from "@/components/features/character-analysis/constants";
import { fetchPatches, fetchStats } from "@/components/features/character-analysis/utils";
import { CharacterAnalysisClient } from "@/components/features/CharacterAnalysisClient";
import { SectionErrorBoundary } from "@/components/features/SectionErrorBoundary";
import { getCharacterName } from "@/lib/characterMap";
import { resolveWeaponName } from "@/lib/weaponMap";
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
  const sampleMatches = initialStats?.totalGames?.toLocaleString() ?? "0";
  const currentWinRate = initialStats?.winRate?.toFixed(1) ?? "0.0";
  const topWeaponLabel = initialStats?.weapons?.[0]
    ? resolveWeaponName(initialStats.weapons[0].bestWeapon ?? null)
    : "—";

  return (
    <div className="page-shell flex flex-col gap-5 lg:gap-6">
      <section className="dashboard-hero px-4 py-4 lg:px-5 lg:py-5">
        <div className="grid gap-3 xl:grid-cols-[minmax(0,1.05fr)_180px_180px_180px]">
          <div className="flex flex-col justify-center px-2 py-2 lg:px-4">
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-[rgba(59,130,246,0.18)] bg-[rgba(59,130,246,0.08)] px-3 py-1">
                <BarChart3 className="h-3.5 w-3.5 text-[var(--color-primary)]" />
                <span className="text-[10px] sm:text-[11px] font-semibold text-[var(--color-primary)] uppercase tracking-[0.1em]">
                  {t("badge")}
                </span>
              </span>
              <span className="inline-flex items-center gap-1 rounded-full bg-[var(--color-warning)]/10 border border-[var(--color-warning)]/20 px-2 py-0.5">
                <span className="text-[9px] font-bold text-[var(--color-warning)] uppercase">
                  {t("beta")}
                </span>
              </span>
              <span className="text-sm text-[var(--color-muted-foreground)]">
                {t("patchBase", { patch: patches[0] ?? "—" })}
              </span>
            </div>

            <h1 className="mt-4 text-[2.2rem] font-black tracking-[-0.055em] text-[var(--color-foreground)] lg:text-[3.15rem]">
              {t("title")}
            </h1>
            <p className="mt-3 max-w-[42rem] text-base leading-7 text-[var(--color-foreground)]/88 lg:text-[1.05rem]">
              {t("subtitle")}
            </p>
            <p className="mt-2 text-sm text-[var(--color-warning)]/80">{t("imageNotice")}</p>
          </div>

          <div className="metric-card flex min-h-[150px] flex-col gap-5 px-5 py-5">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-[rgba(59,130,246,0.22)] bg-[rgba(59,130,246,0.12)] text-[#60a5fa]">
              <Search className="h-5 w-5" strokeWidth={2} />
            </div>
            <div>
              <p className="metric-value text-[1.9rem]">{sampleMatches}</p>
              <p className="mt-1 text-sm text-[var(--color-muted-foreground)]">
                {t("metrics.matches")}
              </p>
            </div>
          </div>

          <div className="metric-card flex min-h-[150px] flex-col gap-5 px-5 py-5">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-[rgba(168,85,247,0.22)] bg-[rgba(168,85,247,0.12)] text-[#c084fc]">
              <BarChart3 className="h-5 w-5" strokeWidth={2} />
            </div>
            <div>
              <p className="metric-value text-[1.9rem]">{currentWinRate}%</p>
              <p className="mt-1 text-sm text-[var(--color-muted-foreground)]">
                {t("metrics.winRate")}
              </p>
            </div>
          </div>

          <div className="metric-card flex min-h-[150px] flex-col gap-5 px-5 py-5">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-[rgba(251,191,36,0.22)] bg-[rgba(251,191,36,0.12)] text-[#fbbf24]">
              <Swords className="h-5 w-5" strokeWidth={2} />
            </div>
            <div>
              <p className="text-[1.35rem] font-black tracking-[-0.04em] text-[var(--color-foreground)]">
                {topWeaponLabel}
              </p>
              <p className="mt-1 text-sm text-[var(--color-muted-foreground)]">
                {t("metrics.bestWeapon")}
              </p>
            </div>
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
              initialWeapon={initialWeapon}
            />
          </Suspense>
        </SectionErrorBoundary>
      </div>
    </div>
  );
}
