import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { MultiSearchClient } from "@/components/features/multi-search/MultiSearchClient";
import { isRouteLocale, type RouteLocale } from "@/i18n/routing";
import { isMultiSearchEnabled } from "@/lib/featureFlags";
import { BASE_URL } from "@/lib/siteMetadata";

interface LocalePageProps {
  params: Promise<{ locale: string }>;
}

const COPY: Record<
  RouteLocale,
  {
    title: string;
    metadataTitle: string;
    description: string;
    kicker: string;
    subtitle: string;
    body: string;
    disabledTitle: string;
    disabledBody: string;
  }
> = {
  ko: {
    title: "팀원 멀티서치",
    metadataTitle: "팀원 멀티서치 - 시즌 39 랭크 요약",
    description:
      "이터널리턴 팀원 닉네임 3개를 동시에 검색해 시즌 39 랭크, MMR, 승률, 순방률, 주력 캐릭터를 확인합니다.",
    kicker: "시즌 39 기준",
    subtitle: "닉네임 3개를 동시에 검색해 현재 시즌 랭크 지표와 주력 캐릭터를 비교합니다.",
    body: "BSER 공식 API 기반으로 MMR, 순위, 승률, 순방률, 캐릭터별 기록을 정리합니다.",
    disabledTitle: "멀티서치 준비 중",
    disabledBody: "현재 이 기능은 운영 설정에서 비활성화되어 있습니다.",
  },
  en: {
    title: "Team Multi Search",
    metadataTitle: "Team Multi Search - Season 39 ranked summary",
    description: "Search three Eternal Return player names and compare ranked indicators.",
    kicker: "Season 39 baseline",
    subtitle: "Search three nicknames at once and compare current ranked indicators.",
    body: "Uses the BSER official API to summarize MMR, rank, win rate, placement rate, and main characters.",
    disabledTitle: "Multi Search is unavailable",
    disabledBody: "This feature is currently disabled in the service configuration.",
  },
  ja: {
    title: "チーム複数検索",
    metadataTitle: "チーム複数検索 - シーズン39ランク要約",
    description: "Eternal Return のプレイヤー3名を同時に検索し、ランク指標を比較します。",
    kicker: "シーズン39基準",
    subtitle: "3つのニックネームを同時に検索し、現在シーズンのランク指標を比較します。",
    body: "BSER公式APIをもとにMMR、順位、勝率、入賞率、主力キャラクターを整理します。",
    disabledTitle: "複数検索は現在利用できません",
    disabledBody: "この機能は現在、サービス設定で無効化されています。",
  },
  "zh-Hans": {
    title: "队友多重搜索",
    metadataTitle: "队友多重搜索 - 第 39 赛季排位摘要",
    description: "同时搜索三名 Eternal Return 玩家并比较排位指标。",
    kicker: "第 39 赛季基准",
    subtitle: "同时搜索三个昵称，比较当前赛季排位指标。",
    body: "基于 BSER 官方 API 汇总 MMR、排名、胜率、前三率和主力角色。",
    disabledTitle: "多重搜索暂不可用",
    disabledBody: "该功能目前在服务配置中处于关闭状态。",
  },
  "zh-Hant": {
    title: "隊友多重搜尋",
    metadataTitle: "隊友多重搜尋 - 第 39 賽季牌位摘要",
    description: "同時搜尋三名 Eternal Return 玩家並比較牌位指標。",
    kicker: "第 39 賽季基準",
    subtitle: "同時搜尋三個暱稱，比較目前賽季牌位指標。",
    body: "基於 BSER 官方 API 彙總 MMR、排名、勝率、前三率和主力角色。",
    disabledTitle: "多重搜尋暫不可用",
    disabledBody: "此功能目前在服務設定中處於關閉狀態。",
  },
};

export async function generateMetadata({ params }: LocalePageProps): Promise<Metadata> {
  const { locale } = await params;
  if (!isRouteLocale(locale)) notFound();

  const copy = COPY[locale];
  const title = copy.metadataTitle;
  const description = copy.description;

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
  setRequestLocale(locale);
  const copy = COPY[locale];

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

      {isMultiSearchEnabled() ? (
        <MultiSearchClient />
      ) : (
        <section className="dashboard-panel p-6 text-center">
          <h2 className="text-base font-bold text-[var(--color-foreground)]">
            {copy.disabledTitle}
          </h2>
          <p className="mt-2 text-sm text-[var(--color-muted-foreground)]">{copy.disabledBody}</p>
        </section>
      )}
    </main>
  );
}
