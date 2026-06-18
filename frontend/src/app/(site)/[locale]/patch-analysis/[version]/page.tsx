import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { isRouteLocale, ROUTE_LOCALES } from "@/i18n/routing";
import { getPatchAnalysisVersions } from "@/lib/patchAnalysis";
import { localizeMetadata } from "@/lib/routeMetadata";
import PatchAnalysisPage, {
  generateMetadata as generateBaseMetadata,
} from "@/views/patch-analysis/PatchAnalysisPage";

interface LocalePageProps {
  params: Promise<{ locale: string; version: string }>;
}

const PATCH_ANALYSIS_METADATA = {
  ko: {
    title: (version: string) => `패치 메타 분석 - ${version} 통계 변화`,
    description: (version: string) =>
      `이터널리턴 ${version} 패치 기준 평균 RP, 승률, 픽률, 순방률 변화를 정리합니다.`,
    openGraphTitle: "패치 메타 분석",
  },
  en: {
    title: (version: string) => `Patch meta analysis - ${version} stat changes`,
    description: (version: string) =>
      `Eternal Return patch ${version} analysis covering average RP, win rate, pick rate, and placement movement.`,
    openGraphTitle: "Patch meta analysis",
  },
  ja: {
    title: (version: string) => `パッチメタ分析 - ${version} 統計変化`,
    description: (version: string) =>
      `Eternal Return パッチ ${version} の平均RP、勝率、ピック率、入賞率の変化を整理します。`,
    openGraphTitle: "パッチメタ分析",
  },
  "zh-Hans": {
    title: (version: string) => `版本 Meta 分析 - ${version} 统计变化`,
    description: (version: string) =>
      `整理 Eternal Return ${version} 版本的平均 RP、胜率、选取率和前三率变化。`,
    openGraphTitle: "版本 Meta 分析",
  },
  "zh-Hant": {
    title: (version: string) => `版本 Meta 分析 - ${version} 統計變化`,
    description: (version: string) =>
      `整理 Eternal Return ${version} 版本的平均 RP、勝率、選取率和前三率變化。`,
    openGraphTitle: "版本 Meta 分析",
  },
} as const;

export const dynamic = "force-static";
export const dynamicParams = false;

export function generateStaticParams() {
  const patchVersions = getPatchAnalysisVersions();

  return ROUTE_LOCALES.flatMap((locale) =>
    patchVersions.map((version) => ({
      locale,
      version,
    }))
  );
}

export async function generateMetadata({ params }: LocalePageProps): Promise<Metadata> {
  const { locale, version } = await params;

  if (!isRouteLocale(locale) || !getPatchAnalysisVersions().includes(version)) {
    notFound();
  }

  const base = localizeMetadata(
    await generateBaseMetadata(version),
    `/patch-analysis/${version}`,
    locale
  );
  const copy = PATCH_ANALYSIS_METADATA[locale];

  return {
    ...base,
    title: copy.title(version),
    description: copy.description(version),
    openGraph: base.openGraph
      ? {
          ...base.openGraph,
          title: copy.openGraphTitle,
          description: copy.description(version),
        }
      : undefined,
  };
}

export default async function LocalizedPatchAnalysisVersionPage({ params }: LocalePageProps) {
  const { locale, version } = await params;

  if (!isRouteLocale(locale) || !getPatchAnalysisVersions().includes(version)) {
    notFound();
  }

  setRequestLocale(locale);

  return <PatchAnalysisPage version={version} locale={locale} />;
}
