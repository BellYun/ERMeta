import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { Suspense } from "react";
import { fetchTrioWeaponRows } from "@/components/features/trio-lab/serverApi";
import { TrioLabGalleryClient } from "@/components/features/trio-lab/TrioLabGalleryClient";
import { apiRowToCombo } from "@/components/features/trio-lab/types";
import { isRouteLocale } from "@/i18n/routing";
import { BASE_URL } from "@/lib/siteMetadata";

export const dynamic = "force-dynamic";
export const revalidate = 600;

interface LocalePageProps {
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({ params }: LocalePageProps): Promise<Metadata> {
  const { locale } = await params;
  if (!isRouteLocale(locale)) notFound();
  const title = "조합 실험실 — 검증된 trio-weapon 조합 | ER&GG";
  const description =
    "이터널리턴 trio-weapon 통계 기반으로 검증된 3인 조합을 캐릭터별로 둘러보세요. 캐릭터를 선택하면 그 캐릭터가 포함된 모든 강력한 조합과 디테일한 빌드를 확인할 수 있습니다.";
  return {
    metadataBase: new URL(BASE_URL),
    title,
    description,
    openGraph: { title, description, url: "/trio-lab" },
    twitter: { title, description },
    robots: { index: true, follow: true },
  };
}

export default async function TrioLabGalleryPage({ params }: LocalePageProps) {
  const { locale } = await params;
  if (!isRouteLocale(locale)) notFound();
  setRequestLocale(locale);

  const initialRows = await fetchTrioWeaponRows({ sortBy: "recommended", limit: "60" });
  const initialCombos = initialRows.map(apiRowToCombo);

  return (
    <main className="page-shell mx-auto flex max-w-6xl flex-col gap-5 px-3 py-6 sm:px-5 sm:py-8 lg:gap-6">
      <header className="dashboard-hero flex flex-col gap-3 p-5 sm:p-7">
        <div className="flex flex-wrap items-center gap-2">
          <span className="dashboard-kicker">LAB · BETA · 다이아+ 기준</span>
          <span className="rounded-full border border-[rgba(74,222,128,0.22)] bg-[rgba(74,222,128,0.08)] px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-[var(--color-success)]">
            NEW
          </span>
        </div>
        <h1 className="dashboard-title">
          조합 <em>실험실</em>
        </h1>
        <p className="dashboard-subtitle">
          trio-weapon 실 매치 통계 기반으로 검증된 3인 조합을 둘러보세요. 캐릭터를 선택하면 그
          캐릭터가 포함된 강력한 조합과 디테일한 빌드를 확인할 수 있습니다.
        </p>
      </header>

      <Suspense
        fallback={<div className="h-96 animate-pulse rounded-2xl bg-[var(--color-surface-3)]" />}
      >
        <TrioLabGalleryClient initialCombos={initialCombos} />
      </Suspense>
    </main>
  );
}
