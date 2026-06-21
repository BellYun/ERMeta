import { BarChart3, Database, Layers3, Trophy } from "lucide-react";
import type { Metadata } from "next";
import Image from "next/image";
import type { ReactNode } from "react";
import { PatchTimelineBlock } from "@/app/season10-recap/PatchTimelineBlock";
import { RoleStrengthBlock } from "@/app/season10-recap/RoleStrengthBlock";
import { SeasonHallOfFameBlock } from "@/app/season10-recap/SeasonHallOfFameBlock";
import { Link } from "@/i18n/navigation";
import { LANGUAGE_BY_ROUTE_LOCALE, type RouteLocale } from "@/i18n/routing";
import { buildFallbackMap, getCharacterImageUrl, resolveCharacterName } from "@/lib/characterMap";
import { getSeasonRecapData } from "@/lib/seasonRecap";
import { loadL10nMap } from "@/lib/serverL10n";
import { BASE_URL } from "@/lib/siteMetadata";
import { cn } from "@/lib/utils";
import { resolveWeaponName } from "@/lib/weaponMap";

export const metadata: Metadata = {
  metadataBase: new URL(BASE_URL),
  title: "시즌 10 리캡 - 마지막 메타 기록",
  description:
    "이터널리턴 시즌 10 마무리. 패치별 평균 RP 주요 조합과 시즌 누적 평균 RP 전체 랭킹. 미스릴+ 기준.",
  alternates: { canonical: "/season10-recap" },
  openGraph: {
    title: "시즌 10 리캡",
    description: "패치별 평균 RP 주요 조합 + 시즌 누적 전체 랭킹",
    url: "/season10-recap",
  },
  twitter: {
    title: "시즌 10 리캡",
    description: "패치별 평균 RP 주요 조합 + 시즌 누적 전체 랭킹",
  },
};

export const revalidate = 86400;

const COPY = {
  ko: {
    emptyTitle: "시즌 10 리캡",
    emptyBody: "현재 표시할 시즌 데이터가 없습니다.",
    kicker: "시즌 10 마무리",
    tierScope: "미스릴+ 집계",
    title: "시즌 10 리캡",
    trackedPatches: "추적 패치",
    trackedPatchesValue: (count: number) => `${count}개`,
    trackedCombos: "집계 조합",
    trackedCombosValue: (count: string) => `${count}개`,
    totalSample: "누적 표본",
    totalSampleValue: (count: string) => `${count}판`,
    leaderTitle: "시즌 1위 조합",
    leaderPatchCount: (count: number, total: number) => `주요권 ${count}/${total} 패치`,
    integrated: "통합 집계",
    seasonAverageRp: "시즌 평균 RP",
    preparing: "시즌 누적 주요 조합 데이터가 아직 집계되지 않았습니다.",
    basisKicker: "데이터 기준",
    basisTitle: "공식 API 기반 시즌 누적 집계입니다.",
    basisBody:
      "미스릴 / 메테오라이트 / 다이아몬드 / 상위 1000위 티어 통합 통계이며, 평균 RP 획득량 기준으로 정렬했습니다. 알렉스처럼 무기 통합 집계가 필요한 캐릭터는 단일 조합으로 합산했습니다.",
    back: "메타 분석으로 돌아가기",
    nonKoSummary:
      "This localized overview highlights the season-level metrics and leading compositions.",
  },
  en: {
    emptyTitle: "Season 10 Recap",
    emptyBody: "Data is being prepared. Please check again later.",
    kicker: "Season 10 closing record",
    tierScope: "Mithril+ aggregate",
    title: "Season 10 Recap",
    trackedPatches: "Tracked patches",
    trackedPatchesValue: (count: number) => `${count}`,
    trackedCombos: "Tracked teams",
    trackedCombosValue: (count: string) => count,
    totalSample: "Total sample",
    totalSampleValue: (count: string) => `${count} games`,
    leaderTitle: "Season leader",
    leaderPatchCount: (count: number, total: number) => `Top group in ${count}/${total} patches`,
    integrated: "Combined weapons",
    seasonAverageRp: "Season avg RP",
    preparing: "Season team data is being prepared.",
    basisKicker: "Data Basis",
    basisTitle: "Season aggregate based on official API data.",
    basisBody:
      "The recap combines Mithril, Meteorite, Diamond, and top-1000 ranked tiers, then sorts teams by average RP. Weapon-agnostic characters are merged into a single aggregate row.",
    back: "Back to Meta Analysis",
    nonKoSummary: "This localized page focuses on season-level metrics and leading compositions.",
  },
  ja: {
    emptyTitle: "シーズン10リキャップ",
    emptyBody: "データを準備中です。しばらくしてから再度ご確認ください。",
    kicker: "シーズン10最終記録",
    tierScope: "ミスリル以上集計",
    title: "シーズン10リキャップ",
    trackedPatches: "追跡パッチ",
    trackedPatchesValue: (count: number) => `${count}`,
    trackedCombos: "集計編成",
    trackedCombosValue: (count: string) => count,
    totalSample: "累積サンプル",
    totalSampleValue: (count: string) => `${count}試合`,
    leaderTitle: "シーズン首位",
    leaderPatchCount: (count: number, total: number) => `${count}/${total}パッチで上位`,
    integrated: "統合集計",
    seasonAverageRp: "シーズン平均RP",
    preparing: "シーズン累積編成データを準備中です。",
    basisKicker: "データ基準",
    basisTitle: "公式APIに基づくシーズン累積集計です。",
    basisBody:
      "ミスリル、メテオライト、ダイヤモンド、上位1000位のランク帯を統合し、平均RPで編成を並べています。武器統合集計が必要なキャラクターは単一行にまとめています。",
    back: "メタ分析へ戻る",
    nonKoSummary:
      "詳細行の名称は韓国語ソースデータに基づくため、このローカライズ版では未翻訳行を出さずにシーズン指標を表示します。",
  },
  "zh-Hans": {
    emptyTitle: "第 10 赛季回顾",
    emptyBody: "数据正在准备中，请稍后再查看。",
    kicker: "第 10 赛季最终记录",
    tierScope: "秘银以上汇总",
    title: "第 10 赛季回顾",
    trackedPatches: "追踪版本",
    trackedPatchesValue: (count: number) => `${count}`,
    trackedCombos: "汇总阵容",
    trackedCombosValue: (count: string) => count,
    totalSample: "累计样本",
    totalSampleValue: (count: string) => `${count} 场`,
    leaderTitle: "赛季第一",
    leaderPatchCount: (count: number, total: number) => `${count}/${total} 个版本进入前列`,
    integrated: "合并统计",
    seasonAverageRp: "赛季平均 RP",
    preparing: "赛季累计阵容数据正在准备中。",
    basisKicker: "数据基准",
    basisTitle: "基于官方 API 的赛季累计统计。",
    basisBody:
      "汇总秘银、陨石、钻石和前 1000 名分段，并按平均 RP 对阵容排序。需要合并武器统计的角色会合并为单行。",
    back: "返回 Meta 分析",
    nonKoSummary:
      "详细行名称基于韩文源数据，因此本地化页面只显示赛季级指标，不展示未翻译的源数据行。",
  },
  "zh-Hant": {
    emptyTitle: "第 10 賽季回顧",
    emptyBody: "資料正在準備中，請稍後再查看。",
    kicker: "第 10 賽季最終紀錄",
    tierScope: "秘銀以上彙總",
    title: "第 10 賽季回顧",
    trackedPatches: "追蹤版本",
    trackedPatchesValue: (count: number) => `${count}`,
    trackedCombos: "彙總陣容",
    trackedCombosValue: (count: string) => count,
    totalSample: "累計樣本",
    totalSampleValue: (count: string) => `${count} 場`,
    leaderTitle: "賽季第一",
    leaderPatchCount: (count: number, total: number) => `${count}/${total} 個版本進入前列`,
    integrated: "合併統計",
    seasonAverageRp: "賽季平均 RP",
    preparing: "賽季累計陣容資料正在準備中。",
    basisKicker: "資料基準",
    basisTitle: "基於官方 API 的賽季累計統計。",
    basisBody:
      "彙總秘銀、隕石、鑽石和前 1000 名分段，並按平均 RP 對陣容排序。需要合併武器統計的角色會合併為單行。",
    back: "返回 Meta 分析",
    nonKoSummary:
      "詳細行名稱基於韓文來源資料，因此本地化頁面只顯示賽季級指標，不展示未翻譯的來源資料列。",
  },
} as const;

function formatMetricNumber(value: number) {
  if (!Number.isFinite(value) || value <= 0) return "0";
  return new Intl.NumberFormat("en-US").format(Math.round(value));
}

function HeroMetricCard({
  icon,
  label,
  value,
  tone = "default",
}: {
  icon: ReactNode;
  label: string;
  value: string;
  tone?: "default" | "gold" | "blue";
}) {
  const isAccent = tone !== "default";
  const iconTone = isAccent
    ? "border-[var(--color-accent)] bg-[var(--color-accent-muted)] text-[var(--color-accent-foreground)]"
    : "border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-foreground)]";

  return (
    <div
      className="metric-card flex min-h-[118px] flex-col gap-4 px-4 py-4 sm:min-h-[150px] sm:gap-6 sm:px-5 sm:py-5"
      data-accent={isAccent ? "true" : undefined}
    >
      <div
        className={cn(
          "flex h-9 w-9 items-center justify-center rounded-md border sm:h-10 sm:w-10",
          iconTone
        )}
      >
        {icon}
      </div>
      <div>
        <p className="metric-value text-[1.45rem] sm:text-[1.95rem]">{value}</p>
        <p className="mt-1 text-xs text-[var(--color-muted-foreground)] sm:text-sm">{label}</p>
      </div>
    </div>
  );
}

function LeaderCard({
  characterCode,
  averageRP,
  topAppearances,
  totalPatches,
  copy,
  name,
  weaponName,
}: {
  characterCode: number;
  averageRP: number;
  topAppearances: number;
  totalPatches: number;
  copy: (typeof COPY)[RouteLocale];
  name: string;
  weaponName: string;
}) {
  const imageUrl = getCharacterImageUrl(characterCode);

  return (
    <div
      className="metric-card col-span-2 flex min-h-[132px] items-center gap-4 px-4 py-4 sm:min-h-[150px] sm:px-5 sm:py-5"
      data-accent="true"
    >
      <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-md border border-[var(--color-border)] bg-[var(--color-surface-2)] sm:h-20 sm:w-20">
        <Image src={imageUrl} alt={name} fill className="object-cover" sizes="80px" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-[var(--color-accent-foreground)]">
            <Trophy className="h-3.5 w-3.5" strokeWidth={2} />
            {copy.leaderTitle}
          </span>
          <span className="text-[11px] font-medium text-[var(--color-muted-foreground)]">
            {copy.leaderPatchCount(topAppearances, totalPatches)}
          </span>
        </div>
        <p className="mt-3 truncate text-[1.1rem] font-bold text-[var(--color-foreground)] sm:text-[1.35rem]">
          {name}
        </p>
        <p className="mt-1 text-sm text-[var(--color-muted-foreground)]">{weaponName}</p>
      </div>
      <div className="shrink-0 text-right">
        <p className="text-[1.35rem] font-bold text-[var(--color-accent-foreground)] sm:text-[1.7rem]">
          +{averageRP.toFixed(1)}
        </p>
        <p className="mt-1 text-[11px] text-[var(--color-muted-foreground)] sm:text-sm">
          {copy.seasonAverageRp}
        </p>
      </div>
    </div>
  );
}

export default async function SeasonRecapPage({ locale = "ko" }: { locale?: RouteLocale }) {
  const copy = COPY[locale] ?? COPY.ko;
  const l10n = loadL10nMap(LANGUAGE_BY_ROUTE_LOCALE[locale]);
  const fallbackMap = buildFallbackMap();
  const { patches, perPatchTop, seasonTop, roleStats } = await getSeasonRecapData();

  if (patches.length === 0) {
    return (
      <main className="page-shell flex flex-col gap-5 lg:gap-6">
        <section className="dashboard-panel p-8 text-center">
          <h1 className="dashboard-section-title text-xl font-bold text-[var(--color-foreground)]">
            {copy.emptyTitle}
          </h1>
          <p className="mt-2 text-sm text-[var(--color-muted-foreground)]">{copy.emptyBody}</p>
        </section>
      </main>
    );
  }

  const firstPatch = patches[0];
  const lastPatch = patches[patches.length - 1];
  const trackedCombos = seasonTop.length;
  const totalMatches = seasonTop.reduce((sum, row) => sum + row.totalGames, 0);
  const leader = seasonTop[0] ?? null;

  return (
    <main className="page-shell flex flex-col gap-5 lg:gap-6">
      <section className="dashboard-panel px-4 py-4 lg:px-5">
        <div className="grid gap-3 xl:grid-cols-[minmax(0,1.08fr)_minmax(340px,0.92fr)]">
          <div className="flex flex-col justify-center">
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="inline-flex items-center gap-1.5 text-xs font-medium text-[var(--color-muted-foreground)]">
                <Trophy className="h-3.5 w-3.5" strokeWidth={2} />
                {copy.kicker}
              </span>
              <span className="text-xs font-medium text-[var(--color-muted-foreground)]">
                {firstPatch} → {lastPatch}
              </span>
              <span className="text-xs font-medium text-[var(--color-muted-foreground)]">
                {copy.tierScope}
              </span>
            </div>

            <h1 className="dashboard-section-title mt-2 text-xl font-bold leading-tight text-[var(--color-foreground)] sm:text-2xl">
              {copy.title}
            </h1>
            <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-[var(--color-muted-foreground)] sm:text-sm">
              <span className="rounded border border-[var(--color-accent)] bg-[var(--color-accent-muted)] px-2.5 py-1 font-semibold text-[var(--color-accent-foreground)]">
                {copy.trackedPatches} {copy.trackedPatchesValue(patches.length)}
              </span>
              <span className="rounded border border-[var(--color-border)] bg-[var(--color-surface)] px-2.5 py-1">
                {copy.trackedCombos} {copy.trackedCombosValue(formatMetricNumber(trackedCombos))}
              </span>
              <span className="rounded border border-[var(--color-border)] bg-[var(--color-surface)] px-2.5 py-1">
                {copy.totalSample} {copy.totalSampleValue(formatMetricNumber(totalMatches))}
              </span>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <HeroMetricCard
              icon={<Layers3 className="h-5 w-5" strokeWidth={2} />}
              label={copy.trackedPatches}
              value={copy.trackedPatchesValue(patches.length)}
              tone="blue"
            />
            <HeroMetricCard
              icon={<Database className="h-5 w-5" strokeWidth={2} />}
              label={copy.trackedCombos}
              value={copy.trackedCombosValue(formatMetricNumber(trackedCombos))}
            />
            <HeroMetricCard
              icon={<BarChart3 className="h-5 w-5" strokeWidth={2} />}
              label={copy.totalSample}
              value={copy.totalSampleValue(formatMetricNumber(totalMatches))}
              tone="gold"
            />
            {leader ? (
              <LeaderCard
                characterCode={leader.characterNum}
                averageRP={leader.averageRP}
                topAppearances={leader.topAppearances}
                totalPatches={patches.length}
                copy={copy}
                name={resolveCharacterName(leader.characterNum, l10n, fallbackMap)}
                weaponName={
                  leader.bestWeapon > 0
                    ? resolveWeaponName(leader.bestWeapon, l10n)
                    : copy.integrated
                }
              />
            ) : (
              <div className="metric-card col-span-2 flex min-h-[132px] items-center justify-center px-4 py-4 text-sm text-[var(--color-muted-foreground)] sm:min-h-[150px] sm:px-5 sm:py-5">
                {copy.preparing}
              </div>
            )}
          </div>
        </div>
      </section>

      {locale === "ko" ? (
        <>
          <PatchTimelineBlock perPatchTop={perPatchTop} />
          <RoleStrengthBlock roleStats={roleStats} patches={patches} />
          <SeasonHallOfFameBlock
            entries={seasonTop}
            totalPatches={patches.length}
            patches={patches}
          />
        </>
      ) : (
        <section className="dashboard-panel p-4 lg:p-6 xl:p-7">
          <p className="text-sm leading-6 text-[var(--color-muted-foreground)]">
            {copy.nonKoSummary}
          </p>
        </section>
      )}

      <section className="dashboard-panel p-4 lg:p-6 xl:p-7">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-[11px] font-semibold text-[var(--color-muted-foreground)]">
              {copy.basisKicker}
            </p>
            <p className="dashboard-section-title mt-2 text-sm text-[var(--color-foreground)]">
              {copy.basisTitle}
            </p>
            <p className="mt-1 text-xs leading-6 text-[var(--color-muted-foreground)] sm:text-sm">
              {copy.basisBody}
            </p>
          </div>
          <Link
            href="/"
            className="dashboard-tab inline-flex items-center justify-center px-3 py-2 text-sm font-medium"
          >
            {copy.back}
          </Link>
        </div>
      </section>
    </main>
  );
}
