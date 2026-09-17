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
      version === "12.4"
        ? "이터널리턴 12.4 공식 변경점과 12.3 기준 사전 전망을 정리합니다. 관측 통계와 갬빗 RP 영향은 분리합니다."
        : `이터널리턴 ${version} 패치 기준 평균 RP, 승률, 픽률, 순방률 변화를 정리합니다.`,
    openGraphTitle: "패치 메타 분석",
  },
  en: {
    title: (version: string) => `Patch meta analysis - ${version} stat changes`,
    description: (version: string) =>
      version === "12.4"
        ? "Official Eternal Return 12.4 changes and a pre-patch outlook against the 12.3 baseline, separate from observed stats."
        : `Eternal Return patch ${version} analysis covering average RP, win rate, pick rate, and placement movement.`,
    openGraphTitle: "Patch meta analysis",
  },
  ja: {
    title: (version: string) => `パッチメタ分析 - ${version} 統計変化`,
    description: (version: string) =>
      version === "12.4"
        ? "Eternal Return 12.4の公式変更と、12.3を基準にした事前予測を実測データと区別して整理します。"
        : `Eternal Return パッチ ${version} の平均RP、勝率、ピック率、入賞率の変化を整理します。`,
    openGraphTitle: "パッチメタ分析",
  },
  "zh-Hans": {
    title: (version: string) => `版本 Meta 分析 - ${version} 统计变化`,
    description: (version: string) =>
      version === "12.4"
        ? "整理Eternal Return 12.4官方改动和以12.3为基线的事前预测，并与实测数据区分。"
        : `整理 Eternal Return ${version} 版本的平均 RP、胜率、选取率和前三率变化。`,
    openGraphTitle: "版本 Meta 分析",
  },
  "zh-Hant": {
    title: (version: string) => `版本 Meta 分析 - ${version} 統計變化`,
    description: (version: string) =>
      version === "12.4"
        ? "整理Eternal Return 12.4官方改動和以12.3為基線的事前預測，並與實測數據區分。"
        : `整理 Eternal Return ${version} 版本的平均 RP、勝率、選取率和前三率變化。`,
    openGraphTitle: "版本 Meta 分析",
  },
} as const;

export const dynamic = "force-static";
export const dynamicParams = true;
export const revalidate = 3600;

function getSkippedStaticPatchAnalysisVersions() {
  return new Set(
    (process.env.SKIP_PATCH_ANALYSIS_STATIC_VERSIONS ?? "")
      .split(",")
      .map((version) => version.trim())
      .filter(Boolean)
  );
}

export function generateStaticParams() {
  const skippedVersions = getSkippedStaticPatchAnalysisVersions();
  const patchVersions = getPatchAnalysisVersions().filter(
    (version) => !skippedVersions.has(version)
  );

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
