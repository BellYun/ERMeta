import { ArrowRight, BarChart3, Database, Layers3, Trophy } from "lucide-react";
import type { Metadata } from "next";
import type { ReactNode } from "react";
import { BalancePatchResponseBlock } from "@/app/season10-recap/BalancePatchResponseBlock";
import { NewCharacterReportBlock } from "@/app/season10-recap/NewCharacterReportBlock";
import { PatchTimelineBlock } from "@/app/season10-recap/PatchTimelineBlock";
import { RoleStrengthBlock } from "@/app/season10-recap/RoleStrengthBlock";
import { SeasonHallOfFameBlock } from "@/app/season10-recap/SeasonHallOfFameBlock";
import { Link } from "@/i18n/navigation";
import type { RouteLocale } from "@/i18n/routing";
import { getSeasonRecapData } from "@/lib/seasonRecap";
import { BASE_URL } from "@/lib/siteMetadata";
import { cn } from "@/lib/utils";

export function getSeasonRecapMetadata(seasonNumber: number, socialImagePath?: string): Metadata {
  const pathname = `/season${seasonNumber}-recap`;
  const title = `시즌 ${seasonNumber} 리캡`;
  const socialImage = socialImagePath
    ? {
        url: new URL(socialImagePath, BASE_URL).toString(),
        width: 1733,
        height: 907,
        alt: title,
      }
    : undefined;

  return {
    metadataBase: new URL(BASE_URL),
    title: `${title} - 마지막 메타 기록`,
    description: `이터널리턴 시즌 ${seasonNumber} 마무리. 패치별 평균 RP 주요 조합과 시즌 누적 평균 RP 전체 랭킹. 다이아 이상 기준.`,
    alternates: { canonical: pathname },
    openGraph: {
      title,
      description: "패치별 평균 RP 주요 조합 + 시즌 누적 전체 랭킹",
      url: pathname,
      images: socialImage ? [socialImage] : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description: "패치별 평균 RP 주요 조합 + 시즌 누적 전체 랭킹",
      images: socialImage ? [socialImage.url] : undefined,
    },
  };
}

export const metadata = getSeasonRecapMetadata(10);

export const revalidate = 86400;

const COPY = {
  ko: {
    emptyTitle: "시즌 10 리캡",
    emptyBody: "현재 표시할 시즌 데이터가 없습니다.",
    kicker: "시즌 10 마무리",
    tierScope: "다이아 이상 집계",
    title: "시즌 10 리캡",
    trackedPatches: "추적 패치",
    trackedPatchesValue: (count: number) => `${count}개`,
    trackedCombos: "집계 조합",
    trackedCombosValue: (count: string) => `${count}개`,
    totalSample: "누적 표본",
    totalSampleValue: (count: string) => `${count}판`,
    basisKicker: "데이터 기준",
    basisTitle: "공식 API 기반 시즌 누적 집계입니다.",
    basisBody:
      "다이아몬드 이상 티어 통합 통계이며, 평균 RP 획득량 기준으로 정렬했습니다. 알렉스처럼 무기 통합 집계가 필요한 캐릭터는 단일 조합으로 합산했습니다.",
    back: "메타 분석으로 돌아가기",
    nonKoSummary:
      "This localized overview highlights the season-level metrics and leading compositions.",
  },
  en: {
    emptyTitle: "Season 10 Recap",
    emptyBody: "Data is being prepared. Please check again later.",
    kicker: "Season 10 closing record",
    tierScope: "Diamond+ aggregate",
    title: "Season 10 Recap",
    trackedPatches: "Tracked patches",
    trackedPatchesValue: (count: number) => `${count}`,
    trackedCombos: "Tracked teams",
    trackedCombosValue: (count: string) => count,
    totalSample: "Total sample",
    totalSampleValue: (count: string) => `${count} games`,
    basisKicker: "Data Basis",
    basisTitle: "Season aggregate based on official API data.",
    basisBody:
      "The recap combines Diamond and higher ranked tiers, then sorts teams by average RP. Weapon-agnostic characters are merged into a single aggregate row.",
    back: "Back to Meta Analysis",
    nonKoSummary: "This localized page focuses on season-level metrics and leading compositions.",
  },
  ja: {
    emptyTitle: "シーズン10リキャップ",
    emptyBody: "データを準備中です。しばらくしてから再度ご確認ください。",
    kicker: "シーズン10最終記録",
    tierScope: "ダイヤ以上集計",
    title: "シーズン10リキャップ",
    trackedPatches: "追跡パッチ",
    trackedPatchesValue: (count: number) => `${count}`,
    trackedCombos: "集計編成",
    trackedCombosValue: (count: string) => count,
    totalSample: "累積サンプル",
    totalSampleValue: (count: string) => `${count}試合`,
    basisKicker: "データ基準",
    basisTitle: "公式APIに基づくシーズン累積集計です。",
    basisBody:
      "ダイヤモンド以上のランク帯を統合し、平均RPで編成を並べています。武器統合集計が必要なキャラクターは単一行にまとめています。",
    back: "メタ分析へ戻る",
    nonKoSummary:
      "詳細行の名称は韓国語ソースデータに基づくため、このローカライズ版では未翻訳行を出さずにシーズン指標を表示します。",
  },
  "zh-Hans": {
    emptyTitle: "第 10 赛季回顾",
    emptyBody: "数据正在准备中，请稍后再查看。",
    kicker: "第 10 赛季最终记录",
    tierScope: "钻石以上汇总",
    title: "第 10 赛季回顾",
    trackedPatches: "追踪版本",
    trackedPatchesValue: (count: number) => `${count}`,
    trackedCombos: "汇总阵容",
    trackedCombosValue: (count: string) => count,
    totalSample: "累计样本",
    totalSampleValue: (count: string) => `${count} 场`,
    basisKicker: "数据基准",
    basisTitle: "基于官方 API 的赛季累计统计。",
    basisBody: "汇总钻石以上分段，并按平均 RP 对阵容排序。需要合并武器统计的角色会合并为单行。",
    back: "返回 Meta 分析",
    nonKoSummary:
      "详细行名称基于韩文源数据，因此本地化页面只显示赛季级指标，不展示未翻译的源数据行。",
  },
  "zh-Hant": {
    emptyTitle: "第 10 賽季回顧",
    emptyBody: "資料正在準備中，請稍後再查看。",
    kicker: "第 10 賽季最終紀錄",
    tierScope: "鑽石以上彙總",
    title: "第 10 賽季回顧",
    trackedPatches: "追蹤版本",
    trackedPatchesValue: (count: number) => `${count}`,
    trackedCombos: "彙總陣容",
    trackedCombosValue: (count: string) => count,
    totalSample: "累計樣本",
    totalSampleValue: (count: string) => `${count} 場`,
    basisKicker: "資料基準",
    basisTitle: "基於官方 API 的賽季累計統計。",
    basisBody: "彙總鑽石以上分段，並按平均 RP 對陣容排序。需要合併武器統計的角色會合併為單行。",
    back: "返回 Meta 分析",
    nonKoSummary:
      "詳細行名稱基於韓文來源資料，因此本地化頁面只顯示賽季級指標，不展示未翻譯的來源資料列。",
  },
} as const;

function getSeasonCopy(locale: RouteLocale, seasonNumber: number) {
  const copy = COPY[locale] ?? COPY.ko;
  const replaceSeasonNumber = (value: string) => value.replace("10", String(seasonNumber));

  return {
    ...copy,
    emptyTitle: replaceSeasonNumber(copy.emptyTitle),
    kicker: replaceSeasonNumber(copy.kicker),
    title: replaceSeasonNumber(copy.title),
  };
}

function formatMetricNumber(value: number) {
  if (!Number.isFinite(value) || value <= 0) return "0";
  return new Intl.NumberFormat("en-US").format(Math.round(value));
}

function HeroMetricCard({
  icon,
  label,
  value,
  tone = "default",
  className,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  tone?: "default" | "gold" | "blue";
  className?: string;
}) {
  const isAccent = tone !== "default";
  const iconTone = isAccent
    ? "border-[var(--color-accent)] bg-[var(--color-accent-muted)] text-[var(--color-accent-foreground)]"
    : "border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-foreground)]";

  return (
    <div
      className={cn(
        "metric-card flex min-h-[96px] flex-col gap-3 px-3.5 py-3.5 sm:min-h-[112px] sm:px-4",
        className
      )}
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
        <p className="metric-value text-[1.3rem] sm:text-[1.65rem]">{value}</p>
        <p className="mt-1 text-xs text-[var(--color-muted-foreground)] sm:text-sm">{label}</p>
      </div>
    </div>
  );
}

const RECAP_SECTION_LINKS = [
  { href: "#season-recap-patches", index: "01", label: "패치 흐름" },
  { href: "#season-recap-roles", index: "02", label: "직업군 흐름" },
  { href: "#season-recap-balance-response", index: "03", label: "패치 반응" },
  { href: "#season-recap-new-characters", index: "04", label: "신규 캐릭터" },
  { href: "#season-recap-ranking", index: "05", label: "시즌 랭킹" },
] as const;

function SeasonRecapSectionNav({ seasonNumber }: { seasonNumber: number }) {
  return (
    <nav
      aria-label={`시즌 ${seasonNumber} 리캡 섹션`}
      className="metric-card col-span-2 flex min-h-[112px] flex-col justify-between px-4 py-4"
      data-accent="true"
    >
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--color-accent-foreground)]">
            리캡 목차
          </p>
          <p className="mt-1 text-sm font-bold text-[var(--color-foreground)]">
            원하는 분석으로 바로 이동
          </p>
        </div>
        <span className="shrink-0 font-mono text-[10px] font-semibold text-[var(--color-muted-foreground)]">
          SEASON {seasonNumber}
        </span>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-[var(--color-border)] pt-3">
        {RECAP_SECTION_LINKS.map((item) => (
          <a
            key={item.href}
            href={item.href}
            className="group inline-flex items-center gap-1.5 text-xs font-bold text-[var(--color-muted-foreground)] transition-colors hover:text-[var(--color-accent-foreground)]"
          >
            <span className="font-mono text-[9px] text-[var(--color-accent-foreground)]">
              {item.index}
            </span>
            <span>{item.label}</span>
            <ArrowRight
              className="h-3 w-3 opacity-45 transition-transform group-hover:translate-x-0.5 group-hover:opacity-100"
              strokeWidth={2}
            />
          </a>
        ))}
      </div>
    </nav>
  );
}

export default async function SeasonRecapPage({
  locale = "ko",
  seasonNumber = 10,
}: {
  locale?: RouteLocale;
  seasonNumber?: number;
}) {
  const copy = getSeasonCopy(locale, seasonNumber);
  const { patches, perPatchTop, seasonTop, roleStatsByTier, tierRpTrends } =
    await getSeasonRecapData(seasonNumber);

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

  return (
    <main className="page-shell flex flex-col gap-5 lg:gap-6">
      <section
        id="season-recap-summary"
        className="dashboard-panel scroll-mt-24 px-4 py-4 lg:scroll-mt-20 lg:px-5"
      >
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
              className={locale === "ko" ? undefined : "sm:col-span-2"}
            />
            {locale === "ko" ? <SeasonRecapSectionNav seasonNumber={seasonNumber} /> : null}
          </div>
        </div>
      </section>

      {locale === "ko" ? (
        <>
          <PatchTimelineBlock perPatchTop={perPatchTop} />
          <RoleStrengthBlock
            roleStatsByTier={roleStatsByTier}
            patches={patches}
            benchmarks={tierRpTrends}
          />
          <BalancePatchResponseBlock entries={seasonTop} patches={patches} trends={tierRpTrends} />
          <NewCharacterReportBlock entries={seasonTop} benchmarks={tierRpTrends} />
          <SeasonHallOfFameBlock
            entries={seasonTop}
            totalPatches={patches.length}
            patches={patches}
            tierRpTrends={tierRpTrends}
          />
        </>
      ) : (
        <section className="dashboard-panel p-4">
          <p className="text-sm leading-6 text-[var(--color-muted-foreground)]">
            {copy.nonKoSummary}
          </p>
        </section>
      )}

      <section id="season-recap-basis" className="dashboard-panel scroll-mt-24 p-4 lg:scroll-mt-20">
        <div className="home-section-header flex flex-col gap-2 pb-3 sm:flex-row sm:items-start sm:justify-between">
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
