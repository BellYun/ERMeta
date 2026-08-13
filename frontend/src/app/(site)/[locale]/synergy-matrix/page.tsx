import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { SynergyMatrixClient } from "@/components/features/synergy-matrix/SynergyMatrixClient";
import type { MatrixCopy } from "@/components/features/synergy-matrix/types";
import { ROUTE_LOCALES, isRouteLocale, type ActiveRouteLocale } from "@/i18n/routing";
import { buildLocalizedAlternates, localizeRoutePath } from "@/lib/seoLocales";
import { BASE_URL } from "@/lib/siteMetadata";

export const dynamic = "force-static";

interface LocalePageProps {
  params: Promise<{ locale: string }>;
}

const COPY: Record<ActiveRouteLocale, MatrixCopy> = {
  ko: {
    title: "시너지 매트릭스",
    metadataTitle: "시너지 매트릭스 - 캐릭터 조합 상성 히트맵",
    description:
      "이터널리턴 캐릭터 87명의 조합 상성을 Canvas 히트맵으로 탐색하고, 평균 RP 상승량과 승률 상승량을 비교합니다.",
    kicker: "10.x 다이아+ 누적",
    subtitle: "캐릭터를 기준 행, 동료를 열로 놓고 조합 상성을 한 화면에서 비교합니다.",
    body: "색이 진할수록 선택한 지표의 변화가 큽니다. 셀을 선택하면 공유 가능한 링크와 조합 상세로 이동할 수 있습니다.",
    loading: "시너지 매트릭스를 준비하는 중",
    loadFailed: "시너지 매트릭스를 불러오지 못했습니다",
    controls: {
      metric: "지표",
      minGames: "최소 표본",
      sort: "정렬",
      focus: "기준 캐릭터",
    },
    metrics: {
      rpLift: "RP 상승량",
      winRateLift: "승률 상승량",
      avgRP: "평균 RP",
      winRate: "승률",
      games: "표본 수",
    },
    sortOptions: {
      code: "기본 순서",
      name: "이름순",
      outgoingRpLift: "받는 조합 평균 RP",
      incomingRpLift: "동료 기여 평균 RP",
      games: "표본 많은 순",
    },
    selectedPair: "선택한 조합",
    hoverHelp: "셀을 터치하거나 클릭하면 기준 캐릭터와 동료 캐릭터의 조합 지표를 봅니다.",
    noCell: "표본 조건을 만족하는 셀을 선택해주세요.",
    topPositive: "RP 상승 상위 조합",
    topNegative: "RP 하락 상위 조합",
    games: "게임 수",
    winRate: "승률",
    averageRp: "평균 RP",
    averageRank: "평균 순위",
    rpLift: "RP 상승량",
    winRateLift: "승률 상승량",
    sample: "표본",
    openTeamData: "조합 상세",
    copyLink: "링크 복사",
    copied: "복사됨",
    accessibilityTitle:
      "캐릭터 조합 상성 히트맵. 방향키로 선택 셀을 이동하고 엔터 없이 셀 이동 즉시 선택됩니다.",
  },
  en: {
    title: "Synergy Matrix",
    metadataTitle: "Synergy Matrix - character pairing heatmap",
    description:
      "Explore 87 Eternal Return character pairings with a Canvas heatmap and compare average RP lift and win-rate lift.",
    kicker: "10.x Diamond+ aggregate",
    subtitle:
      "Rows are focus characters and columns are allies, so pair strength is visible at a glance.",
    body: "Darker cells represent stronger movement in the selected metric. Select a cell to open team data or share the view.",
    loading: "Preparing synergy matrix",
    loadFailed: "Failed to load the synergy matrix",
    controls: {
      metric: "Metric",
      minGames: "Min sample",
      sort: "Sort",
      focus: "Focus",
    },
    metrics: {
      rpLift: "RP lift",
      winRateLift: "Win-rate lift",
      avgRP: "Average RP",
      winRate: "Win rate",
      games: "Games",
    },
    sortOptions: {
      code: "Default order",
      name: "Name",
      outgoingRpLift: "Best focus average",
      incomingRpLift: "Best ally average",
      games: "Most samples",
    },
    selectedPair: "Selected pair",
    hoverHelp: "Touch or click a cell to inspect the focus and ally pairing metrics.",
    noCell: "Select a cell that meets the sample threshold.",
    topPositive: "Top RP-lift pairs",
    topNegative: "Lowest RP-lift pairs",
    games: "Games",
    winRate: "Win rate",
    averageRp: "Average RP",
    averageRank: "Average rank",
    rpLift: "RP lift",
    winRateLift: "Win-rate lift",
    sample: "Sample",
    openTeamData: "Team data",
    copyLink: "Copy link",
    copied: "Copied",
    accessibilityTitle:
      "Character pairing heatmap. Use arrow keys to move the selected cell; movement selects the current cell.",
  },
  ja: {
    title: "シナジーマトリクス",
    metadataTitle: "シナジーマトリクス - キャラクター編成ヒートマップ",
    description:
      "Eternal Return の87体のキャラクター相性を Canvas ヒートマップで確認し、平均RP上昇量と勝率上昇量を比較できます。",
    kicker: "10.x ダイヤ+累積",
    subtitle: "行は基準キャラクター、列は味方キャラクターとして編成相性を比較します。",
    body: "色が濃いほど選択した指標の変化が大きいセルです。セルを選択すると共有リンクと編成詳細を開けます。",
    loading: "シナジーマトリクスを準備中",
    loadFailed: "シナジーマトリクスを読み込めませんでした",
    controls: {
      metric: "指標",
      minGames: "最小サンプル",
      sort: "並び替え",
      focus: "基準キャラ",
    },
    metrics: {
      rpLift: "RP上昇量",
      winRateLift: "勝率上昇量",
      avgRP: "平均RP",
      winRate: "勝率",
      games: "試合数",
    },
    sortOptions: {
      code: "基本順",
      name: "名前順",
      outgoingRpLift: "基準平均RP",
      incomingRpLift: "味方平均RP",
      games: "サンプル順",
    },
    selectedPair: "選択中の組み合わせ",
    hoverHelp: "セルをタップまたはクリックすると、基準キャラと味方キャラの編成指標を表示します。",
    noCell: "サンプル条件を満たすセルを選択してください。",
    topPositive: "RP上昇 上位組み合わせ",
    topNegative: "RP低下 上位組み合わせ",
    games: "試合数",
    winRate: "勝率",
    averageRp: "平均RP",
    averageRank: "平均順位",
    rpLift: "RP上昇量",
    winRateLift: "勝率上昇量",
    sample: "サンプル",
    openTeamData: "編成詳細",
    copyLink: "リンクをコピー",
    copied: "コピー済み",
    accessibilityTitle:
      "キャラクター編成相性ヒートマップ。矢印キーで選択セルを移動すると、そのセルが選択されます。",
  },
};

export function generateStaticParams() {
  return ROUTE_LOCALES.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }: LocalePageProps): Promise<Metadata> {
  const { locale } = await params;
  if (!isRouteLocale(locale)) notFound();

  const copy = COPY[locale];
  return {
    metadataBase: new URL(BASE_URL),
    title: copy.metadataTitle,
    description: copy.description,
    openGraph: {
      title: copy.metadataTitle,
      description: copy.description,
      url: localizeRoutePath("/synergy-matrix", locale),
    },
    twitter: {
      title: copy.metadataTitle,
      description: copy.description,
    },
    alternates: buildLocalizedAlternates("/synergy-matrix", locale),
    robots: {
      index: locale === "ko" || locale === "ja",
      follow: true,
    },
  };
}

export default async function SynergyMatrixPage({ params }: LocalePageProps) {
  const { locale } = await params;
  if (!isRouteLocale(locale)) notFound();
  setRequestLocale(locale);
  const copy = COPY[locale];

  return (
    <main className="page-shell mx-auto flex max-w-[1500px] flex-col gap-5 px-3 py-6 sm:px-5 sm:py-8 lg:gap-6">
      <header className="dashboard-panel flex flex-col gap-3 p-4">
        <div className="flex flex-wrap items-center gap-2">
          <span className="dashboard-kicker">{copy.kicker}</span>
        </div>
        <h1 className="dashboard-section-title text-xl font-bold leading-tight text-[var(--color-foreground)] sm:text-2xl">
          {copy.title}
        </h1>
        <p className="max-w-[58rem] text-sm leading-6 text-[var(--color-foreground)] sm:text-[0.95rem]">
          {copy.subtitle}
        </p>
        <p className="max-w-[58rem] text-sm leading-6 text-[var(--color-muted-foreground)]">
          {copy.body}
        </p>
      </header>

      <SynergyMatrixClient copy={copy} />
    </main>
  );
}
