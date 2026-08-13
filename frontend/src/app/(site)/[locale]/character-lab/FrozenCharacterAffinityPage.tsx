/* Hallmark · pre-emit critique: P5 H5 E5 S5 R5 V5 · genre: modern-minimal · macrostructure: Index-First · theme: Mineral Signal · enrichment: none · nav: N1b · footer: Ft4 · contrast/slop/honesty/tokens/responsive/mobile: pass */
import { ArrowUpRight, CheckCircle2, FlaskConical, Users } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { isRouteLocale, type RouteLocale } from "@/i18n/routing";
import { getCharacterAffinityGroupName } from "@/lib/characterAffinity";
import { getCharacterMiniWebpUrl } from "@/lib/characterMap";
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
    title: "신규 실험체 유형 분석",
    lead: "114개 실험체·무기 프로필을 정확한 동료 2인 조합으로 다시 묶었습니다.",
    description:
      "한 동료만 같은 조합은 제외하고, 동료 내부 역할군 A × B의 방향과 상승폭이 반복되는 프로필만 같은 성향군으로 분류했습니다.",
    frozen: "고정본 v1",
    groups: "최종 성향군",
    roles: "직업군",
    types: "유형",
    methodology: "검증 기준",
    methodologyBody:
      "시즌 10·11 통합 데이터에 입장료 보정과 판수 신뢰 보정을 적용했습니다. 이 화면은 저장된 유형 데이터만 읽습니다.",
    exactContext: "정확한 동료 2인 문맥",
    exactContextBody: "역할 조합 / 대상 직업 관점 / 동료 내부 역할군 A × 동료 내부 역할군 B",
    minGames: "문맥 최소 판수",
    similarity: "유사도 가중치",
    similarityBody: "방향 40% · 상승폭 35% · 문맥 중첩 25%",
    convergence: "반복 검증",
    convergenceBody: "격리·이동 후 소속이 연속 2회 같을 때 수렴",
    roleIndex: "직업군 바로가기",
    profiles: "프로필",
    threshold: "유사도 경계",
    sharedContexts: "최소 공통 문맥",
    iterations: "반복",
    converged: "수렴",
    groupMembers: "주 소속",
    auxiliaryMembers: "보조 소속",
    auxiliaryHint: "현재 그룹 경계의 85% 이상 유사한 참고 소속이며 주 소속을 바꾸지 않습니다.",
    firstOrderType: "1차 역할군",
    cohesion: "평균 유사도",
    minimumSimilarity: "최저 유사도",
    signatureContexts: "대표 정확 조합 5개",
    representativeEvidence: "대표 조합 근거",
    games: "판",
    adjustedLift: "보정 상승폭",
    positiveMembers: "상승 멤버",
    bothPositive: "시즌 10·11 모두 상승",
    seasonInsufficient: "시즌 교차 근거 부족",
    openGroup: "멤버와 대표 조합 보기",
    snapshotId: "스냅샷 ID",
    frozenAt: "고정 시각",
    sourceNote: "시즌 10·11의 정확한 동료 2인 조합 경향을 저장한 고정 데이터입니다.",
  },
  fallback: {
    title: "New Character Role Analysis",
    lead: "114 character-weapon profiles grouped by exact two-partner contexts.",
    description:
      "Profiles share a group only when the exact partner-type A × B context repeatedly matches in direction and lift.",
    frozen: "Frozen v1",
    groups: "Final groups",
    roles: "Roles",
    types: "Types",
    methodology: "Validation method",
    methodologyBody:
      "Seasons 10–11 use entry-cost and sample-confidence adjustments. This page reads stored type data only.",
    exactContext: "Exact two-partner context",
    exactContextBody: "Role composition / focal role / partner type A × partner type B",
    minGames: "Minimum games",
    similarity: "Similarity weights",
    similarityBody: "Direction 40% · magnitude 35% · overlap 25%",
    convergence: "Iterative validation",
    convergenceBody: "Converged after two consecutive stable assignments",
    roleIndex: "Role index",
    profiles: "Profiles",
    threshold: "Threshold",
    sharedContexts: "Shared contexts",
    iterations: "Iterations",
    converged: "Converged",
    groupMembers: "Primary members",
    auxiliaryMembers: "Auxiliary members",
    auxiliaryHint:
      "Reference membership at 85% or more of the group threshold; it does not replace the primary group.",
    firstOrderType: "First-order type",
    cohesion: "Mean similarity",
    minimumSimilarity: "Minimum similarity",
    signatureContexts: "Five signature contexts",
    representativeEvidence: "Representative composition evidence",
    games: "games",
    adjustedLift: "Adjusted lift",
    positiveMembers: "Positive members",
    bothPositive: "Positive in Seasons 10 and 11",
    seasonInsufficient: "Limited cross-season evidence",
    openGroup: "Open members and contexts",
    snapshotId: "Snapshot ID",
    frozenAt: "Frozen at",
    sourceNote: "Frozen data for exact two-partner composition trends from Seasons 10–11.",
  },
} as const;

function formatPercent(value: number | null, locale: RouteLocale) {
  if (value == null) return "—";
  return `${new Intl.NumberFormat(locale, { maximumFractionDigits: 1 }).format(value * 100)}%`;
}

function formatNumber(value: number, locale: RouteLocale) {
  return new Intl.NumberFormat(locale).format(value);
}

function formatRp(value: number, locale: RouteLocale) {
  const formatted = new Intl.NumberFormat(locale, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
  return `${value >= 0 ? "+" : ""}${formatted} RP`;
}

function MemberList({
  members,
  locale,
  label,
}: {
  members: FrozenMember[];
  locale: RouteLocale;
  label: string;
}) {
  if (members.length === 0) return null;

  return (
    <div>
      <h4 className="text-xs font-bold text-[var(--color-muted-foreground)]">{label}</h4>
      <ul className="mt-2 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
        {members.map((member) => (
          <li key={member.profileKey}>
            <Link
              href={`/${locale}/character/${member.characterCode}`}
              className="group flex min-h-14 min-w-0 items-center gap-3 rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] p-2.5 outline-none transition-colors hover:border-[var(--color-border-light)] hover:bg-[var(--color-surface-2)] focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] active:bg-[var(--color-surface-3)]"
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
    .join(", ");

  return (
    <details
      open={open}
      className="group rounded-md border border-[var(--color-border)] bg-[var(--color-surface)]"
    >
      <summary className="flex min-h-14 cursor-pointer list-none items-center gap-3 px-3 py-3 outline-none marker:hidden focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--color-accent)] sm:px-4 [&::-webkit-details-marker]:hidden">
        <span className="min-w-0 flex-1 truncate whitespace-nowrap text-sm font-bold leading-5 text-[var(--color-foreground)]">
          {displayName}
          <span className="font-normal text-[var(--color-muted-foreground)]">
            {` · ${memberSummary}`}
          </span>
        </span>
        <span className="hidden shrink-0 text-xs text-[var(--color-muted-foreground)] sm:block">
          {copy.openGroup}
        </span>
        <span className="text-lg leading-none text-[var(--color-muted-foreground)] group-open:rotate-45">
          +
        </span>
      </summary>

      <div className="border-t border-[var(--color-border)] px-3 py-4 sm:px-4">
        <div className="mb-4">
          <h3 className="text-base font-bold leading-6 text-[var(--color-foreground)]">
            {displayName}
          </h3>
          <p className="mt-1 text-xs font-bold text-[var(--color-muted-foreground)]">
            {copy.representativeEvidence}
          </p>
          <p className="mt-1 text-sm leading-6 text-[var(--color-foreground)]">{group.label}</p>
        </div>
        <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-md border border-[var(--color-border)] bg-[var(--color-border)] text-xs sm:grid-cols-4">
          {[
            [copy.profiles, group.primaryMembers.length.toString()],
            [copy.cohesion, formatPercent(group.cohesion, locale)],
            [copy.minimumSimilarity, formatPercent(group.minimumSimilarity, locale)],
            [copy.threshold, formatPercent(group.threshold, locale)],
          ].map(([label, value]) => (
            <div key={label} className="bg-[var(--color-surface-2)] p-3">
              <dt className="text-[var(--color-muted-foreground)]">{label}</dt>
              <dd className="mt-1 font-bold tabular-nums text-[var(--color-foreground)]">
                {value}
              </dd>
            </div>
          ))}
        </dl>

        <div className="mt-4 grid gap-4">
          <MemberList members={group.primaryMembers} locale={locale} label={copy.groupMembers} />
          {group.auxiliaryMembers.length > 0 ? (
            <div>
              <MemberList
                members={group.auxiliaryMembers}
                locale={locale}
                label={copy.auxiliaryMembers}
              />
              <p className="mt-2 text-xs leading-5 text-[var(--color-muted-foreground)]">
                {copy.auxiliaryHint}
              </p>
            </div>
          ) : null}
        </div>

        <div className="mt-5">
          <h4 className="text-xs font-bold text-[var(--color-muted-foreground)]">
            {copy.signatureContexts}
          </h4>
          <ol className="mt-2 divide-y divide-[var(--color-border)] border-y border-[var(--color-border)]">
            {group.signatureContexts.map((context) => (
              <li key={context.key} className="grid gap-3 py-3 lg:grid-cols-[minmax(0,1fr)_auto]">
                <div className="min-w-0">
                  <p className="text-sm font-semibold leading-5 text-[var(--color-foreground)]">
                    {context.partnerTypes
                      .map((partner) => `${partner.role} ${partner.fitRole}`)
                      .join(" × ")}
                  </p>
                  <p className="mt-1 text-xs text-[var(--color-muted-foreground)]">
                    {context.roleComposition}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    <span className="rounded border border-[var(--color-border)] px-2 py-1 text-xs text-[var(--color-muted-foreground)]">
                      {copy.positiveMembers} {context.positiveMembers}/{context.memberCount}
                    </span>
                    <span className="rounded border border-[var(--color-border)] px-2 py-1 text-xs text-[var(--color-muted-foreground)]">
                      {context.seasonConsistency === "both-positive"
                        ? copy.bothPositive
                        : copy.seasonInsufficient}
                    </span>
                    {context.seasonSignals.map((signal) => (
                      <span
                        key={signal.season}
                        className="rounded border border-[var(--color-border)] px-2 py-1 text-xs tabular-nums text-[var(--color-muted-foreground)]"
                      >
                        S{signal.season} {formatNumber(signal.games, locale)}
                      </span>
                    ))}
                  </div>
                </div>
                <dl className="flex items-end gap-5 lg:justify-end">
                  <div>
                    <dt className="text-xs text-[var(--color-muted-foreground)]">{copy.games}</dt>
                    <dd className="mt-0.5 text-sm font-bold tabular-nums text-[var(--color-foreground)]">
                      {formatNumber(context.games, locale)}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs text-[var(--color-muted-foreground)]">
                      {copy.adjustedLift}
                    </dt>
                    <dd className="mt-0.5 text-sm font-bold tabular-nums text-[var(--color-accent-foreground)]">
                      {formatRp(context.adjustedResidual, locale)}
                    </dd>
                  </div>
                </dl>
              </li>
            ))}
          </ol>
        </div>
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
    <main className="page-shell mx-auto flex max-w-7xl flex-col gap-5 px-3 py-6 sm:px-5 sm:py-8">
      <header className="dashboard-panel overflow-hidden">
        <div className="grid gap-5 p-4 sm:p-6 lg:grid-cols-[minmax(0,0.7fr)_minmax(20rem,1fr)] lg:items-end">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="dashboard-kicker">{copy.frozen}</span>
              <span className="text-xs text-[var(--color-muted-foreground)]">
                {snapshot.seasons.join(" + ")}
              </span>
            </div>
            <p className="mt-4 font-mono text-[clamp(4.5rem,16vw,10rem)] font-bold leading-[0.82] tracking-[-0.08em] tabular-nums text-[var(--color-foreground)]">
              {profileCount}
            </p>
          </div>
          <div className="min-w-0 border-t border-[var(--color-border)] pt-4 lg:border-l lg:border-t-0 lg:pl-6 lg:pt-0">
            <h1 className="min-w-0 [overflow-wrap:anywhere] text-2xl font-bold tracking-tight text-[var(--color-foreground)] sm:text-3xl">
              {copy.title}
            </h1>
            <p className="mt-3 max-w-2xl text-base font-semibold leading-7 text-[var(--color-foreground)]">
              {copy.lead}
            </p>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--color-muted-foreground)]">
              {copy.description}
            </p>
          </div>
        </div>
        <dl className="grid grid-cols-3 border-t border-[var(--color-border)] bg-[var(--color-surface-2)]">
          {[
            [copy.groups, effectiveGroups.length],
            [copy.profiles, profileCount],
            [copy.roles, snapshot.roles.length],
          ].map(([label, value]) => (
            <div
              key={label}
              className="border-r border-[var(--color-border)] p-3 last:border-r-0 sm:p-4"
            >
              <dt className="text-xs text-[var(--color-muted-foreground)]">{label}</dt>
              <dd className="mt-1 text-lg font-bold tabular-nums text-[var(--color-foreground)] sm:text-xl">
                {value}
              </dd>
            </div>
          ))}
        </dl>
      </header>

      <section className="dashboard-panel p-4 sm:p-5" aria-labelledby="methodology-title">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-[var(--color-border)] bg-[var(--color-surface-2)] text-[var(--color-accent-foreground)]">
            <FlaskConical className="h-4.5 w-4.5" />
          </span>
          <div className="min-w-0">
            <h2 id="methodology-title" className="text-lg font-bold text-[var(--color-foreground)]">
              {copy.methodology}
            </h2>
            <p className="mt-1 max-w-4xl text-sm leading-6 text-[var(--color-muted-foreground)]">
              {copy.methodologyBody}
            </p>
          </div>
        </div>
        <dl className="mt-4 grid gap-px overflow-hidden rounded-md border border-[var(--color-border)] bg-[var(--color-border)] md:grid-cols-2 xl:grid-cols-4">
          {[
            [copy.exactContext, copy.exactContextBody],
            [copy.minGames, `${formatNumber(snapshot.contextMinGames, locale)} ${copy.games}`],
            [copy.similarity, copy.similarityBody],
            [copy.convergence, copy.convergenceBody],
          ].map(([label, value]) => (
            <div key={label} className="bg-[var(--color-surface-2)] p-3.5">
              <dt className="text-xs font-bold text-[var(--color-foreground)]">{label}</dt>
              <dd className="mt-1 text-xs leading-5 text-[var(--color-muted-foreground)]">
                {value}
              </dd>
            </div>
          ))}
        </dl>
      </section>

      <nav className="dashboard-panel p-3" aria-label={copy.roleIndex}>
        <p className="px-2 pb-2 text-xs font-bold text-[var(--color-muted-foreground)]">
          {copy.roleIndex}
        </p>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
          {snapshot.roles.map((role) => (
            <a
              key={role.role}
              href={`#role-${ROLE_SLUGS[role.role]}`}
              className="flex min-h-11 min-w-0 items-center justify-between gap-2 rounded-md border border-[var(--color-border)] px-3 py-2 text-sm font-bold text-[var(--color-foreground)] outline-none transition-colors hover:border-[var(--color-border-light)] hover:bg-[var(--color-surface-2)] focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] active:bg-[var(--color-surface-3)]"
            >
              <span className="truncate">{role.role}</span>
              <span className="shrink-0 text-xs tabular-nums text-[var(--color-muted-foreground)]">
                {role.profiles}
              </span>
            </a>
          ))}
        </div>
      </nav>

      {snapshot.roles.map((role, roleIndex) => {
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
            className="scroll-mt-32"
            aria-labelledby={`role-${ROLE_SLUGS[role.role]}-title`}
          >
            <header className="mb-3 grid gap-3 border-b border-[var(--color-border)] pb-3 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h2
                    id={`role-${ROLE_SLUGS[role.role]}-title`}
                    className="text-xl font-bold text-[var(--color-foreground)]"
                  >
                    {role.role}
                  </h2>
                  {role.converged ? (
                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-[var(--color-success)]">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      {copy.converged}
                    </span>
                  ) : null}
                </div>
                <p className="mt-1 text-xs text-[var(--color-muted-foreground)]">
                  {copy.types} {roleGroups.length}
                </p>
              </div>
              <dl className="grid grid-cols-4 gap-3 text-xs sm:flex sm:gap-6">
                {[
                  [copy.profiles, role.profiles.toString()],
                  [copy.threshold, formatPercent(role.threshold, locale)],
                  [copy.sharedContexts, role.minimumSharedContexts.toString()],
                  [copy.iterations, role.iterations.toString()],
                ].map(([label, value]) => (
                  <div key={label}>
                    <dt className="text-[var(--color-muted-foreground)]">{label}</dt>
                    <dd className="mt-0.5 font-bold tabular-nums text-[var(--color-foreground)]">
                      {value}
                    </dd>
                  </div>
                ))}
              </dl>
            </header>

            <div className="grid gap-2">
              {unifiedGroups.map((group, groupIndex) => (
                <GroupDisclosure
                  key={group.id}
                  group={group}
                  locale={locale}
                  copy={copy}
                  open={roleIndex === 0 && groupIndex === 0}
                />
              ))}
            </div>
          </section>
        );
      })}

      <footer className="dashboard-panel p-4 sm:p-5">
        <div className="flex items-start gap-3">
          <Users className="mt-0.5 h-4 w-4 shrink-0 text-[var(--color-muted-foreground)]" />
          <div className="min-w-0">
            <p className="text-sm leading-6 text-[var(--color-foreground)]">{copy.sourceNote}</p>
            <dl className="mt-3 grid gap-2 text-xs text-[var(--color-muted-foreground)] sm:grid-cols-2">
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
        </div>
      </footer>
    </main>
  );
}
