import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { Suspense } from "react";
import { TrioLabDetailClient } from "@/components/features/trio-lab/TrioLabDetailClient";
import { characterDisplayName, parseComboId } from "@/components/features/trio-lab/types";
import { LANGUAGE_BY_ROUTE_LOCALE, type RouteLocale, isRouteLocale } from "@/i18n/routing";
import { buildFallbackMap, resolveCharacterName } from "@/lib/characterMap";
import { loadL10nMap } from "@/lib/serverL10n";
import { BASE_URL } from "@/lib/siteMetadata";

export const dynamic = "force-static";

interface PageProps {
  params: Promise<{ locale: string; comboId: string }>;
}

const META_COPY: Record<RouteLocale, { missing: string; suffix: string; description: string }> = {
  ko: {
    missing: "조합 정보를 찾을 수 없습니다",
    suffix: "조합 상세",
    description:
      "이터널리턴 무기별 3인 조합 통계 기반 분석. 캐릭터별 장비 빌드, 최근 패치 변동, 비슷한 조합 데이터.",
  },
  en: {
    missing: "Composition not found",
    suffix: "Composition Detail",
    description: "Weapon-specific ranked stats for Eternal Return trio compositions.",
  },
  ja: {
    missing: "編成情報が見つかりません",
    suffix: "編成詳細",
    description: "エターナルリターンの武器別3人編成ランク統計です。",
  },
  "zh-Hans": {
    missing: "未找到阵容信息",
    suffix: "阵容详情",
    description: "永恒轮回三人阵容的武器维度排位统计。",
  },
  "zh-Hant": {
    missing: "找不到陣容資訊",
    suffix: "陣容詳細",
    description: "永恆輪迴三人陣容的武器維度積分統計。",
  },
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale, comboId } = await params;
  if (!isRouteLocale(locale)) notFound();
  const copy = META_COPY[locale];
  const members = parseComboId(comboId);
  if (!members) return { title: copy.missing };
  const l10n = loadL10nMap(LANGUAGE_BY_ROUTE_LOCALE[locale]);
  const fallbackMap = buildFallbackMap();
  const trioName = members
    .map((m) =>
      locale === "ko"
        ? characterDisplayName(m.character)
        : resolveCharacterName(m.character, l10n, fallbackMap)
    )
    .join(" + ");
  const title = `${trioName} - ${copy.suffix}`;
  const description = copy.description;

  return {
    metadataBase: new URL(BASE_URL),
    title,
    description,
    openGraph: { title, description, url: `/trio-lab/${comboId}` },
    twitter: { title, description },
    robots: { index: false, follow: true },
  };
}

export default async function TrioLabDetailPage({ params }: PageProps) {
  const { locale, comboId } = await params;
  if (!isRouteLocale(locale)) notFound();
  setRequestLocale(locale);

  const members = parseComboId(comboId);
  if (!members) notFound();

  return (
    <main className="page-shell mx-auto flex max-w-6xl flex-col gap-5 px-3 py-6 sm:px-5 sm:py-8 lg:gap-6">
      <Suspense
        fallback={
          <div className="h-96 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-2)]" />
        }
      >
        <TrioLabDetailClient comboId={comboId} />
      </Suspense>
    </main>
  );
}
