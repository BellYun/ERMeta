import { readFileSync } from "node:fs";
import path from "node:path";
import { BarChart3, Info } from "lucide-react";
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
import { computeCharacterMetaTiers } from "@/components/features/tier-ranking/utils";
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
import { DEFAULT_CHARACTER_ANALYSIS_TIER } from "@/lib/characterTier";
import { getCachedHomeMetaStats } from "@/lib/homeMetaServer";
import { buildHomeMetaView } from "@/lib/homeMetaShared";
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
    <div className="flex flex-col gap-4 sm:gap-5">
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.35fr)_320px]">
        <section className="dashboard-panel p-3">
          <div>
            <div className="h-36 rounded-md bg-[var(--color-surface-2)] sm:h-40" />
          </div>
        </section>
        <section className="dashboard-panel p-3">
          <div>
            <div className="h-40 rounded-md bg-[var(--color-surface-2)]" />
          </div>
        </section>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <section className="dashboard-panel p-3">
          <div>
            <div className="mb-3 h-6 w-28 rounded bg-[var(--color-surface-2)]" />
            <div className="h-56 rounded-md bg-[var(--color-surface-2)]" />
          </div>
        </section>
        <section className="dashboard-panel p-3">
          <div>
            <div className="mb-3 h-6 w-24 rounded bg-[var(--color-surface-2)]" />
            <div className="h-56 rounded-md bg-[var(--color-surface-2)]" />
          </div>
        </section>
        <section className="dashboard-panel p-3 xl:col-span-2">
          <div>
            <div className="mb-3 h-6 w-16 rounded bg-[var(--color-surface-2)]" />
            <div className="h-72 rounded-md bg-[var(--color-surface-2)]" />
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

function CharacterStructuredData({
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
  const jsonLd = buildCharacterSeoJsonLd(locale, code, characterName, stats, topWeaponName);

  return (
    <script
      type="application/ld+json"
      suppressHydrationWarning
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
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
    <section className="dashboard-panel p-3">
      <div className="mb-3 flex flex-wrap items-center gap-x-2 gap-y-1">
        <Info className="h-4 w-4 text-[var(--color-muted-foreground)]" />
        <h2 className="text-sm font-bold text-[var(--color-foreground)]">{insight.headline}</h2>
      </div>

      <div className="grid gap-2.5 lg:grid-cols-3">
        <InsightCard title={insight.fitTitle} items={insight.fitPoints} />
        <InsightCard title={insight.metricsTitle} items={insight.metricsPoints} />
        <div className="rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] p-3">
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
    <div className="rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] p-3">
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
  const [t, initialMetaTiers] = await Promise.all([
    getTranslations({ locale, namespace: "characterPage" }),
    (async () => {
      const currentPatch = patches[0];
      if (!currentPatch) return {};

      try {
        const metaStats = await getCachedHomeMetaStats(currentPatch);
        const rankings = buildHomeMetaView(metaStats, DEFAULT_CHARACTER_ANALYSIS_TIER).rankingData
          .rankings;
        return computeCharacterMetaTiers(rankings, code);
      } catch {
        return {};
      }
    })(),
  ]);
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
    <div className="page-shell flex flex-col gap-4 lg:gap-5">
      <section className="dashboard-panel px-3 py-2.5 sm:px-3.5">
        <div className="grid gap-2.5 lg:grid-cols-[minmax(0,1fr)_minmax(280px,360px)] lg:items-center">
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
            <aside className="rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] p-2.5">
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
        <CharacterStructuredData locale={locale} code={code} stats={initialStats} />
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
              initialMetaTiers={initialMetaTiers}
              code={code}
              weaponTypeProfiles={weaponTypeProfiles}
            />
          </Suspense>
        </SectionErrorBoundary>
      </div>
    </div>
  );
}
