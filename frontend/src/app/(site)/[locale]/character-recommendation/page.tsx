import { ArrowUpRight, Layers, Sparkles } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { PoolGapAnalyzer } from "@/components/features/lab/PoolGapAnalyzer";
import { isRouteLocale, type RouteLocale } from "@/i18n/routing";
import { buildLocalizedAlternates, localizeRoutePath } from "@/lib/seoLocales";
import { getCharacterRecommendationCatalog } from "@/lib/server/characterRecommendationCatalog";
import { BASE_URL } from "@/lib/siteMetadata";

interface CharacterRecommendationPageProps {
  params: Promise<{ locale: string }>;
}

const COPY: Record<
  RouteLocale,
  {
    title: string;
    description: string;
    kicker: string;
    lead: string;
    typeAnalysis: string;
  }
> = {
  ko: {
    title: "실험체 추천",
    description:
      "내 실험체 풀의 역할 성향과 조작 난이도를 분석해 같은 포지션에서 부족한 조합 대응력을 채울 후보를 추천합니다.",
    kicker: "실험 기능 · 시즌 10·11 장기 조합",
    lead: "내가 사용하는 실험체를 고르면, 픽풀에서 비어 있는 역할과 같은 포지션의 추가 후보를 찾습니다.",
    typeAnalysis: "실험체 유형 분석",
  },
  en: {
    title: "Character Recommendations",
    description:
      "Analyze your character pool, control-difficulty preference, and role coverage to find same-position additions.",
    kicker: "Experimental · Seasons 10–11 long-term comps",
    lead: "Choose the characters you play to find missing capabilities and same-position additions for your pool.",
    typeAnalysis: "Role group analysis",
  },
  ja: {
    title: "キャラクター推薦",
    description:
      "使用キャラクターの役割傾向と操作難易度から、同じポジションで不足を補う候補を提案します。",
    kicker: "実験機能 · シーズン10・11長期構成",
    lead: "使用するキャラクターを選び、プールに不足する役割と同じポジションの追加候補を探します。",
    typeAnalysis: "キャラクタータイプ分析",
  },
  "zh-Hans": {
    title: "角色推荐",
    description: "根据角色池的职责倾向和操作难度，推荐能在同一位置补足阵容应对能力的角色。",
    kicker: "实验功能 · 第10、11赛季长期阵容",
    lead: "选择你使用的角色，查找角色池中缺少的能力和同位置补充候选。",
    typeAnalysis: "角色类型分析",
  },
  "zh-Hant": {
    title: "角色推薦",
    description: "根據角色池的職責傾向和操作難度，推薦能在同一位置補足陣容應對能力的角色。",
    kicker: "實驗功能 · 第10、11賽季長期陣容",
    lead: "選擇你使用的角色，找出角色池中缺少的能力和同位置補充候選。",
    typeAnalysis: "角色類型分析",
  },
};

export const dynamic = "force-static";

export async function generateMetadata({
  params,
}: CharacterRecommendationPageProps): Promise<Metadata> {
  const { locale: localeParam } = await params;
  if (!isRouteLocale(localeParam)) return {};
  const locale = localeParam as RouteLocale;
  const copy = COPY[locale];
  const pathname = "/character-recommendation";

  return {
    metadataBase: new URL(BASE_URL),
    title: copy.title,
    description: copy.description,
    alternates: buildLocalizedAlternates(pathname, locale),
    robots: { index: false, follow: false },
    openGraph: {
      title: copy.title,
      description: copy.description,
      url: localizeRoutePath(pathname, locale),
    },
  };
}

export default async function CharacterRecommendationPage({
  params,
}: CharacterRecommendationPageProps) {
  const { locale: localeParam } = await params;
  if (!isRouteLocale(localeParam)) notFound();
  setRequestLocale(localeParam);
  const locale = localeParam as RouteLocale;
  const copy = COPY[locale];
  const profiles = getCharacterRecommendationCatalog();

  return (
    <main className="page-shell mx-auto flex max-w-7xl flex-col gap-8 px-4 py-8 sm:px-5 sm:py-10">
      <header className="grid min-w-0 gap-6 border-b border-[var(--color-border)] pb-7 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
        <div className="min-w-0">
          <span className="dashboard-kicker inline-flex items-center gap-2">
            <Sparkles className="h-3.5 w-3.5" />
            {copy.kicker}
          </span>
          <h1 className="mt-4 min-w-0 [overflow-wrap:anywhere] text-3xl font-bold tracking-[-0.035em] text-[var(--color-foreground)] sm:text-4xl">
            {copy.title}
          </h1>
          <p className="mt-4 max-w-3xl text-base font-bold leading-7 text-[var(--color-foreground)] sm:text-lg">
            {copy.lead}
          </p>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-[var(--color-muted-foreground)]">
            {copy.description}
          </p>
        </div>

        <Link
          href={localizeRoutePath("/character-lab", locale)}
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-4 text-sm font-bold text-[var(--color-foreground)] transition-colors hover:bg-[var(--color-surface-2)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]"
        >
          <Layers className="h-4 w-4" />
          {copy.typeAnalysis}
          <ArrowUpRight className="h-4 w-4" />
        </Link>
      </header>

      <PoolGapAnalyzer profiles={profiles} locale={locale} />
    </main>
  );
}
