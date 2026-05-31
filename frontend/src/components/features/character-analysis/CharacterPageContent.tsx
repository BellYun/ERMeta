import { readFileSync } from "node:fs";
import path from "node:path";
import { BarChart3, Info } from "lucide-react";
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
import { loadL10nMap } from "@/lib/serverL10n";
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

function loadLabData(slug: string): LabData | null {
  try {
    const filePath = path.join(process.cwd(), "public", "data", "lab", `${slug}.json`);
    return JSON.parse(readFileSync(filePath, "utf8")) as LabData;
  } catch {
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
            <p className="mt-2.5 max-w-[42rem] text-[0.95rem] leading-6 text-[var(--color-foreground)]/88 sm:mt-3 sm:text-base sm:leading-7 lg:text-[1.05rem]">
              {t("subtitle")}
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
