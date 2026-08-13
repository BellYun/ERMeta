/* Hallmark · pre-emit critique: P5 H4 E5 S5 R5 V4 */
import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { LabPageContent } from "@/components/features/lab/LabPageContent";
import type { ComboTrend, LabData } from "@/components/features/lab/types";
import { isRouteLocale, ROUTE_LOCALES, type RouteLocale } from "@/i18n/routing";
import type { LabPartnerType } from "@/lib/labCompositionTypes";
import { BASE_URL } from "@/lib/siteMetadata";
import assassinsData from "../../../../../../public/data/lab/assassins.json";
import compositionData from "../../../../../../public/data/lab/composition-types.json";
import adjustedAssassinsData from "../../../../../../public/data/lab/entry-adjusted/assassins.json";
import adjustedCompositionData from "../../../../../../public/data/lab/entry-adjusted/composition-types.json";
import adjustedRangersData from "../../../../../../public/data/lab/entry-adjusted/rangers.json";
import adjustedSkilldealersData from "../../../../../../public/data/lab/entry-adjusted/skilldealers.json";
import adjustedSupportsData from "../../../../../../public/data/lab/entry-adjusted/supports.json";
import adjustedTanksData from "../../../../../../public/data/lab/entry-adjusted/tanks.json";
import adjustedWarriorsData from "../../../../../../public/data/lab/entry-adjusted/warriors.json";
import combinedAssassinsData from "../../../../../../public/data/lab/entry-sample-confidence/assassins.json";
import combinedCompositionData from "../../../../../../public/data/lab/entry-sample-confidence/composition-types.json";
import combinedRangersData from "../../../../../../public/data/lab/entry-sample-confidence/rangers.json";
import combinedSkilldealersData from "../../../../../../public/data/lab/entry-sample-confidence/skilldealers.json";
import combinedSupportsData from "../../../../../../public/data/lab/entry-sample-confidence/supports.json";
import combinedTanksData from "../../../../../../public/data/lab/entry-sample-confidence/tanks.json";
import combinedWarriorsData from "../../../../../../public/data/lab/entry-sample-confidence/warriors.json";
import rangersData from "../../../../../../public/data/lab/rangers.json";
import sampleAssassinsData from "../../../../../../public/data/lab/sample-confidence/assassins.json";
import sampleCompositionData from "../../../../../../public/data/lab/sample-confidence/composition-types.json";
import sampleRangersData from "../../../../../../public/data/lab/sample-confidence/rangers.json";
import sampleSkilldealersData from "../../../../../../public/data/lab/sample-confidence/skilldealers.json";
import sampleSupportsData from "../../../../../../public/data/lab/sample-confidence/supports.json";
import sampleTanksData from "../../../../../../public/data/lab/sample-confidence/tanks.json";
import sampleWarriorsData from "../../../../../../public/data/lab/sample-confidence/warriors.json";
import skilldealersData from "../../../../../../public/data/lab/skilldealers.json";
import supportsData from "../../../../../../public/data/lab/supports.json";
import tanksData from "../../../../../../public/data/lab/tanks.json";
import warriorsData from "../../../../../../public/data/lab/warriors.json";
export const dynamic = "force-dynamic";
export const dynamicParams = false;

const SUPPORTED_ROLES = [
  "rangers",
  "skilldealers",
  "tanks",
  "warriors",
  "assassins",
  "supports",
] as const;
type SupportedRole = (typeof SUPPORTED_ROLES)[number];

const LAB_DATA: Record<SupportedRole, LabData> = {
  rangers: rangersData as LabData,
  skilldealers: skilldealersData as LabData,
  tanks: tanksData as LabData,
  warriors: warriorsData as LabData,
  assassins: assassinsData as LabData,
  supports: supportsData as LabData,
};

const ADJUSTED_LAB_DATA: Record<SupportedRole, LabData> = {
  rangers: adjustedRangersData as LabData,
  skilldealers: adjustedSkilldealersData as LabData,
  tanks: adjustedTanksData as LabData,
  warriors: adjustedWarriorsData as LabData,
  assassins: adjustedAssassinsData as LabData,
  supports: adjustedSupportsData as LabData,
};

const SAMPLE_LAB_DATA: Record<SupportedRole, LabData> = {
  rangers: sampleRangersData as LabData,
  skilldealers: sampleSkilldealersData as LabData,
  tanks: sampleTanksData as LabData,
  warriors: sampleWarriorsData as LabData,
  assassins: sampleAssassinsData as LabData,
  supports: sampleSupportsData as LabData,
};

const COMBINED_LAB_DATA: Record<SupportedRole, LabData> = {
  rangers: combinedRangersData as LabData,
  skilldealers: combinedSkilldealersData as LabData,
  tanks: combinedTanksData as LabData,
  warriors: combinedWarriorsData as LabData,
  assassins: combinedAssassinsData as LabData,
  supports: combinedSupportsData as LabData,
};

interface SourceTypeCombination {
  types: LabPartnerType[];
  games: number;
  avgRp: number;
  adjustedLift: number;
  confidence: "high" | "medium" | "low";
  characterMinGames: number;
  characterCombinations: Array<{
    members: Array<{
      characterName: string;
      role: string;
    }>;
    games: number;
    avgRp: number;
    adjustedLift: number;
  }>;
}

interface SourceTypeCatalogEntry {
  role: string;
  fitRole: string;
  characters: Array<{
    characterCode: number;
    characterName: string;
    weapon: number | null;
    fitReliable: boolean;
  }>;
}

interface SourceRoleComposition {
  roleComposition: string;
  minGames: number;
  topCombinations: SourceTypeCombination[];
  sampleRankedCombinations?: SourceTypeCombination[];
  typeCatalog: SourceTypeCatalogEntry[];
}

type SourceCompositionData = {
  roleCompositions: SourceRoleComposition[];
};

const COMPOSITION_DATA = compositionData as SourceCompositionData;
const ADJUSTED_COMPOSITION_DATA = adjustedCompositionData as SourceCompositionData;
const SAMPLE_COMPOSITION_DATA = sampleCompositionData as SourceCompositionData;
const COMBINED_COMPOSITION_DATA = combinedCompositionData as SourceCompositionData;

function reliableCharactersForType(
  roleComposition: SourceRoleComposition | undefined,
  type: LabPartnerType
): string[] {
  const names =
    roleComposition?.typeCatalog
      .filter((entry) => entry.role === type.role && entry.fitRole === type.fitRole)
      .flatMap((entry) => entry.characters)
      .filter((character) => character.fitReliable)
      .map((character) => character.characterName) ?? [];

  return [...new Set(names)];
}

function addStrongComboTrends(
  data: LabData,
  sourceCompositionData: SourceCompositionData,
  useSampleRanking = false
): LabData {
  return {
    ...data,
    characters: data.characters.map((character) => {
      if (!character.classification) return character;

      const focalRole = data.role;
      const focalFitRole = character.classification.fitRole;

      return {
        ...character,
        strong: character.strong.map((entry) => {
          const roleComposition = sourceCompositionData.roleCompositions.find(
            (composition) => composition.roleComposition === entry.multiset
          );
          const focalCatalogTypes =
            roleComposition?.typeCatalog.filter(
              (catalogEntry) =>
                catalogEntry.role === focalRole &&
                catalogEntry.characters.some(
                  (member) =>
                    member.characterCode === character.characterCode &&
                    member.weapon === character.weapon
                )
            ) ?? [];
          const focalTypeKeys = new Set(
            focalCatalogTypes.map((catalogEntry) => `${catalogEntry.role}:${catalogEntry.fitRole}`)
          );
          const sourceCombinations = useSampleRanking
            ? (roleComposition?.sampleRankedCombinations ?? roleComposition?.topCombinations)
            : roleComposition?.topCombinations;
          const matchingCombinations =
            sourceCombinations?.filter((combination) =>
              combination.types.some((type) => focalTypeKeys.has(`${type.role}:${type.fitRole}`))
            ) ?? [];

          const trend: ComboTrend = {
            focalLabel: `${focalFitRole} 원딜`,
            compositionLabel: entry.multiset,
            minGames:
              roleComposition?.minGames ??
              sourceCompositionData.roleCompositions[0]?.minGames ??
              300,
            patterns: matchingCombinations.slice(0, 3).map((combination) => {
              const focalTypeIndex = combination.types.findIndex((type) =>
                focalTypeKeys.has(`${type.role}:${type.fitRole}`)
              );

              return {
                games: combination.games,
                avgRp: combination.avgRp,
                adjustedLift: combination.adjustedLift,
                confidence: combination.confidence,
                characterMinGames: combination.characterMinGames,
                partnerGroups: combination.types
                  .filter((_, index) => index !== focalTypeIndex)
                  .map((type) => ({
                    role: type.role,
                    fitRole: type.fitRole,
                    characters: reliableCharactersForType(roleComposition, type),
                  })),
                actualCombinations: combination.characterCombinations
                  .filter((actualCombination) =>
                    actualCombination.members.some(
                      (member) =>
                        member.role === focalRole &&
                        member.characterName === character.characterName
                    )
                  )
                  .map((actualCombination) => ({
                    characters: actualCombination.members.map((member) => member.characterName),
                    games: actualCombination.games,
                    avgRp: actualCombination.avgRp,
                    adjustedLift: actualCombination.adjustedLift,
                  })),
              };
            }),
          };

          return { ...entry, trend };
        }),
      };
    }),
  };
}

const ROLE_LABELS: Record<RouteLocale, Record<SupportedRole, string>> = {
  ko: {
    rangers: "원거리 딜러",
    skilldealers: "스킬딜러",
    tanks: "탱커",
    warriors: "전사",
    assassins: "암살자",
    supports: "지원가",
  },
  en: {
    rangers: "Ranged Carries",
    skilldealers: "Skill Damage",
    tanks: "Tanks",
    warriors: "Bruisers",
    assassins: "Assassins",
    supports: "Supports",
  },
  ja: {
    rangers: "遠距離キャリー",
    skilldealers: "スキルダメージ",
    tanks: "タンク",
    warriors: "ファイター",
    assassins: "アサシン",
    supports: "サポート",
  },
  "zh-Hans": {
    rangers: "远程输出",
    skilldealers: "技能输出",
    tanks: "坦克",
    warriors: "战士",
    assassins: "刺客",
    supports: "辅助",
  },
  "zh-Hant": {
    rangers: "遠程輸出",
    skilldealers: "技能輸出",
    tanks: "坦克",
    warriors: "戰士",
    assassins: "刺客",
    supports: "輔助",
  },
};

const COPY = {
  ko: {
    back: "실험체 유형 분석",
    fallbackTitle: "실험체 유형 분석",
    title: (role: string) => `${role} 시너지 그룹`,
    metadataTitle: (role: string) => `${role} 시너지 그룹 - 실험체 유형 분석`,
    description: (role: string) =>
      `${role} 실험체별 주요 조합과 주의 조합을 누적 통계 기준으로 정리합니다.`,
    badge: "시즌 10·11 성과·판수 보정 연계",
    body: (games: string) =>
      `RP 상승과 판수 경향으로 파트너 조합을 나누고, 특성 기반 역할군 중 지표 불일치가 명확한 후보만 다시 분리했습니다. 카드의 비율은 해당 조합의 표본 비중이며, ${games}판 미만 조합은 제외합니다.`,
  },
  en: {
    back: "Role Groups",
    fallbackTitle: "Role Groups",
    title: (role: string) => `${role} Synergy Groups`,
    metadataTitle: (role: string) => `${role} Synergy Groups - Role Groups`,
    description: (role: string) => `Cumulative role-group overview for ${role}.`,
    badge: "Season 10–11 performance and volume fit",
    body: (games: string) =>
      `Partner-role groups combine RP lift with game volume. Only trait groups with clear metric disagreement are split again; samples below ${games} games are excluded.`,
  },
  ja: {
    back: "ロールグループ",
    fallbackTitle: "ロールグループ",
    title: (role: string) => `${role} 相性グループ`,
    metadataTitle: (role: string) => `${role} 相性グループ - ロールグループ`,
    description: (role: string) => `${role}の累積相性グループ概要です。`,
    badge: "シーズン10・11サンプル補正相性",
    body: (games: string) =>
      `RP上昇が最も安定した2つの味方ロールで分類します。特性は補助情報とし、${games}試合未満の構成は除外します。`,
  },
  "zh-Hans": {
    back: "角色分组",
    fallbackTitle: "角色分组",
    title: (role: string) => `${role} 协同分组`,
    metadataTitle: (role: string) => `${role} 协同分组 - 角色分组`,
    description: (role: string) => `${role} 的累计协同分组概览。`,
    badge: "第10、11赛季样本校正适配",
    body: (games: string) =>
      `按RP提升最稳定的两个队友定位分组，角色特性作为辅助信息，并排除低于 ${games} 场的阵容。`,
  },
  "zh-Hant": {
    back: "角色分組",
    fallbackTitle: "角色分組",
    title: (role: string) => `${role} 協同分組`,
    metadataTitle: (role: string) => `${role} 協同分組 - 角色分組`,
    description: (role: string) => `${role} 的累計協同分組概覽。`,
    badge: "第10、11賽季樣本校正適配",
    body: (games: string) =>
      `按RP提升最穩定的兩個隊友定位分組，角色特性作為輔助資訊，並排除低於 ${games} 場的陣容。`,
  },
} as const;

interface Props {
  params: Promise<{ locale: string; role: string }>;
  searchParams: Promise<{ metric?: string }>;
}

export function generateStaticParams() {
  return ROUTE_LOCALES.flatMap((locale) => SUPPORTED_ROLES.map((role) => ({ locale, role })));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, role } = await params;
  if (!isRouteLocale(locale)) notFound();
  const data = LAB_DATA[role as SupportedRole];
  const copy = COPY[locale];
  if (!data) return { title: copy.fallbackTitle };
  const roleLabel = ROLE_LABELS[locale][role as SupportedRole];
  const title = copy.metadataTitle(roleLabel);
  const description = copy.description(roleLabel);
  return {
    metadataBase: new URL(BASE_URL),
    title,
    description,
    openGraph: { title, description, url: `/character-lab/${role}` },
    twitter: { title, description },
    robots: { index: true, follow: true },
  };
}

export default async function NewCharacterLabRolePage({ params, searchParams }: Props) {
  const { locale, role } = await params;
  const { metric } = await searchParams;
  if (!isRouteLocale(locale)) notFound();
  setRequestLocale(locale);

  if (!SUPPORTED_ROLES.includes(role as SupportedRole)) notFound();
  const supportedRole = role as SupportedRole;
  const metricMode =
    metric === "entry" || metric === "sample" || metric === "combined" ? metric : null;
  const isEntryAdjusted = metricMode === "entry";
  const isSampleConfidence = metricMode === "sample";
  const isCombinedConfidence = metricMode === "combined";
  const baseData = isCombinedConfidence
    ? COMBINED_LAB_DATA[supportedRole]
    : isEntryAdjusted
      ? ADJUSTED_LAB_DATA[supportedRole]
      : isSampleConfidence
        ? SAMPLE_LAB_DATA[supportedRole]
        : LAB_DATA[supportedRole];
  const data = addStrongComboTrends(
    baseData,
    isCombinedConfidence
      ? COMBINED_COMPOSITION_DATA
      : isEntryAdjusted
        ? ADJUSTED_COMPOSITION_DATA
        : isSampleConfidence
          ? SAMPLE_COMPOSITION_DATA
          : COMPOSITION_DATA,
    isSampleConfidence || isCombinedConfidence
  );
  const copy = COPY[locale];
  const roleLabel = ROLE_LABELS[locale][supportedRole];
  const minGames = data.minGames.toLocaleString("ko-KR");

  return (
    <main className="page-shell mx-auto max-w-6xl px-3 py-6 sm:px-5 sm:py-8">
      <nav className="mb-4 flex items-center gap-1.5 text-xs text-[var(--color-muted-foreground)]">
        <Link
          href="/character-lab/new"
          className="dashboard-tab inline-flex items-center gap-1 px-2 py-1"
        >
          <ArrowLeft className="h-3 w-3" strokeWidth={2.4} />
          {copy.back}
        </Link>
        <span className="text-[var(--color-border-light)]">/</span>
        <span className="text-[var(--color-foreground)]">{roleLabel}</span>
      </nav>

      <header className="dashboard-panel mb-5 flex flex-col gap-3 p-4">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="dashboard-section-title text-xl font-bold text-[var(--color-foreground)]">
            {copy.title(roleLabel)}
          </h1>
          <span className="rounded-full border border-[var(--color-accent)] bg-[var(--color-accent-muted)] px-2.5 py-0.5 text-[11px] font-semibold text-[var(--color-accent-foreground)]">
            {copy.badge}
          </span>
        </div>
        <p className="text-sm text-[var(--color-muted-foreground)]">{copy.body(minGames)}</p>
        {locale === "ko" ? (
          <nav
            aria-label="분류 지표 선택"
            className="grid grid-cols-2 gap-1 rounded-md border border-[var(--color-border)] bg-[var(--color-surface-2)] p-1 sm:grid-cols-4 sm:w-fit sm:min-w-[720px]"
          >
            {[
              {
                label: "1. 관측 RP",
                description: "기존 분류",
                active: metricMode === null,
                href: `/${locale}/character-lab/new/${supportedRole}`,
              },
              {
                label: "2. 입장료 보정",
                description: "티어 차이 반영",
                active: isEntryAdjusted,
                href: `/${locale}/character-lab/new/${supportedRole}?metric=entry`,
              },
              {
                label: "3. 판수 신뢰 보정",
                description: "상승폭 × √판수",
                active: isSampleConfidence,
                href: `/${locale}/character-lab/new/${supportedRole}?metric=sample`,
              },
              {
                label: "4. 입장료+판수 보정",
                description: "두 보정 동시 적용",
                active: isCombinedConfidence,
                href: `/${locale}/character-lab/new/${supportedRole}?metric=combined`,
              },
            ].map((item) => (
              <Link
                key={item.label}
                href={item.href}
                aria-current={item.active ? "page" : undefined}
                className={
                  "min-w-0 rounded px-3 py-2 text-center outline-none transition-colors focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] " +
                  (item.active
                    ? "bg-[var(--color-surface)] text-[var(--color-foreground)] shadow-sm"
                    : "text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)] active:bg-[var(--color-surface)]/70")
                }
              >
                <span className="block truncate text-xs font-bold">{item.label}</span>
                <span className="mt-0.5 block truncate text-[10px]">{item.description}</span>
              </Link>
            ))}
          </nav>
        ) : null}
        {locale === "ko" && isEntryAdjusted ? (
          <p className="border-l-2 border-[var(--color-accent)] pl-3 text-xs leading-5 text-[var(--color-muted-foreground)]">
            다이아 +48 · 메테오 +54.5 · 미스릴 +60 RP를 관측값에 복원해 다시 분류했습니다. 기존
            분류와 별도로 계산된 결과입니다.
          </p>
        ) : null}
        {locale === "ko" && isSampleConfidence ? (
          <p className="border-l-2 border-[var(--color-accent)] pl-3 text-xs leading-5 text-[var(--color-muted-foreground)]">
            실험체별 대표 파트너 조합을 관측 상승폭 × √판수로 다시 고른 뒤, 파트너 역할군과 내부
            역할군을 별도로 재계산했습니다. 정확한 유의확률이 아닌 판수 신뢰 비교용 분류입니다.
          </p>
        ) : null}
        {locale === "ko" && isCombinedConfidence ? (
          <p className="border-l-2 border-[var(--color-accent)] pl-3 text-xs leading-5 text-[var(--color-muted-foreground)]">
            티어별 입장료를 RP에 복원한 뒤 상승폭 × √판수로 대표 조합과 전역 역할군을 다시
            계산했습니다. 입장료와 판수 신뢰를 동시에 반영한 별도 분류입니다.
          </p>
        ) : null}
      </header>

      {locale === "ko" ? (
        <LabPageContent data={data} />
      ) : (
        <section className="grid gap-3 sm:grid-cols-3">
          <div className="metric-card px-4 py-4" data-accent="true">
            <p className="text-xs text-[var(--color-muted-foreground)]">{copy.back}</p>
            <p className="mt-2 text-2xl font-bold text-[var(--color-accent-foreground)]">
              {data.characters.length}
            </p>
          </div>
          <div className="metric-card px-4 py-4">
            <p className="text-xs text-[var(--color-muted-foreground)]">{copy.title(roleLabel)}</p>
            <p className="mt-2 text-2xl font-bold text-[var(--color-foreground)]">{data.groupK}</p>
          </div>
          <div className="metric-card px-4 py-4">
            <p className="text-xs text-[var(--color-muted-foreground)]">{copy.badge}</p>
            <p className="mt-2 text-2xl font-bold text-[var(--color-foreground)]">
              {data.minGames}+
            </p>
          </div>
        </section>
      )}
    </main>
  );
}
