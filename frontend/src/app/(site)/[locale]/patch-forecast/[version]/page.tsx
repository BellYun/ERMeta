import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import {
  isPatchForecastActualReady,
  PatchForecastComparison,
} from "@/components/features/home/PatchForecastComparison";
import { getPatchTierForecastVersions } from "@/data/patch-tier-forecasts";
import { ROUTE_LOCALES, isRouteLocale, type ActiveRouteLocale } from "@/i18n/routing";
import { getCachedHomeMetaStats } from "@/lib/homeMetaServer";
import { createEmptyHomeMetaStats } from "@/lib/homeMetaShared";
import { buildLocalizedAlternates, localizeRoutePath } from "@/lib/seoLocales";
import { BASE_URL } from "@/lib/siteMetadata";

interface LocalePageProps {
  params: Promise<{ locale: string; version: string }>;
}

const COPY: Record<
  ActiveRouteLocale,
  {
    kicker: string;
    pendingKicker: string;
    title: (version: string) => string;
    pendingTitle: (version: string) => string;
    description: (version: string) => string;
    pendingDescription: (version: string) => string;
    patchNotes: string;
    trendAnalysis: string;
  }
> = {
  ko: {
    kicker: "패치 예상 검증",
    pendingKicker: "패치 전 예측",
    title: (version) => `${version} 패치 예상과 실제 결과`,
    pendingTitle: (version) => `${version} 패치 영향 예상`,
    description: (version) =>
      `${version} 패치 전 예상 티어와 다이아몬드 이상 실제 통계를 비교합니다.`,
    pendingDescription: (version) =>
      `${version} 패치노트를 기준으로 티어 변화를 예상했습니다. 실제 데이터가 충분히 쌓이면 결과를 함께 비교합니다.`,
    patchNotes: "패치노트 보기",
    trendAnalysis: "패치 경향 분석 보기",
  },
  en: {
    kicker: "Forecast review",
    pendingKicker: "Pre-patch forecast",
    title: (version) => `Patch ${version} forecast vs. results`,
    pendingTitle: (version) => `Expected impact of Patch ${version}`,
    description: (version) =>
      `Compare the pre-patch tier forecast for ${version} with observed Diamond+ performance.`,
    pendingDescription: (version) =>
      `See expected tier changes based on the Patch ${version} notes. Results will appear once enough data is available.`,
    patchNotes: "View patch notes",
    trendAnalysis: "View patch trend analysis",
  },
  ja: {
    kicker: "パッチ予想の検証",
    pendingKicker: "パッチ前予想",
    title: (version) => `パッチ${version}の予想と実際の結果`,
    pendingTitle: (version) => `パッチ${version}の影響予想`,
    description: (version) =>
      `パッチ${version}前のティア予想とダイヤモンド以上の実データを比較します。`,
    pendingDescription: (version) =>
      `パッチ${version}ノートを基準にティア変動を予想しました。十分なデータが集まり次第、結果も表示します。`,
    patchNotes: "パッチノートを見る",
    trendAnalysis: "パッチ傾向分析を見る",
  },
};

export const revalidate = 21600;
export const dynamic = "force-static";
export const dynamicParams = true;

export function generateStaticParams() {
  return ROUTE_LOCALES.flatMap((locale) =>
    getPatchTierForecastVersions().map((version) => ({ locale, version }))
  );
}

export async function generateMetadata({ params }: LocalePageProps): Promise<Metadata> {
  const { locale, version } = await params;

  if (!isRouteLocale(locale) || !getPatchTierForecastVersions().includes(version)) {
    notFound();
  }

  const copy = COPY[locale];
  const title = copy.pendingTitle(version);
  const description = copy.pendingDescription(version);
  const pathname = `/patch-forecast/${version}`;

  return {
    metadataBase: new URL(BASE_URL),
    title: { absolute: `${title} | ER&GG` },
    description,
    alternates: buildLocalizedAlternates(pathname, locale),
    openGraph: {
      title,
      description,
      url: localizeRoutePath(pathname, locale),
    },
    twitter: { title, description },
  };
}

export default async function LocalizedPatchForecastPage({ params }: LocalePageProps) {
  const { locale, version } = await params;

  if (!isRouteLocale(locale) || !getPatchTierForecastVersions().includes(version)) {
    notFound();
  }

  setRequestLocale(locale);
  const copy = COPY[locale];
  const stats = await getCachedHomeMetaStats(version).catch(() =>
    createEmptyHomeMetaStats(version)
  );
  const actualReady = isPatchForecastActualReady(version, stats);
  const pageTitle = actualReady ? copy.title(version) : copy.pendingTitle(version);
  const pageDescription = actualReady
    ? copy.description(version)
    : copy.pendingDescription(version);

  return (
    <main className="page-shell flex flex-col gap-5 lg:gap-6">
      <section className="dashboard-panel px-4 py-5 lg:px-5">
        <p className="dashboard-kicker">{actualReady ? copy.kicker : copy.pendingKicker}</p>
        <h1 className="mt-2 text-xl font-bold leading-tight text-[var(--color-foreground)] sm:text-2xl">
          {pageTitle}
        </h1>
        <p className="mt-2 max-w-[44rem] text-base leading-7 text-[var(--color-muted-foreground)]">
          {pageDescription}
        </p>
        <nav className="mt-4 flex flex-wrap gap-2" aria-label={pageTitle}>
          <Link className="dashboard-tab" href={`/${locale}/patches/${version}`}>
            {copy.patchNotes}
          </Link>
          <Link className="dashboard-tab" href={`/${locale}/patch-analysis/${version}`}>
            {copy.trendAnalysis}
          </Link>
        </nav>
      </section>

      <PatchForecastComparison locale={locale} currentPatch={version} homeMetaStats={stats} />
    </main>
  );
}
