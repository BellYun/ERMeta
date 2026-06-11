import { readFileSync } from "node:fs";
import path from "node:path";
import { ArrowRight, BarChart3, GitBranch, Info, Network, TrendingUp } from "lucide-react";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Suspense } from "react";
import type { CharacterStatsResponse } from "@/app/api/character/stats/[characterCode]/route";
import { CharacterAnalysisClient } from "@/components/features/CharacterAnalysisClient";
import type { ComboEntry, LabCharacter, LabData } from "@/components/features/lab/types";
import { SectionErrorBoundary } from "@/components/features/SectionErrorBoundary";
import { LANGUAGE_BY_ROUTE_LOCALE, type RouteLocale } from "@/i18n/routing";
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
          <div className="animate-pulse">
            <div className="h-40 rounded-[20px] bg-[rgba(255,255,255,0.04)] sm:h-48" />
          </div>
        </section>
        <section className="dashboard-panel p-3.5 sm:p-4 lg:p-5">
          <div className="animate-pulse">
            <div className="h-48 rounded-[20px] bg-[rgba(255,255,255,0.04)]" />
          </div>
        </section>
      </div>

      <div className="grid gap-5 xl:grid-cols-2">
        <section className="dashboard-panel p-3.5 sm:p-4 lg:p-5">
          <div className="animate-pulse">
            <div className="mb-4 h-6 w-28 rounded bg-[rgba(255,255,255,0.06)]" />
            <div className="h-64 rounded-[20px] bg-[rgba(255,255,255,0.04)]" />
          </div>
        </section>
        <section className="dashboard-panel p-3.5 sm:p-4 lg:p-5">
          <div className="animate-pulse">
            <div className="mb-4 h-6 w-24 rounded bg-[rgba(255,255,255,0.06)]" />
            <div className="h-64 rounded-[20px] bg-[rgba(255,255,255,0.04)]" />
          </div>
        </section>
        <section className="dashboard-panel p-3.5 sm:p-4 lg:p-5 xl:col-span-2">
          <div className="animate-pulse">
            <div className="mb-4 h-6 w-16 rounded bg-[rgba(255,255,255,0.06)]" />
            <div className="h-80 rounded-[20px] bg-[rgba(255,255,255,0.04)]" />
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
    if (locale === "ko") return "미스릴 이상";
    return "Mithril+";
  }
  if (tier === "METEORITE_PLUS") {
    if (locale === "ja") return "メテオライト以上";
    if (locale === "ko") return "메테오라이트 이상";
    return "Meteorite+";
  }
  if (tier === "DIAMOND_PLUS") {
    if (locale === "ja") return "ダイヤ以上";
    if (locale === "ko") return "다이아 이상";
    return "Diamond+";
  }
  return tier;
}

function getSummaryTitle(locale: RouteLocale) {
  if (locale === "ja") return "現在のパッチ概要";
  if (locale === "ko") return "현재 패치 요약";
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
    pickReason: `${characterName}는 팀에 ${roleText} 역할군이 이미 보일 때 성과가 좋은 편입니다.\n\n역할 조합별 RP에서 ${comboText} 조합이 양전으로 확인됩니다.`,
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
    return `${name}はパッチ${stats.patchVersion}の${tierLabel}基準で${sample}試合の標本があります。勝率は${winRate}%、ピック率は${pickRate}%、平均RPは${averageRp}、Top 3率は${top3Rate}%です。${
      topWeaponName
        ? `最も多く使われた武器は${topWeaponName}で、武器別成績と前パッチ比較を下の分析表で確認できます。`
        : "武器別成績と前パッチ比較を下の分析表で確認できます。"
    }`;
  }

  if (locale !== "ko") {
    return `${name} has a ${sample}-match sample on patch ${stats.patchVersion} in ${tierLabel}. The current win rate is ${winRate}%, pick rate is ${pickRate}%, average RP is ${averageRp}, and Top 3 rate is ${top3Rate}%. ${
      topWeaponName
        ? `The most played weapon is ${topWeaponName}, with weapon performance and patch comparison available in the analysis below.`
        : "Weapon performance and patch comparison are available in the analysis below."
    }`;
  }

  return `${name}는 패치 ${stats.patchVersion} ${tierLabel} 기준 ${sample}판 표본에서 승률 ${winRate}%, 픽률 ${pickRate}%, 평균 RP ${averageRp}, Top 3 비율 ${top3Rate}%를 기록했습니다. ${
    topWeaponName
      ? `가장 많이 선택된 무기는 ${topWeaponName}이며, 아래 분석에서 무기별 성과와 이전 패치 대비 변화를 함께 확인할 수 있습니다.`
      : "아래 분석에서 무기별 성과와 이전 패치 대비 변화를 함께 확인할 수 있습니다."
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
        ? `${characterName}의 승률, 픽률, 평균 RP, 추천 무기, 조합 분석 데이터입니다.`
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
      { "@type": "PropertyValue", name: "Top 3 rate", value: formatPercent(stats.top3Rate) },
      { "@type": "PropertyValue", name: "Sample size", value: stats.totalGames },
      ...(topWeaponName
        ? [{ "@type": "PropertyValue", name: "Recommended weapon", value: topWeaponName }]
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
  const trioHref = `${localizeRoutePath("/trio-lab", locale)}?pool=${code}`;
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
          )}를 기록했습니다. 추천 무기와 특성, 장비 빌드는 아래 상세 분석에서 표본 수와 함께 비교하세요.`,
          weapon: "추천 무기",
          noWeapon: "무기 표본 확인 중",
          winRate: "승률",
          pickRate: "픽률",
          averageRp: "평균 RP",
          sample: "분석 표본",
          sampleSuffix: "판",
          actionTitle: "다음 분석",
          trio: `${characterName} 조합 찾기`,
          trioDesc: "내 캐릭터 풀에 맞는 3인 조합",
          patch: patchAnalysisVersion ? `${patchAnalysisVersion} 패치 분석` : "패치 분석",
          patchDesc: "제공 중인 패치 메타 분석",
          lab: "역할군 비교",
          labDesc: "같은 역할군 안에서 성과 비교",
        }
      : locale === "ja"
        ? {
            eyebrow: "検索サマリー",
            title: `${characterName} ビルド・特性・武器統計`,
            body: `${characterName}はパッチ${stats.patchVersion}の${tierLabel}基準で勝率${formatPercent(
              stats.winRate
            )}、ピック率${formatPercent(stats.pickRate)}、平均RP ${stats.averageRP.toFixed(
              1
            )}を記録しています。おすすめ武器、特性、装備ビルドは下の詳細分析で標本数と一緒に比較できます。`,
            weapon: "おすすめ武器",
            noWeapon: "武器標本を確認中",
            winRate: "勝率",
            pickRate: "ピック率",
            averageRp: "平均RP",
            sample: "分析標本",
            sampleSuffix: "試合",
            actionTitle: "次の分析",
            trio: `${characterName}の構成を探す`,
            trioDesc: "このキャラを含む3人構成",
            patch: patchAnalysisVersion ? `パッチ${patchAnalysisVersion}分析` : "パッチ分析",
            patchDesc: "提供中のパッチメタ分析",
            lab: "ロール比較",
            labDesc: "同じロール内の成績比較",
          }
        : {
            eyebrow: "Search Summary",
            title: `${characterName} Build, Traits, and Weapon Stats`,
            body: `${characterName} has a ${formatPercent(
              stats.winRate
            )} win rate, ${formatPercent(stats.pickRate)} pick rate, and ${stats.averageRP.toFixed(
              1
            )} average RP on patch ${stats.patchVersion} in ${tierLabel}. Compare recommended weapons, traits, equipment builds, and sample size in the detailed analysis below.`,
            weapon: "Recommended weapon",
            noWeapon: "Checking weapon samples",
            winRate: "Win rate",
            pickRate: "Pick rate",
            averageRp: "Average RP",
            sample: "Sample",
            sampleSuffix: "matches",
            actionTitle: "Next Analysis",
            trio: `Find ${characterName} comps`,
            trioDesc: "Trio recommendations with this character",
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
      href: trioHref,
      label: copy.trio,
      description: copy.trioDesc,
      Icon: Network,
      primary: true,
    },
    {
      href: patchHref,
      label: copy.patch,
      description: copy.patchDesc,
      Icon: TrendingUp,
      primary: false,
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
          <p className="text-xs font-bold uppercase tracking-[0.12em] text-[var(--color-primary)]">
            {copy.eyebrow}
          </p>
          <h2 className="mt-2 text-[1.35rem] font-black text-[var(--color-foreground)] sm:text-[1.55rem]">
            {copy.title}
          </h2>
          <p className="mt-2 max-w-[58rem] text-sm leading-6 text-[var(--color-muted-foreground)] sm:text-[0.95rem] sm:leading-7">
            {copy.body}
          </p>
        </div>

        <nav
          className="rounded-xl border border-[var(--color-border)] bg-[rgba(255,255,255,0.025)] p-2"
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
                className={`group grid grid-cols-[2rem_minmax(0,1fr)_1.25rem] items-center gap-2 rounded-lg border px-2.5 py-2.5 transition ${
                  primary
                    ? "border-[rgba(96,165,250,0.25)] bg-[rgba(96,165,250,0.08)] hover:border-[rgba(96,165,250,0.42)]"
                    : "border-transparent bg-transparent hover:border-[rgba(255,255,255,0.12)] hover:bg-[rgba(255,255,255,0.035)]"
                }`}
              >
                <span
                  className={`flex h-8 w-8 items-center justify-center rounded-lg border ${
                    primary
                      ? "border-[rgba(96,165,250,0.26)] bg-[rgba(96,165,250,0.12)] text-[var(--color-primary)]"
                      : "border-[var(--color-border)] bg-[rgba(255,255,255,0.035)] text-[var(--color-muted-foreground)]"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-sm font-black text-[var(--color-foreground)]">
                    {label}
                  </span>
                  <span className="mt-0.5 block truncate text-xs text-[var(--color-muted-foreground)]">
                    {description}
                  </span>
                </span>
                <ArrowRight className="h-4 w-4 text-[var(--color-muted-foreground)] transition group-hover:translate-x-0.5 group-hover:text-[var(--color-foreground)]" />
              </Link>
            ))}
          </div>
        </nav>
      </div>

      <dl className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
        {cards.map((card) => (
          <div
            key={card.label}
            className="rounded-lg border border-[var(--color-border)] bg-[rgba(255,255,255,0.03)] px-3 py-2"
          >
            <dt className="text-xs text-[var(--color-muted-foreground)]">{card.label}</dt>
            <dd className="mt-1 truncate text-sm font-black text-[var(--color-foreground)]">
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
        <Info className="h-4 w-4 text-[var(--color-primary)]" />
        <h2 className="text-[1.1rem] font-black tracking-[-0.04em] text-[var(--color-foreground)] sm:text-[1.25rem]">
          {insight.headline}
        </h2>
      </div>

      <div className="grid gap-3 lg:grid-cols-3">
        <InsightCard title={insight.fitTitle} items={insight.fitPoints} />
        <InsightCard title={insight.metricsTitle} items={insight.metricsPoints} />
        <div className="rounded-2xl border border-[var(--color-border)] bg-[rgba(255,255,255,0.035)] p-4">
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
    <div className="rounded-2xl border border-[var(--color-border)] bg-[rgba(255,255,255,0.035)] p-4">
      <h3 className="mb-2 text-sm font-bold text-[var(--color-foreground)]">{title}</h3>
      <ul className="grid gap-1.5 text-sm leading-6 text-[var(--color-muted-foreground)]">
        {items.map((item) => (
          <li key={item} className="flex gap-2">
            <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--color-primary)]" />
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

  return (
    <div className="page-shell flex flex-col gap-5 lg:gap-6">
      <section className="dashboard-hero px-3 py-3 sm:px-4 sm:py-4 lg:px-5 lg:py-5">
        <div className="grid gap-4 px-1 py-1.5 sm:px-2 sm:py-2 lg:grid-cols-[minmax(0,1fr)_minmax(320px,420px)] lg:items-center lg:px-4">
          <div className="flex min-w-0 flex-col justify-center">
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-[rgba(59,130,246,0.18)] bg-[rgba(59,130,246,0.08)] px-3 py-1">
                <BarChart3 className="h-3.5 w-3.5 text-[var(--color-primary)]" />
                <span className="text-[10px] font-semibold uppercase tracking-[0.1em] text-[var(--color-primary)] sm:text-[11px]">
                  {t("badge")}
                </span>
              </span>
              <span className="inline-flex items-center gap-1 rounded-full bg-[var(--color-warning)]/10 border border-[var(--color-warning)]/20 px-2 py-0.5">
                <span className="text-[9px] font-bold text-[var(--color-warning)] uppercase">
                  {t("beta")}
                </span>
              </span>
              <span className="text-xs text-[var(--color-muted-foreground)] sm:text-sm">
                {t("patchBase", { patch: patches[0] ?? "—" })}
              </span>
            </div>

            <h1 className="mt-3 text-[1.9rem] font-black tracking-[-0.055em] text-[var(--color-foreground)] sm:mt-4 sm:text-[2.2rem] lg:text-[3.15rem]">
              {t("title")}
            </h1>
            <p className="mt-2.5 max-w-[46rem] text-[0.95rem] font-semibold leading-6 text-[var(--color-foreground)]/88 sm:mt-3 sm:text-base sm:leading-7 lg:text-[1.05rem]">
              {t("subtitle")}
            </p>
            <p className="mt-2 max-w-[46rem] text-sm leading-6 text-[var(--color-muted-foreground)] sm:text-[0.95rem] sm:leading-7">
              {t("description")}
            </p>
            <p className="mt-2 text-xs text-[var(--color-warning)]/80 sm:text-sm">
              {t("imageNotice")}
            </p>
          </div>

          {serverSummary ? (
            <aside className="rounded-2xl border border-[rgba(96,165,250,0.2)] bg-[rgba(96,165,250,0.08)] p-3.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] sm:p-4 lg:self-stretch">
              <div className="mb-2 flex items-center gap-2">
                <span className="flex h-7 w-7 items-center justify-center rounded-xl border border-[rgba(96,165,250,0.22)] bg-[rgba(96,165,250,0.1)] text-[var(--color-primary)]">
                  <Info className="h-3.5 w-3.5" />
                </span>
                <h2 className="text-sm font-bold text-[var(--color-foreground)]">{summaryTitle}</h2>
              </div>
              <p className="text-sm leading-6 text-[var(--color-foreground)]/88 sm:text-[0.95rem] sm:leading-7">
                {serverSummary}
              </p>
            </aside>
          ) : null}
        </div>
      </section>

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
            />
          </Suspense>
        </SectionErrorBoundary>
      </div>
    </div>
  );
}
