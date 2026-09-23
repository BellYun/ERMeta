/* Hallmark · pre-emit critique: P5 H5 E5 S5 R5 V5 · genre: modern-minimal · macrostructure: Catalogue · theme: Mineral Signal · enrichment: character portraits · nav: inherited N1b · footer: inherited Ft4 · contrast/slop/honesty/tokens/responsive/mobile: pass */
import { ArrowUpRight, CheckCircle2, ChevronDown, FlaskConical, Users } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { isRouteLocale, type RouteLocale } from "@/i18n/routing";
import {
  getCharacterAffinityGroupName,
  getCharacterAffinityTypeMembers,
} from "@/lib/characterAffinity";
import { getCharacterMiniWebpUrl } from "@/lib/characterMap";
import { getCharacterCompositionTraits, type CompositionTraitKey } from "@/lib/synergyComposition";
import editorialOverridesJson from "../../../../../analysis-snapshots/composition-affinity/season10-11-exact-two-partner-affinity-v1/editorial-overrides.json";
import frozenGroupsJson from "../../../../../analysis-snapshots/composition-affinity/season10-11-exact-two-partner-affinity-v1/groups.json";
import frozenManifestJson from "../../../../../analysis-snapshots/composition-affinity/season10-11-exact-two-partner-affinity-v1/manifest.json";

interface FrozenCharacterAffinityPageProps {
  params: Promise<{ locale: string }>;
}

interface FrozenMember {
  profileKey: string;
  characterCode: number;
  characterName: string;
  weapon: number;
  weaponName: string;
  role: string;
  firstOrderType: string;
  subtypeName?: string;
  membership: "primary" | "auxiliary";
  similarity: number | null;
  minimumSimilarity: number | null;
  sharedContexts: number;
}

interface SeasonSignal {
  season: number;
  games: number;
  positiveMembers: number;
  observedMembers: number;
  positiveRate: number | null;
}

interface SignatureContext {
  key: string;
  roleComposition: string;
  partnerTypes: Array<{ role: string; fitRole: string }>;
  positiveMembers: number;
  memberCount: number;
  coverage: number;
  games: number;
  adjustedResidual: number;
  seasonSignals: SeasonSignal[];
  seasonConsistency: "both-positive" | "insufficient";
}

interface FrozenGroup {
  id: string;
  role: string;
  kind: "core" | "independent";
  threshold: number;
  cohesion: number | null;
  minimumSimilarity: number | null;
  signatureContexts: SignatureContext[];
  seasonConsistency: "both-positive" | "insufficient";
  primaryMembers: FrozenMember[];
  auxiliaryMembers: FrozenMember[];
  label: string;
  editorialReasonKo?: string;
  editorialReasonEn?: string;
}

interface EditorialOverrides {
  replacedGroupIds: string[];
  mergedGroups: FrozenGroup[];
}

interface RoleSummary {
  role: string;
  profiles: number;
  observedThreshold: number;
  threshold: number;
  minimumSharedContexts: number;
  coreGroups: number;
  independentProfiles: number;
  initialGroups: number;
  iterations: number;
  converged: boolean;
  cycleDetected: boolean;
  isolatedProfiles: number;
  relocatedProfiles: number;
}

interface FrozenSnapshot {
  generatedAt: string;
  method: string;
  sourceMetric: string;
  seasons: number[];
  contextUnit: string;
  contextMinGames: number;
  similarity: {
    directionWeight: number;
    magnitudeWeight: number;
    overlapWeight: number;
    rolePercentile: number;
    mergeAverageMargin: number;
    relocationMargin: number;
    maxRefinementIterations: number;
    auxiliaryRatio: number;
  };
  roles: RoleSummary[];
  groups: FrozenGroup[];
}

interface FrozenManifest {
  snapshotId: string;
  frozenAt: string;
}

const snapshot = frozenGroupsJson as unknown as FrozenSnapshot;
const manifest = frozenManifestJson as FrozenManifest;
const editorialOverrides = editorialOverridesJson as unknown as EditorialOverrides;
const replacedGroupIds = new Set(editorialOverrides.replacedGroupIds);
const effectiveGroups = [
  ...snapshot.groups.filter((group) => !replacedGroupIds.has(group.id)),
  ...editorialOverrides.mergedGroups,
];

const ROLE_SLUGS: Record<string, string> = {
  탱커: "tanks",
  전사: "warriors",
  암살자: "assassins",
  스킬딜러: "skilldealers",
  "원거리 딜러": "rangers",
  지원가: "supports",
};

const COPY = {
  ko: {
    title: "실험체 유형 분석",
    lead: "내 실험체가 어떤 조합에서 강점을 보이는지, 비슷한 성향의 실험체와 함께 확인하세요.",
    description:
      "시즌 10·11에서 반복된 정확한 동료 2인 조합을 기준으로 114개 실험체·무기 프로필을 73개 유형으로 묶었습니다.",
    frozen: "시즌 10·11 고정 분석",
    groups: "유형",
    roles: "역할군",
    types: "유형",
    methodology: "검증 기준",
    methodologyToggle: "분석 기준 보기",
    methodologyBody:
      "시즌 10·11 통합 데이터에 입장료 보정과 판수 신뢰 보정을 적용했습니다. 이 화면은 저장된 유형 데이터만 읽습니다.",
    exactContext: "정확한 동료 2인 문맥",
    exactContextBody: "역할 조합 / 대상 직업 관점 / 동료 내부 역할군 A × 동료 내부 역할군 B",
    minGames: "문맥 최소 판수",
    similarity: "유사도 가중치",
    similarityBody: "방향 40% · 상승폭 35% · 문맥 중첩 25%",
    convergence: "반복 검증",
    convergenceBody: "격리·이동 후 소속이 연속 2회 같을 때 수렴",
    roleIndex: "역할군 찾기",
    browseHint: "유형을 열면 소속 실험체를 확인할 수 있습니다.",
    profiles: "실험체·무기",
    threshold: "유사도 경계",
    sharedContexts: "최소 공통 문맥",
    iterations: "반복",
    converged: "수렴",
    groupMembers: "이 유형의 실험체",
    auxiliaryMembers: "비슷한 성향의 실험체",
    auxiliaryHint: "유사도가 기준의 85% 이상인 참고 멤버이며, 주 유형은 바뀌지 않습니다.",
    firstOrderType: "1차 역할군",
    cohesion: "평균 유사도",
    minimumSimilarity: "최저 유사도",
    signatureContexts: "함께 강점을 보인 캐릭터",
    signatureHint: "유형별 캐릭터를 선택하면 상세 분석으로 이동합니다.",
    rpLift: "기준선 대비 RP",
    representativeEvidence: "대표 표본",
    games: "판",
    adjustedLift: "보정 상승폭",
    combinedPositive: "통합 상승",
    seasonPositive: "상승",
    seasonObserved: "관측",
    reliableSample: "신뢰",
    bothPositive: "두 시즌 전체 멤버 상승",
    bothSeasonsPartial: "두 시즌 신뢰 표본 · 일부 멤버",
    singleSeason: "한 시즌 신뢰 표본",
    seasonInsufficient: "시즌 신뢰 표본 없음",
    noObservation: "신뢰 표본 없음",
    totalGames: "통합 표본",
    openGroup: "유형 내용 보기",
    evidenceToggle: "함께 강점을 보인 캐릭터 보기",
    snapshotId: "스냅샷 ID",
    frozenAt: "고정 시각",
    sourceNote: "시즌 10·11의 정확한 동료 2인 조합 경향을 저장한 고정 데이터입니다.",
    typeTendencyTitle: "유형 설명",
    typeTendencyHint: "실제 스킬셋 성향과 시즌 10·11 조합 성과를 함께 요약했습니다.",
    combatTendencyTitle: "전투 성향",
    strongCompositionTitle: "강점을 보인 조합",
    typeCharacters: "해당 유형 실험체·무기",
    noTypeCharacters: "현재 이 유형에 등록된 캐릭터가 없습니다.",
    strengthCompositionPrefix: "대표적으로",
    strengthCompositionSuffix: "구성에서 강점을 보였습니다.",
    strengthPartnersPrefix: "특히",
    strengthPartnersSuffix: "조합과 함께할 때 성과가 올랐습니다.",
    noRepresentativeComposition: "현재 저장된 대표 조합이 없습니다.",
    independentGroup: "독립 유형",
    primaryMembership: "주 유형",
    auxiliaryMembership: "참고 유형",
    traitLabels: {
      engage: "교전 개시",
      dive: "후열 진입",
      peel: "받아치기",
      protect: "아군 보호",
      poke: "선제 견제",
      burst: "순간 화력",
      sustain: "지속 교전",
      zoneControl: "공간 장악",
    },
  },
  fallback: {
    title: "Character Type Analysis",
    lead: "See where your character performs best and which profiles share the same composition pattern.",
    description:
      "114 character-weapon profiles are organized into 73 types using recurring exact two-partner contexts from Seasons 10–11.",
    frozen: "Seasons 10–11 frozen analysis",
    groups: "Types",
    roles: "Roles",
    types: "Types",
    methodology: "Validation method",
    methodologyToggle: "View analysis method",
    methodologyBody:
      "Seasons 10–11 use entry-cost and sample-confidence adjustments. This page reads stored type data only.",
    exactContext: "Exact two-partner context",
    exactContextBody: "Role composition / focal role / partner type A × partner type B",
    minGames: "Minimum games",
    similarity: "Similarity weights",
    similarityBody: "Direction 40% · magnitude 35% · overlap 25%",
    convergence: "Iterative validation",
    convergenceBody: "Converged after two consecutive stable assignments",
    roleIndex: "Find a role",
    browseHint: "Open a type to see its member profiles.",
    profiles: "Character-weapons",
    threshold: "Threshold",
    sharedContexts: "Shared contexts",
    iterations: "Iterations",
    converged: "Converged",
    groupMembers: "Characters in this type",
    auxiliaryMembers: "Similar character profiles",
    auxiliaryHint:
      "Reference membership at 85% or more of the group threshold; it does not replace the primary group.",
    firstOrderType: "First-order type",
    cohesion: "Mean similarity",
    minimumSimilarity: "Minimum similarity",
    signatureContexts: "Characters that perform well together",
    signatureHint: "Select a character to open its detailed analysis.",
    rpLift: "RP vs. baseline",
    representativeEvidence: "Representative sample",
    games: "games",
    adjustedLift: "Adjusted lift",
    combinedPositive: "Combined positive",
    seasonPositive: "positive",
    seasonObserved: "observed",
    reliableSample: "Reliable",
    bothPositive: "All members positive in both seasons",
    bothSeasonsPartial: "Reliable data in both seasons · partial members",
    singleSeason: "Reliable data in one season",
    seasonInsufficient: "No reliable seasonal sample",
    noObservation: "No reliable sample",
    totalGames: "Combined sample",
    openGroup: "Open type details",
    evidenceToggle: "View characters that perform well together",
    snapshotId: "Snapshot ID",
    frozenAt: "Frozen at",
    sourceNote: "Frozen data for exact two-partner composition trends from Seasons 10–11.",
    typeTendencyTitle: "Type summary",
    typeTendencyHint:
      "This combines shared kit tendencies with composition performance from Seasons 10–11.",
    combatTendencyTitle: "Combat tendency",
    strongCompositionTitle: "Compositions where it performs well",
    typeCharacters: "Characters in this type",
    noTypeCharacters: "No characters are currently registered in this type.",
    strengthCompositionPrefix: "This type performed well in",
    strengthCompositionSuffix: "compositions.",
    strengthPartnersPrefix: "It improved most alongside",
    strengthPartnersSuffix: "partners.",
    noRepresentativeComposition: "No representative composition is currently stored.",
    independentGroup: "Independent type",
    primaryMembership: "Primary type",
    auxiliaryMembership: "Reference type",
    traitLabels: {
      engage: "Engage",
      dive: "Backline dive",
      peel: "Peel",
      protect: "Ally protection",
      poke: "Poke",
      burst: "Burst",
      sustain: "Sustained fight",
      zoneControl: "Zone control",
    },
  },
} as const;

const TRAIT_DESCRIPTIONS: Record<"ko" | "fallback", Record<CompositionTraitKey, string>> = {
  ko: {
    engage: "먼저 거리를 좁혀 교전을 여는 데 강합니다.",
    dive: "기동력을 활용해 노출된 후열이나 도주하는 대상을 추격합니다.",
    peel: "적의 진입을 끊고 아군이 대응할 시간을 만듭니다.",
    protect: "보호 수단으로 아군 핵심 딜러의 전투 시간을 늘립니다.",
    poke: "본격 교전 전에 원거리 압박으로 체력과 위치 우위를 만듭니다.",
    burst: "짧은 타이밍에 화력을 집중해 대상을 빠르게 마무리합니다.",
    sustain: "긴 교전에서 버티며 피해와 압박을 반복해서 이어갑니다.",
    zoneControl: "장판과 제어기로 이동 경로와 전투 공간을 제한합니다.",
  },
  fallback: {
    engage: "Excels at closing distance first and starting the fight.",
    dive: "Uses mobility to chase exposed backliners or fleeing targets.",
    peel: "Interrupts enemy entry and gives allies time to respond.",
    protect: "Uses protective tools to extend a key ally's damage uptime.",
    poke: "Builds health and position advantages before committing to a fight.",
    burst: "Concentrates damage in a short window to finish a target quickly.",
    sustain: "Stays effective through longer fights with repeated damage and pressure.",
    zoneControl: "Restricts movement routes and combat space with control tools.",
  },
};

function formatNumber(value: number, locale: RouteLocale) {
  return new Intl.NumberFormat(locale).format(value);
}

function formatRpChange(value: number, locale: RouteLocale) {
  const formatted = new Intl.NumberFormat(locale, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
  return `${value >= 0 ? "+" : ""}${formatted}`;
}

function formatMemberCount(value: number, locale: RouteLocale) {
  return locale === "ko" ? `${value}명` : `${value} members`;
}

function getGroupTendency(group: FrozenGroup, locale: RouteLocale) {
  const counts = new Map<CompositionTraitKey, number>();
  group.primaryMembers.forEach((member) => {
    getCharacterCompositionTraits({
      character: member.characterCode,
      weapon: member.weapon,
    }).forEach((trait) => counts.set(trait, (counts.get(trait) ?? 0) + 1));
  });

  const traits = [...counts.entries()].sort((left, right) => right[1] - left[1]).slice(0, 2);
  const descriptionLocale = locale === "ko" ? "ko" : "fallback";

  if (traits.length === 0) {
    return {
      traits: [] as CompositionTraitKey[],
      summary:
        locale === "ko"
          ? "현재 저장된 스킬셋 성향 정보가 없습니다. 대표 조합과 함께 강한 캐릭터를 확인하세요."
          : "No stored kit tendency is available. Review the representative compositions and partner characters below.",
    };
  }

  const labels = traits.map(([trait]) =>
    locale === "ko" ? COPY.ko.traitLabels[trait] : COPY.fallback.traitLabels[trait]
  );
  const descriptions = traits
    .map(([trait]) => TRAIT_DESCRIPTIONS[descriptionLocale][trait])
    .join(" ");

  return {
    traits: traits.map(([trait]) => trait),
    summary:
      locale === "ko"
        ? `이 유형은 ${labels.join("·")} 성향을 중심으로 싸웁니다. ${descriptions}`
        : `This type focuses on ${labels.join(" and ")}. ${descriptions}`,
  };
}

function getGroupStrengthSummary(group: FrozenGroup) {
  const context = group.signatureContexts[0];
  return { context: context ?? null };
}

function formatPartnerTypeLabel(role: string, fitRole: string, locale: RouteLocale) {
  if (locale !== "ko") return `${fitRole} ${role}`;

  const normalizedType = fitRole.replace(/\s+/g, "");
  const typedType = normalizedType.endsWith("형") ? normalizedType : `${normalizedType}형`;
  return `${typedType} ${role}`;
}

function PartnerTypeTooltip({
  role,
  fitRole,
  locale,
  copy,
}: {
  role: string;
  fitRole: string;
  locale: RouteLocale;
  copy: (typeof COPY)["ko"] | (typeof COPY)["fallback"];
}) {
  const label = formatPartnerTypeLabel(role, fitRole, locale);
  const members = getCharacterAffinityTypeMembers(role, fitRole).toSorted(
    (left, right) =>
      left.characterName.localeCompare(right.characterName, locale === "ko" ? "ko" : "en") ||
      left.weaponName.localeCompare(right.weaponName, locale === "ko" ? "ko" : "en")
  );

  if (members.length === 0) return <span className="font-semibold">{label}</span>;

  return (
    <span className="group/partner relative inline-block">
      <button
        type="button"
        className="rounded-sm border-b border-dashed border-[var(--color-muted-foreground)] font-semibold text-[var(--color-foreground)] outline-none transition-colors hover:text-[var(--color-accent-foreground)] focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]"
        aria-label={`${label}, ${copy.typeCharacters} ${formatNumber(members.length, locale)}`}
      >
        {label}
      </button>
      <span
        role="tooltip"
        className="pointer-events-auto invisible fixed inset-x-4 top-1/2 z-[1000] w-auto -translate-y-1/2 rounded-md border border-[var(--color-border-light)] bg-[var(--color-surface)] p-3 opacity-0 shadow-xl transition group-hover/partner:visible group-hover/partner:opacity-100 group-focus-within/partner:visible group-focus-within/partner:opacity-100 sm:inset-x-auto sm:left-1/2 sm:w-[min(22rem,calc(100vw-3rem))] sm:-translate-x-1/2"
      >
        <strong className="block text-sm text-[var(--color-foreground)]">{label}</strong>
        <span className="mt-1 block text-[10px] font-semibold text-[var(--color-muted-foreground)]">
          {copy.typeCharacters} · {formatNumber(members.length, locale)}
        </span>
        <span className="mt-2 grid grid-cols-2 gap-1.5">
          {members.map((member) => (
            <Link
              key={member.profileKey}
              href={`/${locale}/character/${member.characterCode}${
                member.weapon == null ? "" : `?weapon=${member.weapon}`
              }`}
              className="flex min-w-0 items-center gap-2 rounded border border-[var(--color-border)] bg-[var(--color-surface-2)] p-1.5 text-[var(--color-foreground)] transition-colors hover:border-[var(--color-accent)] hover:bg-[var(--color-surface-3)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]"
            >
              <Image
                src={getCharacterMiniWebpUrl(member.characterCode)}
                alt=""
                width={32}
                height={32}
                className="h-8 w-8 shrink-0 rounded object-cover"
              />
              <span className="min-w-0">
                <strong className="block truncate text-[11px] font-semibold">
                  {member.characterName}
                </strong>
                <span className="mt-0.5 block truncate text-[10px] text-[var(--color-muted-foreground)]">
                  {member.weaponName}
                </span>
              </span>
            </Link>
          ))}
        </span>
      </span>
    </span>
  );
}

function PartnerTypeCharacterList({
  role,
  fitRole,
  locale,
  copy,
}: {
  role: string;
  fitRole: string;
  locale: RouteLocale;
  copy: (typeof COPY)["ko"] | (typeof COPY)["fallback"];
}) {
  const label = formatPartnerTypeLabel(role, fitRole, locale);
  const members = getCharacterAffinityTypeMembers(role, fitRole).toSorted(
    (left, right) =>
      left.characterName.localeCompare(right.characterName, locale === "ko" ? "ko" : "en") ||
      left.weaponName.localeCompare(right.weaponName, locale === "ko" ? "ko" : "en")
  );

  return (
    <section className="min-w-0 rounded-md border border-[var(--color-border)] bg-[var(--color-surface-2)] p-3">
      <h5 className="text-xs font-bold text-[var(--color-foreground)]">{label}</h5>
      {members.length > 0 ? (
        <ul className="mt-2 grid min-w-0 gap-1.5 sm:grid-cols-2">
          {members.map((member) => (
            <li key={member.profileKey}>
              <Link
                href={`/${locale}/character/${member.characterCode}${
                  member.weapon == null ? "" : `?weapon=${member.weapon}`
                }`}
                className="group flex min-w-0 items-center gap-2 rounded bg-[var(--color-surface)] p-2 outline-none transition-colors hover:bg-[var(--color-surface-3)] focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]"
              >
                <Image
                  src={getCharacterMiniWebpUrl(member.characterCode)}
                  alt=""
                  width={36}
                  height={36}
                  className="h-9 w-9 shrink-0 rounded object-cover"
                />
                <span className="min-w-0 flex-1">
                  <strong className="block truncate text-xs text-[var(--color-foreground)]">
                    {member.characterName}
                  </strong>
                  <span className="mt-0.5 block truncate text-[11px] text-[var(--color-muted-foreground)]">
                    {member.weaponName}
                  </span>
                </span>
                <ArrowUpRight className="h-3.5 w-3.5 shrink-0 text-[var(--color-muted-foreground)] group-hover:text-[var(--color-accent-foreground)]" />
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-2 text-xs leading-5 text-[var(--color-muted-foreground)]">
          {copy.noTypeCharacters}
        </p>
      )}
    </section>
  );
}

function MemberList({
  members,
  locale,
  label,
  group,
  copy,
}: {
  members: FrozenMember[];
  locale: RouteLocale;
  label: string;
  group: FrozenGroup;
  copy: (typeof COPY)["ko"] | (typeof COPY)["fallback"];
}) {
  if (members.length === 0) return null;

  return (
    <div>
      <h4 className="text-sm font-bold text-[var(--color-foreground)]">{label}</h4>
      <ul className="mt-2 grid min-w-0 gap-2 sm:grid-cols-2 xl:grid-cols-3">
        {members.map((member) => (
          <li key={member.profileKey}>
            <Link
              href={`/${locale}/character/${member.characterCode}?weapon=${member.weapon}`}
              className="group flex min-h-16 min-w-0 items-center gap-3 rounded-md bg-[var(--color-surface-2)] p-2.5 outline-none transition-colors hover:bg-[var(--color-surface-3)] focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] active:bg-[var(--color-surface-3)]"
            >
              <Image
                src={getCharacterMiniWebpUrl(member.characterCode)}
                alt=""
                width={40}
                height={40}
                className="h-10 w-10 shrink-0 rounded object-cover"
              />
              <span className="min-w-0 flex-1">
                <span className="flex min-w-0 items-center gap-1.5">
                  <strong className="truncate text-sm text-[var(--color-foreground)]">
                    {member.characterName}
                  </strong>
                  <span className="shrink-0 text-xs text-[var(--color-muted-foreground)]">
                    {member.weaponName}
                  </span>
                </span>
                <span className="mt-0.5 block truncate text-xs text-[var(--color-muted-foreground)]">
                  {member.subtypeName ?? member.firstOrderType}
                </span>
                <span className="mt-1 block text-[11px] font-semibold text-[var(--color-foreground)]">
                  {member.membership === "auxiliary"
                    ? copy.auxiliaryMembership
                    : group.kind === "independent"
                      ? copy.independentGroup
                      : copy.primaryMembership}
                </span>
              </span>
              <ArrowUpRight className="h-3.5 w-3.5 shrink-0 text-[var(--color-muted-foreground)] group-hover:text-[var(--color-accent-foreground)]" />
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

function GroupDisclosure({
  group,
  locale,
  copy,
  open,
}: {
  group: FrozenGroup;
  locale: RouteLocale;
  copy: (typeof COPY)["ko"] | (typeof COPY)["fallback"];
  open?: boolean;
}) {
  const displayName = getCharacterAffinityGroupName(group, locale);
  const memberSummary = group.primaryMembers
    .map((member) => `${member.characterName} ${member.weaponName}`)
    .join(" · ");
  const tendency = getGroupTendency(group, locale);
  const strength = getGroupStrengthSummary(group);

  return (
    <details
      open={open}
      className="group min-w-0 rounded-md border border-[var(--color-border)] bg-[var(--color-surface)]"
    >
      <summary className="flex min-h-16 cursor-pointer list-none items-center gap-3 px-3 py-3 outline-none marker:hidden hover:bg-[var(--color-surface-2)] focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--color-accent)] active:bg-[var(--color-surface-3)] sm:px-4 [&::-webkit-details-marker]:hidden">
        <span className="flex w-[4.25rem] shrink-0 -space-x-2">
          {group.primaryMembers.slice(0, 3).map((member) => (
            <Image
              key={member.profileKey}
              src={getCharacterMiniWebpUrl(member.characterCode)}
              alt=""
              width={32}
              height={32}
              className="h-8 w-8 rounded-full border-2 border-[var(--color-surface)] object-cover"
            />
          ))}
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex min-w-0 items-baseline gap-2">
            <h3 className="truncate whitespace-nowrap text-sm font-bold leading-5 text-[var(--color-foreground)] sm:text-base">
              {displayName}
            </h3>
            <span className="shrink-0 text-xs tabular-nums text-[var(--color-muted-foreground)]">
              {formatMemberCount(group.primaryMembers.length, locale)}
            </span>
          </span>
          <span className="mt-1 block truncate whitespace-nowrap text-xs text-[var(--color-muted-foreground)]">
            {memberSummary}
          </span>
        </span>
        <span className="sr-only">{copy.openGroup}</span>
        <ChevronDown className="h-4 w-4 shrink-0 text-[var(--color-muted-foreground)] transition-transform duration-200 group-open:rotate-180" />
      </summary>

      <div className="border-t border-[var(--color-border)] px-3 py-5 sm:px-4">
        <div className="border-y border-[var(--color-border)] py-4">
          <h4 className="text-sm font-bold text-[var(--color-foreground)]">
            {copy.typeTendencyTitle}
          </h4>
          <p className="mt-1 text-xs leading-5 text-[var(--color-muted-foreground)]">
            {copy.typeTendencyHint}
          </p>

          <div className="mt-4 border-l-2 border-[var(--color-accent)] pl-3">
            <p className="text-xs font-bold text-[var(--color-muted-foreground)]">
              {copy.combatTendencyTitle}
            </p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {tendency.traits.map((trait) => (
                <span
                  key={trait}
                  className="rounded bg-[var(--color-surface-2)] px-2 py-1 text-xs font-semibold text-[var(--color-foreground)]"
                >
                  {copy.traitLabels[trait]}
                </span>
              ))}
            </div>
            <p className="mt-2 text-sm leading-6 text-[var(--color-foreground)]">
              {tendency.summary}
            </p>
          </div>

          <div className="mt-4 border-l-2 border-[var(--color-accent)] pl-3">
            <p className="text-xs font-bold text-[var(--color-muted-foreground)]">
              {copy.strongCompositionTitle}
            </p>
            <p className="mt-1 text-sm leading-6 text-[var(--color-foreground)]">
              {strength.context ? (
                <>
                  {copy.strengthCompositionPrefix}{" "}
                  <strong>{strength.context.roleComposition}</strong>{" "}
                  {copy.strengthCompositionSuffix} {copy.strengthPartnersPrefix}{" "}
                  {strength.context.partnerTypes.map((partner, index) => (
                    <span key={`${partner.role}:${partner.fitRole}:${index}`}>
                      {index > 0 ? " + " : null}
                      <PartnerTypeTooltip
                        role={partner.role}
                        fitRole={partner.fitRole}
                        locale={locale}
                        copy={copy}
                      />
                    </span>
                  ))}{" "}
                  {copy.strengthPartnersSuffix}
                </>
              ) : (
                copy.noRepresentativeComposition
              )}
            </p>
          </div>
        </div>

        <div className="mt-5 grid gap-5">
          <MemberList
            members={group.primaryMembers}
            locale={locale}
            label={copy.groupMembers}
            group={group}
            copy={copy}
          />
          {group.auxiliaryMembers.length > 0 ? (
            <div>
              <MemberList
                members={group.auxiliaryMembers}
                locale={locale}
                label={copy.auxiliaryMembers}
                group={group}
                copy={copy}
              />
              <p className="mt-2 text-xs leading-5 text-[var(--color-muted-foreground)]">
                {copy.auxiliaryHint}
              </p>
            </div>
          ) : null}
        </div>

        <details className="group/evidence mt-5 border-y border-[var(--color-border)]">
          <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 py-2 text-sm font-bold text-[var(--color-foreground)] outline-none marker:hidden hover:text-[var(--color-accent-foreground)] focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] active:text-[var(--color-foreground)] [&::-webkit-details-marker]:hidden">
            <span className="truncate whitespace-nowrap">{copy.evidenceToggle}</span>
            <ChevronDown className="h-4 w-4 shrink-0 text-[var(--color-muted-foreground)] transition-transform duration-200 group-open/evidence:rotate-180" />
          </summary>
          <div className="border-t border-[var(--color-border)] pb-4 pt-4">
            <h4 className="text-xs font-bold text-[var(--color-muted-foreground)]">
              {copy.signatureContexts}
            </h4>
            <p className="mt-1 text-xs leading-5 text-[var(--color-muted-foreground)]">
              {copy.signatureHint}
            </p>
            <ol className="mt-2 divide-y divide-[var(--color-border)] border-y border-[var(--color-border)]">
              {group.signatureContexts.map((context) => (
                <li key={context.key} className="min-w-0 py-4">
                  <div className="flex min-w-0 flex-wrap items-center justify-between gap-2">
                    <p className="min-w-0 text-sm font-bold leading-6 text-[var(--color-foreground)]">
                      {context.partnerTypes
                        .map((partner) =>
                          formatPartnerTypeLabel(partner.role, partner.fitRole, locale)
                        )
                        .join(" × ")}
                    </p>
                    <span className="shrink-0 rounded bg-[var(--color-accent-soft)] px-2 py-1 text-xs font-bold tabular-nums text-[var(--color-accent-foreground)]">
                      {copy.rpLift} {formatRpChange(context.adjustedResidual, locale)}
                    </span>
                  </div>
                  <div className="mt-3 grid min-w-0 gap-3 lg:grid-cols-2">
                    {context.partnerTypes.map((partner, partnerIndex) => (
                      <PartnerTypeCharacterList
                        key={`${partner.role}:${partner.fitRole}:${partnerIndex}`}
                        role={partner.role}
                        fitRole={partner.fitRole}
                        locale={locale}
                        copy={copy}
                      />
                    ))}
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </details>
      </div>
    </details>
  );
}

export default async function FrozenCharacterAffinityPage({
  params,
}: FrozenCharacterAffinityPageProps) {
  const { locale: localeParam } = await params;
  if (!isRouteLocale(localeParam)) notFound();
  setRequestLocale(localeParam);
  const locale = localeParam as RouteLocale;
  const copy = locale === "ko" ? COPY.ko : COPY.fallback;

  const profileCount = new Set(
    effectiveGroups.flatMap((group) => group.primaryMembers.map((member) => member.profileKey))
  ).size;

  return (
    <main className="page-shell mx-auto flex max-w-7xl flex-col gap-8 px-4 py-8 sm:px-5 sm:py-10">
      <header className="grid min-w-0 gap-6 border-b border-[var(--color-border)] pb-7 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
        <div className="min-w-0">
          <span className="dashboard-kicker">{copy.frozen}</span>
          <h1 className="mt-4 min-w-0 [overflow-wrap:anywhere] text-3xl font-bold tracking-[-0.035em] text-[var(--color-foreground)] sm:text-4xl">
            {copy.title}
          </h1>
          <p className="mt-4 max-w-2xl text-base font-bold leading-7 text-[var(--color-foreground)] sm:text-lg">
            {copy.lead}
          </p>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--color-muted-foreground)]">
            {copy.description}
          </p>
        </div>

        <dl className="grid grid-cols-3 divide-x divide-[var(--color-border)] border-y border-[var(--color-border)] lg:min-w-[23rem]">
          {[
            [copy.groups, effectiveGroups.length],
            [copy.profiles, profileCount],
            [copy.roles, snapshot.roles.length],
          ].map(([label, value]) => (
            <div key={label} className="min-w-0 px-3 py-3 sm:px-4">
              <dt className="truncate text-xs text-[var(--color-muted-foreground)]">{label}</dt>
              <dd className="mt-1 text-xl font-bold tabular-nums text-[var(--color-foreground)]">
                {value}
              </dd>
            </div>
          ))}
        </dl>
      </header>

      <div className="grid min-w-0 gap-8 lg:grid-cols-[15rem_minmax(0,1fr)] lg:items-start">
        <aside className="grid min-w-0 gap-3 lg:sticky lg:top-24">
          <nav className="dashboard-panel overflow-hidden p-2" aria-label={copy.roleIndex}>
            <p className="px-2 py-2 text-xs font-bold text-[var(--color-muted-foreground)]">
              {copy.roleIndex}
            </p>
            <div className="grid grid-cols-2 gap-1 sm:grid-cols-3 lg:grid-cols-1">
              {snapshot.roles.map((role) => {
                const roleGroupCount = effectiveGroups.filter(
                  (group) => group.role === role.role
                ).length;

                return (
                  <a
                    key={role.role}
                    href={`#role-${ROLE_SLUGS[role.role]}`}
                    className="flex min-h-11 min-w-0 items-center justify-between gap-2 rounded-md px-3 py-2 text-sm font-bold whitespace-nowrap text-[var(--color-foreground)] outline-none transition-colors hover:bg-[var(--color-surface-2)] focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] active:bg-[var(--color-surface-3)]"
                  >
                    <span className="truncate">{role.role}</span>
                    <span className="shrink-0 text-xs tabular-nums text-[var(--color-muted-foreground)]">
                      {roleGroupCount}
                    </span>
                  </a>
                );
              })}
            </div>
          </nav>

          <details className="group dashboard-panel overflow-hidden">
            <summary className="flex min-h-12 cursor-pointer list-none items-center gap-3 px-3 py-2 outline-none marker:hidden hover:bg-[var(--color-surface-2)] focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--color-accent)] active:bg-[var(--color-surface-3)] [&::-webkit-details-marker]:hidden">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-[var(--color-surface-2)] text-[var(--color-accent-foreground)]">
                <FlaskConical className="h-4 w-4" />
              </span>
              <span className="min-w-0 flex-1 truncate whitespace-nowrap text-sm font-bold text-[var(--color-foreground)]">
                {copy.methodologyToggle}
              </span>
              <ChevronDown className="h-4 w-4 shrink-0 text-[var(--color-muted-foreground)] transition-transform duration-200 group-open:rotate-180" />
            </summary>
            <div className="border-t border-[var(--color-border)] px-3 py-4">
              <h2 className="text-base font-bold text-[var(--color-foreground)]">
                {copy.methodology}
              </h2>
              <p className="mt-2 text-sm leading-6 text-[var(--color-muted-foreground)]">
                {copy.methodologyBody}
              </p>
              <dl className="mt-4 divide-y divide-[var(--color-border)] border-y border-[var(--color-border)]">
                {[
                  [copy.exactContext, copy.exactContextBody],
                  [
                    copy.minGames,
                    `${formatNumber(snapshot.contextMinGames, locale)} ${copy.games}`,
                  ],
                  [copy.similarity, copy.similarityBody],
                  [copy.convergence, copy.convergenceBody],
                ].map(([label, value]) => (
                  <div key={label} className="py-3">
                    <dt className="text-xs font-bold text-[var(--color-foreground)]">{label}</dt>
                    <dd className="mt-1 text-xs leading-5 text-[var(--color-muted-foreground)]">
                      {value}
                    </dd>
                  </div>
                ))}
              </dl>
              <dl className="mt-4 grid gap-3 text-xs text-[var(--color-muted-foreground)]">
                <div>
                  <dt>{copy.snapshotId}</dt>
                  <dd className="mt-0.5 break-all font-mono text-[var(--color-foreground)]">
                    {manifest.snapshotId}
                  </dd>
                </div>
                <div>
                  <dt>{copy.frozenAt}</dt>
                  <dd className="mt-0.5 tabular-nums text-[var(--color-foreground)]">
                    {new Intl.DateTimeFormat(locale, {
                      dateStyle: "medium",
                      timeStyle: "short",
                      timeZone: "Asia/Seoul",
                    }).format(new Date(manifest.frozenAt))}
                  </dd>
                </div>
              </dl>
            </div>
          </details>
        </aside>

        <div className="grid min-w-0 gap-10">
          <p className="text-sm leading-6 text-[var(--color-muted-foreground)]">
            {copy.browseHint}
          </p>

          {snapshot.roles.map((role) => {
            const roleGroups = effectiveGroups.filter((group) => group.role === role.role);
            const unifiedGroups = [...roleGroups].sort(
              (left, right) =>
                getCharacterAffinityGroupName(left, locale).localeCompare(
                  getCharacterAffinityGroupName(right, locale),
                  "ko"
                ) || left.id.localeCompare(right.id, "ko")
            );

            return (
              <section
                key={role.role}
                id={`role-${ROLE_SLUGS[role.role]}`}
                className="min-w-0 scroll-mt-28"
                aria-labelledby={`role-${ROLE_SLUGS[role.role]}-title`}
              >
                <header className="mb-3 flex min-w-0 flex-wrap items-center justify-between gap-3 border-b border-[var(--color-border)] pb-3">
                  <div className="flex min-w-0 items-center gap-2">
                    <h2
                      id={`role-${ROLE_SLUGS[role.role]}-title`}
                      className="truncate text-2xl font-bold tracking-tight text-[var(--color-foreground)]"
                    >
                      {role.role}
                    </h2>
                    {role.converged ? (
                      <span className="inline-flex shrink-0 items-center gap-1 text-xs font-semibold text-[var(--color-success)]">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        {copy.converged}
                      </span>
                    ) : null}
                  </div>
                  <p className="shrink-0 text-xs tabular-nums text-[var(--color-muted-foreground)]">
                    {copy.types} {roleGroups.length} · {copy.profiles} {role.profiles}
                  </p>
                </header>

                <div className="grid min-w-0 gap-2">
                  {unifiedGroups.map((group) => (
                    <GroupDisclosure key={group.id} group={group} locale={locale} copy={copy} />
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      </div>

      <footer className="flex items-start gap-3 border-t border-[var(--color-border)] pt-5">
        <Users className="mt-0.5 h-4 w-4 shrink-0 text-[var(--color-muted-foreground)]" />
        <p className="text-xs leading-5 text-[var(--color-muted-foreground)]">{copy.sourceNote}</p>
      </footer>
    </main>
  );
}
