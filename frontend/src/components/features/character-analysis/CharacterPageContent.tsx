import { readFileSync } from "node:fs";
import path from "node:path";
import { ArrowRight, BarChart3, GitBranch, Info, TrendingUp } from "lucide-react";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Suspense } from "react";
import type { CharacterStatsResponse } from "@/app/api/character/stats/[characterCode]/route";
import {
  ADSENSE_SLOT_RESERVATIONS,
  ADSENSE_SLOTS,
  canRenderAdSlot,
} from "@/components/ads/adsenseConfig";
import { AdSlot } from "@/components/ads/AdSlot";
import { CharacterAnalysisClient } from "@/components/features/CharacterAnalysisClient";
import type { ComboEntry, LabCharacter, LabData } from "@/components/features/lab/types";
import { SectionErrorBoundary } from "@/components/features/SectionErrorBoundary";
import { LANGUAGE_BY_ROUTE_LOCALE, type RouteLocale } from "@/i18n/routing";
import {
  getCharacterAffinityGroupName,
  getCharacterAffinityProfiles,
  getCharacterAffinitySubtype,
  getCharacterAffinityTypeMembers,
  getCharacterRisingCompositions,
} from "@/lib/characterAffinity";
import {
  buildCharacterInsight,
  type CharacterInsight,
  type CharacterRoleComboInsight,
} from "@/lib/characterInsights";
import {
  buildFallbackMap,
  getComboRoles,
  resolveCharacterName,
  type CharacterRole,
} from "@/lib/characterMap";
import { getPatchAnalysisVersions } from "@/lib/patchAnalysis";
import { localizeRoutePath } from "@/lib/seoLocales";
import { loadL10nMap } from "@/lib/serverL10n";
import { BASE_URL } from "@/lib/siteMetadata";
import { resolveWeaponName } from "@/lib/weaponMap";

interface CharacterPageContentProps {
  locale: RouteLocale;
  code: number;
  patches: string[];
  initialStats: CharacterStatsResponse | null;
  initialPrevStats: CharacterStatsResponse | null;
}

function CharacterAnalysisFallback() {
  return (
    <div className="flex flex-col gap-5 sm:gap-6">
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.35fr)_340px]">
        <section className="dashboard-panel p-3.5 sm:p-4 lg:p-5">
          <div>
            <div className="h-40 rounded-md bg-[var(--color-surface-2)] sm:h-48" />
          </div>
        </section>
        <section className="dashboard-panel p-3.5 sm:p-4 lg:p-5">
          <div>
            <div className="h-48 rounded-md bg-[var(--color-surface-2)]" />
          </div>
        </section>
      </div>

      <div className="grid gap-5 xl:grid-cols-2">
        <section className="dashboard-panel p-3.5 sm:p-4 lg:p-5">
          <div>
            <div className="mb-4 h-6 w-28 rounded bg-[var(--color-surface-2)]" />
            <div className="h-64 rounded-md bg-[var(--color-surface-2)]" />
          </div>
        </section>
        <section className="dashboard-panel p-3.5 sm:p-4 lg:p-5">
          <div>
            <div className="mb-4 h-6 w-24 rounded bg-[var(--color-surface-2)]" />
            <div className="h-64 rounded-md bg-[var(--color-surface-2)]" />
          </div>
        </section>
        <section className="dashboard-panel p-3.5 sm:p-4 lg:p-5 xl:col-span-2">
          <div>
            <div className="mb-4 h-6 w-16 rounded bg-[var(--color-surface-2)]" />
            <div className="h-80 rounded-md bg-[var(--color-surface-2)]" />
          </div>
        </section>
      </div>
    </div>
  );
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("en-US").format(Math.round(value));
}

function formatTierLabel(locale: RouteLocale, tier: string) {
  if (tier === "MITHRIL_PLUS") {
    if (locale === "ja") return "ミスリル以上";
    if (locale === "ko") return "미스릴+";
    if (locale === "zh-Hans") return "秘银以上";
    if (locale === "zh-Hant") return "秘銀以上";
    return "Mithril+";
  }
  if (tier === "METEORITE_PLUS") {
    if (locale === "ja") return "メテオライト以上";
    if (locale === "ko") return "메테오라이트 이상";
    if (locale === "zh-Hans") return "陨石以上";
    if (locale === "zh-Hant") return "隕石以上";
    return "Meteorite+";
  }
  if (tier === "DIAMOND_PLUS") {
    if (locale === "ja") return "ダイヤ以上";
    if (locale === "ko") return "다이아 이상";
    if (locale === "zh-Hans") return "钻石以上";
    if (locale === "zh-Hant") return "鑽石以上";
    return "Diamond+";
  }
  return tier;
}

function getSummaryTitle(locale: RouteLocale) {
  if (locale === "ja") return "現在のパッチ概要";
  if (locale === "ko") return "현재 패치 요약";
  if (locale === "zh-Hans") return "当前版本摘要";
  if (locale === "zh-Hant") return "目前版本摘要";
  return "Current Patch Summary";
}

const ROLE_TO_LAB_SLUG: Record<CharacterRole, string> = {
  탱커: "tanks",
  전사: "warriors",
  암살자: "assassins",
  스킬딜러: "skilldealers",
  "원거리 딜러": "rangers",
  지원가: "supports",
};

const ALL_LAB_SLUGS = [
  "tanks",
  "warriors",
  "assassins",
  "skilldealers",
  "rangers",
  "supports",
] as const;

function formatSignedRp(value: number) {
  return `${value >= 0 ? "+" : ""}${value.toFixed(1)} RP`;
}

const labDataCache = new Map<string, LabData | null>();

function loadLabData(slug: string): LabData | null {
  const cached = labDataCache.get(slug);
  if (cached !== undefined) return cached;

  try {
    const filePath = path.join(process.cwd(), "public", "data", "lab", `${slug}.json`);
    const data = JSON.parse(readFileSync(filePath, "utf8")) as LabData;
    labDataCache.set(slug, data);
    return data;
  } catch {
    labDataCache.set(slug, null);
    return null;
  }
}

function findRoleComboCharacter(characterCode: number, weapon: number | null): LabCharacter | null {
  if (weapon == null) return null;

  const roles = getComboRoles(characterCode, weapon);
  const preferredSlugs = roles.map((role) => ROLE_TO_LAB_SLUG[role]).filter(Boolean);
  const slugs = [...new Set([...preferredSlugs, ...ALL_LAB_SLUGS])];

  for (const slug of slugs) {
    const data = loadLabData(slug);
    const found = data?.characters.find(
      (item) =>
        Number(item.characterCode) === Number(characterCode) &&
        Number(item.weapon) === Number(weapon)
    );
    if (found) return found;
  }

  return null;
}

function splitRoles(multiset: string) {
  return multiset
    .split("+")
    .map((role) => role.trim())
    .filter(Boolean);
}

function summarizePositiveRoles(entries: ComboEntry[], ownRoles: CharacterRole[]) {
  const totals = new Map<string, number>();

  for (const entry of entries) {
    if (entry.delta <= 0) continue;
    const roles = splitRoles(entry.multiset);
    for (const ownRole of ownRoles) {
      const index = roles.indexOf(ownRole);
      if (index >= 0) roles.splice(index, 1);
    }
    for (const role of roles) {
      totals.set(role, (totals.get(role) ?? 0) + entry.games);
    }
  }

  return [...totals.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([role, games]) => ({ role, games }));
}

function buildRoleComboInsight(
  locale: RouteLocale,
  characterName: string,
  data: LabCharacter | null,
  ownRoles: CharacterRole[]
): CharacterRoleComboInsight | null {
  if (!data) return null;

  const positiveEntries = data.strong.filter((entry) => entry.delta > 0);
  if (positiveEntries.length === 0) return null;

  const topEntries = positiveEntries.slice(0, 2);
  const frequentRoles = summarizePositiveRoles(positiveEntries, ownRoles);
  if (locale !== "ko") {
    const roleText = frequentRoles.map((item) => item.role).join(", ");
    const comboText = topEntries
      .map((entry) => `${entry.multiset} (${formatSignedRp(entry.delta)})`)
      .join(" and ");

    return {
      pickReason: `${characterName} performs better when the draft already contains ${roleText || "one of the positive-RP partner roles"}.\n\nThe positive-RP role-combo evidence is ${comboText}.`,
    };
  }

  const roleText =
    frequentRoles.length > 0
      ? frequentRoles.map((item) => item.role).join(", ")
      : "양전 조합에 자주 나온 역할군";
  const comboText = topEntries
    .map((entry) => `${entry.multiset}(${formatSignedRp(entry.delta)})`)
    .join(", ");

  return {
    pickReason: `${characterName}는 팀에 ${roleText} 역할군이 있을 때 RP가 높게 나왔습니다.\n\n역할 조합별 RP에서 ${comboText} 조합이 양전으로 확인됩니다.`,
  };
}

function buildServerSummary(
  locale: RouteLocale,
  code: number,
  stats: CharacterStatsResponse | null
) {
  if (!stats || stats.totalGames <= 0) return null;

  const language = LANGUAGE_BY_ROUTE_LOCALE[locale];
  const l10n = loadL10nMap(language);
  const name = resolveCharacterName(code, l10n, buildFallbackMap());
  const topWeapon = stats.weapons[0] ?? null;
  const topWeaponName = topWeapon ? resolveWeaponName(topWeapon.bestWeapon, l10n) : null;
  const sample = formatNumber(stats.totalGames);
  const winRate = stats.winRate.toFixed(1);
  const pickRate = stats.pickRate.toFixed(1);
  const averageRp = stats.averageRP.toFixed(1);
  const top3Rate = stats.top3Rate.toFixed(1);
  const tierLabel = formatTierLabel(locale, stats.tier);

  if (locale === "ja") {
    return `${name}はパッチ${stats.patchVersion}の${tierLabel}基準で${sample}試合の標本があります。勝率は${winRate}%、ピック率は${pickRate}%、平均RPは${averageRp}、入賞率は${top3Rate}%です。${
      topWeaponName
        ? `最も多く使われた武器は${topWeaponName}で、武器別成績と前パッチ比較を下に表示しています。`
        : "武器別成績と前パッチ比較を下に表示しています。"
    }`;
  }

  if (locale !== "ko") {
    return `${name} has a ${sample}-match sample on patch ${stats.patchVersion} in ${tierLabel}. The current win rate is ${winRate}%, pick rate is ${pickRate}%, average RP is ${averageRp}, and placement rate is ${top3Rate}%. ${
      topWeaponName
        ? `The most played weapon is ${topWeaponName}, with weapon performance and patch comparison available in the analysis below.`
        : "Weapon performance and patch comparison are available in the analysis below."
    }`;
  }

  return `${name}는 패치 ${stats.patchVersion} ${tierLabel} 기준 ${sample}판 표본에서 승률 ${winRate}%, 픽률 ${pickRate}%, 평균 RP ${averageRp}, 순방률 ${top3Rate}%를 기록했습니다. ${
    topWeaponName
      ? `가장 많이 선택된 무기는 ${topWeaponName}이며, 아래에 무기별 성과와 이전 패치 대비 변화를 표시합니다.`
      : "아래에 무기별 성과와 이전 패치 대비 변화를 표시합니다."
  }`;
}

function formatPercent(value: number) {
  return `${value.toFixed(1)}%`;
}

function buildCharacterSeoJsonLd(
  locale: RouteLocale,
  code: number,
  characterName: string,
  stats: CharacterStatsResponse,
  topWeaponName: string | null
) {
  const path = localizeRoutePath(`/character/${code}`, locale);
  const inLanguage = locale === "ja" ? "ja-JP" : locale === "ko" ? "ko-KR" : "en-US";

  return {
    "@context": "https://schema.org",
    "@type": "Dataset",
    name:
      locale === "ko"
        ? `${characterName} 이터널리턴 ${stats.patchVersion} 통계`
        : `${characterName} Eternal Return ${stats.patchVersion} stats`,
    description:
      locale === "ko"
        ? `${characterName}의 승률, 픽률, 평균 RP, 무기, 조합 데이터입니다.`
        : `${characterName} win rate, pick rate, average RP, recommended weapon, and team composition stats.`,
    url: `${BASE_URL}${path}`,
    inLanguage,
    keywords: [
      characterName,
      "Eternal Return",
      "이터널리턴",
      "build",
      "traits",
      "weapon",
      stats.patchVersion,
      topWeaponName,
    ].filter(Boolean),
    variableMeasured: [
      { "@type": "PropertyValue", name: "Win rate", value: formatPercent(stats.winRate) },
      { "@type": "PropertyValue", name: "Pick rate", value: formatPercent(stats.pickRate) },
      { "@type": "PropertyValue", name: "Average RP", value: stats.averageRP.toFixed(1) },
      { "@type": "PropertyValue", name: "Placement rate", value: formatPercent(stats.top3Rate) },
      { "@type": "PropertyValue", name: "Sample size", value: stats.totalGames },
      ...(topWeaponName
        ? [{ "@type": "PropertyValue", name: "Main weapon", value: topWeaponName }]
        : []),
    ],
  };
}

function CharacterSeoSection({
  locale,
  code,
  stats,
}: {
  locale: RouteLocale;
  code: number;
  stats: CharacterStatsResponse;
}) {
  if (stats.totalGames <= 0) return null;

  const language = LANGUAGE_BY_ROUTE_LOCALE[locale];
  const l10n = loadL10nMap(language);
  const characterName = resolveCharacterName(code, l10n, buildFallbackMap());
  const topWeapon = stats.weapons[0] ?? null;
  const topWeaponName = topWeapon ? resolveWeaponName(topWeapon.bestWeapon, l10n) : null;
  const tierLabel = formatTierLabel(locale, stats.tier);
  const patchAnalysisVersion = getPatchAnalysisVersions()[0] ?? null;
  const patchHref = localizeRoutePath(
    patchAnalysisVersion ? `/patch-analysis/${patchAnalysisVersion}` : "/patch-analysis",
    locale
  );
  const labHref = localizeRoutePath("/character-lab", locale);
  const jsonLd = buildCharacterSeoJsonLd(locale, code, characterName, stats, topWeaponName);

  const copy =
    locale === "ko"
      ? {
          eyebrow: "검색 요약",
          title: `${characterName} 빌드/특성/무기 통계`,
          body: `${characterName}는 패치 ${stats.patchVersion} ${tierLabel} 기준 승률 ${formatPercent(
            stats.winRate
          )}, 픽률 ${formatPercent(stats.pickRate)}, 평균 RP ${stats.averageRP.toFixed(
            1
          )}를 기록했습니다. 무기, 특성, 장비 빌드는 표본 수와 함께 표시됩니다.`,
          weapon: "주 사용 무기",
          noWeapon: "무기 표본 확인 중",
          winRate: "승률",
          pickRate: "픽률",
          averageRp: "평균 RP",
          sample: "분석 표본",
          sampleSuffix: "판",
          actionTitle: "연결 데이터",
          patch: patchAnalysisVersion ? `${patchAnalysisVersion} 패치 분석` : "패치 분석",
          patchDesc: "제공 중인 패치 메타 분석",
          lab: "역할 비교",
          labDesc: "같은 역할군 안에서 성과 비교",
        }
      : locale === "ja"
        ? {
            eyebrow: "検索サマリー",
            title: `${characterName} ビルド・特性・武器統計`,
            body: `${characterName}はパッチ${stats.patchVersion}の${tierLabel}基準で、勝率${formatPercent(
              stats.winRate
            )}、ピック率${formatPercent(stats.pickRate)}、平均RP ${stats.averageRP.toFixed(
              1
            )}を記録しています。武器、特性、装備ビルドはサンプル数とあわせて表示します。`,
            weapon: "主な武器",
            noWeapon: "武器標本を確認中",
            winRate: "勝率",
            pickRate: "ピック率",
            averageRp: "平均RP",
            sample: "分析標本",
            sampleSuffix: "試合",
            actionTitle: "関連データ",
            patch: patchAnalysisVersion ? `パッチ${patchAnalysisVersion}分析` : "パッチ分析",
            patchDesc: "提供中のパッチメタ分析",
            lab: "ロール比較",
            labDesc: "同じロール内の成績比較",
          }
        : locale === "zh-Hans"
          ? {
              eyebrow: "搜索摘要",
              title: `${characterName} 出装、特性与武器统计`,
              body: `${characterName} 在 ${stats.patchVersion} 版本 ${tierLabel} 条件下，胜率 ${formatPercent(
                stats.winRate
              )}、选取率 ${formatPercent(stats.pickRate)}、平均 RP ${stats.averageRP.toFixed(
                1
              )}。武器、特性和装备统计会与样本数一起显示。`,
              weapon: "主要武器",
              noWeapon: "正在确认武器样本",
              winRate: "胜率",
              pickRate: "选取率",
              averageRp: "平均 RP",
              sample: "分析样本",
              sampleSuffix: "场",
              actionTitle: "相关数据",
              patch: patchAnalysisVersion ? `${patchAnalysisVersion} 版本分析` : "版本分析",
              patchDesc: "当前提供的版本 Meta 分析",
              lab: "定位比较",
              labDesc: "同一定位内的表现比较",
            }
          : locale === "zh-Hant"
            ? {
                eyebrow: "搜尋摘要",
                title: `${characterName} 出裝、特性與武器統計`,
                body: `${characterName} 在 ${stats.patchVersion} 版本 ${tierLabel} 條件下，勝率 ${formatPercent(
                  stats.winRate
                )}、選取率 ${formatPercent(stats.pickRate)}、平均 RP ${stats.averageRP.toFixed(
                  1
                )}。武器、特性和裝備統計會與樣本數一起顯示。`,
                weapon: "主要武器",
                noWeapon: "正在確認武器樣本",
                winRate: "勝率",
                pickRate: "選取率",
                averageRp: "平均 RP",
                sample: "分析樣本",
                sampleSuffix: "場",
                actionTitle: "相關資料",
                patch: patchAnalysisVersion ? `${patchAnalysisVersion} 版本分析` : "版本分析",
                patchDesc: "目前提供的版本 Meta 分析",
                lab: "定位比較",
                labDesc: "同一定位內的表現比較",
              }
            : {
                eyebrow: "Search Summary",
                title: `${characterName} Build, Traits, and Weapon Stats`,
                body: `${characterName} has a ${formatPercent(
                  stats.winRate
                )} win rate, ${formatPercent(stats.pickRate)} pick rate, and ${stats.averageRP.toFixed(
                  1
                )} average RP on patch ${stats.patchVersion} in ${tierLabel}. Weapons, traits, equipment builds, and sample size are shown below.`,
                weapon: "Main weapon",
                noWeapon: "Checking weapon samples",
                winRate: "Win rate",
                pickRate: "Pick rate",
                averageRp: "Average RP",
                sample: "Sample",
                sampleSuffix: "matches",
                actionTitle: "Related data",
                patch: patchAnalysisVersion
                  ? `Patch ${patchAnalysisVersion} analysis`
                  : "Patch analysis",
                patchDesc: "Available patch meta analysis",
                lab: "Role comparison",
                labDesc: "Compare performance in the same role",
              };

  const cards = [
    { label: copy.weapon, value: topWeaponName ?? copy.noWeapon },
    { label: copy.winRate, value: formatPercent(stats.winRate) },
    { label: copy.pickRate, value: formatPercent(stats.pickRate) },
    { label: copy.averageRp, value: stats.averageRP.toFixed(1) },
    { label: copy.sample, value: `${formatNumber(stats.totalGames)} ${copy.sampleSuffix}` },
  ];
  const links = [
    {
      href: patchHref,
      label: copy.patch,
      description: copy.patchDesc,
      Icon: TrendingUp,
      primary: true,
    },
    {
      href: labHref,
      label: copy.lab,
      description: copy.labDesc,
      Icon: GitBranch,
      primary: false,
    },
  ];

  return (
    <section className="dashboard-panel p-4 lg:p-5">
      <script
        type="application/ld+json"
        suppressHydrationWarning
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(280px,360px)] lg:items-start">
        <div>
          <p className="text-xs font-medium text-[var(--color-muted-foreground)]">{copy.eyebrow}</p>
          <h2 className="mt-2 text-[1.25rem] font-bold text-[var(--color-foreground)] sm:text-[1.5rem]">
            {copy.title}
          </h2>
          <p className="mt-2 max-w-[58rem] text-sm leading-6 text-[var(--color-muted-foreground)] sm:text-[0.95rem] sm:leading-7">
            {copy.body}
          </p>
        </div>

        <nav
          className="rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] p-2"
          aria-label={copy.title}
        >
          <p className="px-2 pb-1.5 text-xs font-bold text-[var(--color-muted-foreground)]">
            {copy.actionTitle}
          </p>
          <div className="grid gap-1.5">
            {links.map(({ href, label, description, Icon, primary }) => (
              <Link
                key={href}
                href={href}
                className={`group grid grid-cols-[2rem_minmax(0,1fr)_1.25rem] items-center gap-2 rounded-md border px-2.5 py-2.5 ${
                  primary
                    ? "border-[var(--color-border-light)] bg-[var(--color-surface)] hover:bg-[var(--color-surface-2)]"
                    : "border-transparent bg-transparent hover:border-[var(--color-border)] hover:bg-[var(--color-surface-2)]"
                }`}
              >
                <span
                  className={`flex h-8 w-8 items-center justify-center rounded-md border ${
                    primary
                      ? "border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-foreground)]"
                      : "border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-muted-foreground)]"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-sm font-bold text-[var(--color-foreground)]">
                    {label}
                  </span>
                  <span className="mt-0.5 block truncate text-xs text-[var(--color-muted-foreground)]">
                    {description}
                  </span>
                </span>
                <ArrowRight className="h-4 w-4 text-[var(--color-muted-foreground)] group-hover:text-[var(--color-foreground)]" />
              </Link>
            ))}
          </div>
        </nav>
      </div>

      <dl className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
        {cards.map((card) => (
          <div
            key={card.label}
            className="rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2"
          >
            <dt className="text-xs text-[var(--color-muted-foreground)]">{card.label}</dt>
            <dd className="mt-1 truncate text-sm font-bold text-[var(--color-foreground)]">
              {card.value}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

function buildInsight(
  locale: RouteLocale,
  code: number,
  stats: CharacterStatsResponse | null,
  previousStats: CharacterStatsResponse | null
) {
  if (!stats || stats.totalGames <= 0) return null;

  const language = LANGUAGE_BY_ROUTE_LOCALE[locale];
  const l10n = loadL10nMap(language);
  const characterName = resolveCharacterName(code, l10n, buildFallbackMap());
  const topWeapon = stats.weapons[0] ?? null;
  const weaponName = topWeapon ? resolveWeaponName(topWeapon.bestWeapon, l10n) : null;
  const topWeaponCode = topWeapon?.bestWeapon ?? null;
  const roleComboInsight = buildRoleComboInsight(
    locale,
    characterName,
    findRoleComboCharacter(code, topWeaponCode),
    topWeaponCode == null ? [] : getComboRoles(code, topWeaponCode)
  );

  return buildCharacterInsight({
    stats,
    previousStats,
    characterName,
    weaponName,
    locale,
    roleComboInsight,
  });
}

function CharacterInsightSection({ insight }: { insight: CharacterInsight }) {
  return (
    <section className="dashboard-panel p-4 lg:p-5">
      <div className="mb-4 flex flex-wrap items-center gap-x-2 gap-y-1">
        <Info className="h-4 w-4 text-[var(--color-muted-foreground)]" />
        <h2 className="text-sm font-bold text-[var(--color-foreground)]">{insight.headline}</h2>
      </div>

      <div className="grid gap-3 lg:grid-cols-3">
        <InsightCard title={insight.fitTitle} items={insight.fitPoints} />
        <InsightCard title={insight.metricsTitle} items={insight.metricsPoints} />
        <div className="rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
          <h3 className="mb-2 text-sm font-bold text-[var(--color-foreground)]">
            {insight.compositionTitle}
          </h3>
          <p className="whitespace-pre-line text-sm leading-6 text-[var(--color-muted-foreground)]">
            {insight.compositionReason}
          </p>
        </div>
      </div>
    </section>
  );
}

function InsightCard({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
      <h3 className="mb-2 text-sm font-bold text-[var(--color-foreground)]">{title}</h3>
      <ul className="grid gap-1.5 text-sm leading-6 text-[var(--color-muted-foreground)]">
        {items.map((item) => (
          <li key={item} className="flex gap-2">
            <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--color-border-light)]" />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export async function CharacterPageContent({
  locale,
  code,
  patches,
  initialStats,
  initialPrevStats,
}: CharacterPageContentProps) {
  const t = await getTranslations({ locale, namespace: "characterPage" });
  const serverSummary = buildServerSummary(locale, code, initialStats);
  const summaryTitle = getSummaryTitle(locale);
  const insight = buildInsight(locale, code, initialStats, initialPrevStats);
  const weaponTypeProfiles = Object.fromEntries(
    getCharacterAffinityProfiles(code).map(({ group, member }) => {
      const risingCompositions = getCharacterRisingCompositions(member.profileKey)
        .toSorted((a, b) => b.adjustedResidual - a.adjustedResidual || b.games - a.games)
        .slice(0, 20);

      return [
        member.weapon == null ? "default" : String(member.weapon),
        {
          groupName: getCharacterAffinityGroupName(group, locale),
          subtype: getCharacterAffinitySubtype(member),
          peers: group.primaryMembers
            .filter((peer) => peer.profileKey !== member.profileKey)
            .map((peer) => ({
              profileKey: peer.profileKey,
              characterCode: peer.characterCode,
              characterName: peer.characterName,
              weapon: peer.weapon,
              weaponName: peer.weaponName,
            })),
          signatures: risingCompositions.map((signature) => ({
            partnerTypes: signature.partnerTypes.map((partner) => ({
              role: partner.role,
              fitRole: partner.fitRole,
              members: getCharacterAffinityTypeMembers(partner.role, partner.fitRole).map(
                (typeMember) => ({
                  profileKey: typeMember.profileKey,
                  characterCode: typeMember.characterCode,
                  characterName: typeMember.characterName,
                  weapon: typeMember.weapon,
                  weaponName: typeMember.weaponName,
                })
              ),
            })),
            roleComposition: signature.roleComposition,
            games: signature.games,
            adjustedResidual: signature.adjustedResidual,
          })),
        },
      ];
    })
  );

  return (
    <div className="page-shell flex flex-col gap-5 lg:gap-6">
      <section className="dashboard-panel px-3.5 py-3 sm:px-4 lg:px-4">
        <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(300px,390px)] lg:items-center">
          <div className="flex min-w-0 flex-col justify-center">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-[var(--color-muted-foreground)]">
                <BarChart3 className="h-3 w-3" />
                {t("patchBase", { patch: patches[0] ?? "—" })}
              </span>
            </div>

            <h1 className="mt-1.5 text-lg font-bold leading-tight text-[var(--color-foreground)] sm:text-xl">
              {t("title")}
            </h1>
            <p className="mt-1.5 max-w-[46rem] text-xs leading-5 text-[var(--color-foreground)] sm:text-sm">
              {t("subtitle")}
            </p>
            <p className="mt-1 max-w-[46rem] text-xs leading-5 text-[var(--color-muted-foreground)]">
              {t("description")}
            </p>
            <p className="mt-1.5 text-[10px] leading-4 text-[var(--color-muted-foreground)]">
              {t("imageNotice")}
            </p>
          </div>

          {serverSummary ? (
            <aside className="rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] p-3">
              <div className="mb-1.5 flex items-center gap-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-md border border-[var(--color-border)] text-[var(--color-muted-foreground)]">
                  <Info className="h-3 w-3" />
                </span>
                <h2 className="text-xs font-bold text-[var(--color-foreground)]">{summaryTitle}</h2>
              </div>
              <p className="text-xs leading-5 text-[var(--color-muted-foreground)]">
                {serverSummary}
              </p>
            </aside>
          ) : null}
        </div>
      </section>

      {canRenderAdSlot(ADSENSE_SLOTS.characterAnalysis) ? (
        <AdSlot
          slot={ADSENSE_SLOTS.characterAnalysis}
          slotName="character_analysis_top"
          format="horizontal"
          className="rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2.5 sm:px-4"
          reservation={ADSENSE_SLOT_RESERVATIONS.contentHorizontal}
        />
      ) : null}

      {initialStats ? (
        <CharacterSeoSection locale={locale} code={code} stats={initialStats} />
      ) : null}

      {insight ? <CharacterInsightSection insight={insight} /> : null}

      <div className="min-h-[4800px] sm:min-h-[3200px]">
        <SectionErrorBoundary sectionName={t("sectionName")}>
          <Suspense fallback={<CharacterAnalysisFallback />}>
            <CharacterAnalysisClient
              key={code}
              initialPatches={patches}
              initialStats={initialStats}
              initialPrevStats={initialPrevStats}
              code={code}
              weaponTypeProfiles={weaponTypeProfiles}
            />
          </Suspense>
        </SectionErrorBoundary>
      </div>
    </div>
  );
}
