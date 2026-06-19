import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { Suspense } from "react";
import {
  buildTrioWeaponSearchRequests,
  filterRowsByPool,
} from "@/components/features/trio-lab/searchRequests";
import { fetchTrioWeaponRows } from "@/components/features/trio-lab/serverApi";
import { TrioLabGalleryClient } from "@/components/features/trio-lab/TrioLabGalleryClient";
import { mergeApiRowsByComboId, sortTrioWeaponCombos } from "@/components/features/trio-lab/types";
import { parseTrioLabUrlState } from "@/components/features/trio-lab/urlState";
import { isRouteLocale } from "@/i18n/routing";
import { BASE_URL } from "@/lib/siteMetadata";

export const dynamic = "force-dynamic";
export const revalidate = 600;

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

interface LocalePageProps {
  params: Promise<{ locale: string }>;
  searchParams: SearchParams;
}

const TRIO_LAB_COPY = {
  ko: {
    title: "조합 실험실",
    metadataTitle: "조합 실험실 - 무기별 3인 조합",
    description: "이터널리턴 무기별 3인 조합 통계를 캐릭터별로 둘러보세요.",
    kicker: "다이아+ 기준",
    subtitle: "ER&GG는 무기별 랭크 데이터를 조합 판단에 맞게 다시 정리합니다.",
    body: "실제 매치 통계 기반의 3인 조합을 둘러보세요. 캐릭터를 선택하면 그 캐릭터가 포함된 주요 조합과 상세 빌드를 확인할 수 있습니다.",
  },
  en: {
    title: "Team Lab",
    metadataTitle: "Team Lab - weapon-based trio comps",
    description: "Browse Eternal Return weapon-based trio composition stats by character.",
    kicker: "Diamond+ baseline",
    subtitle: "ER&GG organizes weapon-based ranked data for practical team decisions.",
    body: "Browse three-character compositions based on match stats. Select a character to inspect key teams and detailed builds that include it.",
  },
  ja: {
    title: "編成ラボ",
    metadataTitle: "編成ラボ - 武器別3人編成",
    description: "Eternal Return の武器別3人編成統計をキャラクター別に確認できます。",
    kicker: "ダイヤ以上基準",
    subtitle: "ER&GGは武器別ランクデータを編成判断用に整理します。",
    body: "実戦統計に基づく3人編成を確認できます。キャラクターを選ぶと、そのキャラクターを含む主要編成と詳細ビルドを見られます。",
  },
  "zh-Hans": {
    title: "阵容实验室",
    metadataTitle: "阵容实验室 - 武器三人阵容",
    description: "按角色查看 Eternal Return 武器三人阵容统计。",
    kicker: "钻石以上基准",
    subtitle: "ER&GG 将武器排位数据整理成阵容判断依据。",
    body: "浏览基于实战统计的三人阵容。选择角色后，可以查看包含该角色的主要阵容和详细构筑。",
  },
  "zh-Hant": {
    title: "陣容實驗室",
    metadataTitle: "陣容實驗室 - 武器三人陣容",
    description: "按角色查看 Eternal Return 武器三人陣容統計。",
    kicker: "鑽石以上基準",
    subtitle: "ER&GG 將武器牌位資料整理成陣容判斷依據。",
    body: "瀏覽基於實戰統計的三人陣容。選擇角色後，可以查看包含該角色的主要陣容和詳細構築。",
  },
} as const;

async function fetchInitialCombos(searchParams: Awaited<SearchParams>) {
  const state = parseTrioLabUrlState(searchParams);
  if (state.pool.length === 0) return [];

  const rowGroups = await Promise.all(
    buildTrioWeaponSearchRequests(state.pool, state.weaponFilters).map((params) =>
      fetchTrioWeaponRows(params)
    )
  );
  const rows = rowGroups.flat();
  return sortTrioWeaponCombos(
    mergeApiRowsByComboId(filterRowsByPool(rows, state.pool, state.weaponFilters)),
    state.sort
  );
}

export async function generateMetadata({ params }: LocalePageProps): Promise<Metadata> {
  const { locale } = await params;
  if (!isRouteLocale(locale)) notFound();
  const copy = TRIO_LAB_COPY[locale];
  return {
    metadataBase: new URL(BASE_URL),
    title: copy.metadataTitle,
    description: copy.description,
    openGraph: { title: copy.metadataTitle, description: copy.description, url: "/trio-lab" },
    twitter: { title: copy.metadataTitle, description: copy.description },
    robots: { index: true, follow: true },
  };
}

export default async function TrioLabGalleryPage({ params, searchParams }: LocalePageProps) {
  const [{ locale }, query] = await Promise.all([params, searchParams]);
  if (!isRouteLocale(locale)) notFound();
  setRequestLocale(locale);
  const copy = TRIO_LAB_COPY[locale];

  const initialCombos = await fetchInitialCombos(query);

  return (
    <main className="page-shell mx-auto flex max-w-6xl flex-col gap-5 px-3 py-6 sm:px-5 sm:py-8 lg:gap-6">
      <header className="dashboard-panel flex flex-col gap-3 p-5">
        <div className="flex flex-wrap items-center gap-2">
          <span className="dashboard-kicker">{copy.kicker}</span>
        </div>
        <h1 className="text-[1.75rem] font-bold leading-tight text-[var(--color-foreground)] sm:text-[2.1rem]">
          {copy.title}
        </h1>
        <p className="max-w-[46rem] text-sm leading-6 text-[var(--color-foreground)] sm:text-[0.95rem]">
          {copy.subtitle}
        </p>
        <p className="max-w-[46rem] text-sm leading-6 text-[var(--color-muted-foreground)]">
          {copy.body}
        </p>
      </header>

      <Suspense fallback={<div className="h-96 rounded-lg bg-[var(--color-surface-3)]" />}>
        <TrioLabGalleryClient initialCombos={initialCombos} />
      </Suspense>
    </main>
  );
}
