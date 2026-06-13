import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { MultiSearchClient } from "@/components/features/multi-search/MultiSearchClient";
import { isRouteLocale } from "@/i18n/routing";
import { isMultiSearchEnabled } from "@/lib/featureFlags";
import { BASE_URL } from "@/lib/siteMetadata";

interface LocalePageProps {
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({ params }: LocalePageProps): Promise<Metadata> {
  const { locale } = await params;
  if (!isRouteLocale(locale)) notFound();

  const title = "팀원 멀티서치 — 시즌 39 랭크 요약 | ER&GG";
  const description =
    "이터널리턴 팀원 닉네임을 한 번에 검색해 시즌 39 랭크, MMR, 승률, Top 3, 주력 캐릭터를 빠르게 확인하세요.";

  return {
    metadataBase: new URL(BASE_URL),
    title,
    description,
    openGraph: { title, description, url: "/multi-search" },
    twitter: { title, description },
    robots: { index: false, follow: true },
  };
}

export default async function MultiSearchPage({ params }: LocalePageProps) {
  const { locale } = await params;
  if (!isRouteLocale(locale)) notFound();
  if (!isMultiSearchEnabled()) notFound();
  setRequestLocale(locale);

  return (
    <main className="page-shell mx-auto flex max-w-6xl flex-col gap-5 px-3 py-6 sm:px-5 sm:py-8 lg:gap-6">
      <header className="dashboard-hero flex flex-col gap-3 p-5 sm:p-7">
        <div className="flex flex-wrap items-center gap-2">
          <span className="dashboard-kicker">MULTI SEARCH · 시즌 39</span>
        </div>
        <h1 className="dashboard-title">
          팀원 <em>멀티서치</em>
        </h1>
        <p className="max-w-[46rem] text-[0.95rem] font-semibold leading-6 text-[var(--color-foreground)]/88 sm:text-base sm:leading-7">
          닉네임 3개를 한 번에 검색해 현재 시즌 랭크 지표와 주력 캐릭터를 비교합니다.
        </p>
        <p className="max-w-[46rem] text-sm leading-6 text-[var(--color-muted-foreground)] sm:text-[0.95rem] sm:leading-7">
          BSER 공식 API 기반으로 MMR, 순위, 승률, Top 3 비율, 캐릭터별 기록을 정리합니다.
        </p>
      </header>

      <MultiSearchClient />
    </main>
  );
}
