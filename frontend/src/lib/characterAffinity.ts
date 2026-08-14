import "server-only";

import type { RouteLocale } from "@/i18n/routing";
import type {
  CompositionAffinityEvidence,
  CompositionAffinityMemberInput,
  GoodCompositionPrototypeEvidence,
} from "@/lib/characterAffinityComposition";
import { buildCompositionAffinityKey } from "@/lib/characterAffinityComposition";
import { compositionTypeSimilarity } from "@/lib/compositionTypeSemantics";
import editorialOverridesJson from "../../analysis-snapshots/composition-affinity/season10-11-exact-two-partner-affinity-v1/editorial-overrides.json";
import goodCompositionPrototypesJson from "../../analysis-snapshots/composition-affinity/season10-11-exact-two-partner-affinity-v1/good-composition-prototypes.json";
import frozenGroupsJson from "../../analysis-snapshots/composition-affinity/season10-11-exact-two-partner-affinity-v1/groups.json";
import risingCompositionsJson from "../../public/data/lab/entry-sample-confidence/character-rising-compositions.json";

export interface CharacterAffinityMember {
  profileKey: string;
  characterCode: number;
  characterName: string;
  weapon: number | null;
  weaponName: string;
  role: string;
  firstOrderType: string;
  subtypeName?: string;
  membership: "primary" | "auxiliary";
  similarity: number | null;
  minimumSimilarity: number | null;
  sharedContexts: number;
}

export interface CharacterAffinitySeasonSignal {
  season: number;
  games: number;
  positiveMembers: number;
  observedMembers: number;
  positiveRate: number | null;
}

export interface CharacterAffinitySignature {
  key: string;
  roleComposition: string;
  partnerTypes: Array<{ role: string; fitRole: string }>;
  positiveMembers: number;
  memberCount: number;
  coverage: number;
  games: number;
  adjustedResidual: number;
  seasonSignals: CharacterAffinitySeasonSignal[];
  seasonConsistency: "both-positive" | "mixed" | "insufficient";
}

export interface CharacterAffinityGroup {
  id: string;
  role: string;
  kind: "core" | "independent";
  threshold: number;
  cohesion: number | null;
  minimumSimilarity: number | null;
  signatureContexts: CharacterAffinitySignature[];
  seasonConsistency: "both-positive" | "mixed" | "insufficient";
  primaryMembers: CharacterAffinityMember[];
  auxiliaryMembers: CharacterAffinityMember[];
  label: string;
}

interface CharacterAffinitySnapshot {
  groups: CharacterAffinityGroup[];
}

interface CharacterAffinityOverrides {
  replacedGroupIds: string[];
  mergedGroups: CharacterAffinityGroup[];
}

export interface CharacterRisingComposition {
  roleComposition: string;
  partnerTypes: Array<{ role: string; fitRole: string }>;
  games: number;
  adjustedResidual: number;
}

interface CharacterRisingCompositionIndex {
  profiles: Record<string, CharacterRisingComposition[]>;
}

interface GoodCompositionPrototype {
  key: string;
  roleComposition: string;
  members: Array<{ role: string; type: string }>;
  observations: number;
  supportingProfiles: number;
  reliableObservations: number;
  reliableRate: number;
  contextGames: number;
  adjustedResidual: number;
}

interface GoodCompositionPrototypeSnapshot {
  prototypes: GoodCompositionPrototype[];
}

export interface CharacterAffinityProfile {
  group: CharacterAffinityGroup;
  member: CharacterAffinityMember;
}

const GROUP_NAMES_KO: Record<string, string> = {
  "탱커-4": "전열 유지 · 선봉 교란형",
  "탱커-editorial-미르카-매그너스-망치": "선봉 진입 · 교란형",
  "탱커-editorial-레녹스-일레븐-에스텔": "전열 보호 · 장악 연계형",
  "전사-13": "추격 지속 · 진입 마무리형",
  "전사-14": "진입 차단 · 전열 전환형",
  "전사-editorial-선봉-지속-압박": "선봉 지속 압박형",
  "전사-8": "교전 개시 · 선봉 보호형",
  "전사-24": "추격 지속형",
  "전사-23": "추격 지속 · 진입 연계형",
  "전사-11": "전열 유지 · 진입 마무리형",
  "전사-2": "강제 진입 · 받아치기형",
  "전사-10": "전열 유지 · 추격 압박형",
  "전사-4": "전열 유지 · 교전 개시형",
  "전사-17": "측면 진입 · 마무리형",
  "전사-20": "추격 지속 · 진입 장악형",
  "스킬딜러-13": "포킹 장악 · 점사형",
  "스킬딜러-2": "견제 반격 · 장악 폭딜형",
  "스킬딜러-10": "지속 장악 · 진입 억제형",
  "스킬딜러-1": "포킹 · 견제 지원형",
  "스킬딜러-16": "포킹 점사 · 장악형",
  "스킬딜러-6": "포킹 장악 · 폭딜형",
  "스킬딜러-14": "포킹 장악형",
  "스킬딜러-5": "전열 장악 · 폭딜형",
  "원거리 딜러-9": "포킹 점사 · 투사체 견제형",
  "원거리 딜러-5": "지속 견제 · 장악형",
  "원거리 딜러-10": "추격 지속 · 진입 마무리형",
  "원거리 딜러-editorial-후열-사거리-압박": "후열 사거리 압박형",
};

const snapshot = frozenGroupsJson as unknown as CharacterAffinitySnapshot;
const overrides = editorialOverridesJson as unknown as CharacterAffinityOverrides;
const risingCompositionIndex = risingCompositionsJson as unknown as CharacterRisingCompositionIndex;
const goodCompositionPrototypeSnapshot =
  goodCompositionPrototypesJson as unknown as GoodCompositionPrototypeSnapshot;
const replacedGroupIds = new Set(overrides.replacedGroupIds);

export const effectiveCharacterAffinityGroups = [
  ...snapshot.groups.filter((group) => !replacedGroupIds.has(group.id)),
  ...overrides.mergedGroups,
];

const profilesByCharacter = new Map<number, CharacterAffinityProfile[]>();
const profilesByCharacterWeapon = new Map<string, CharacterAffinityProfile>();

for (const group of effectiveCharacterAffinityGroups) {
  for (const member of group.primaryMembers) {
    const profiles = profilesByCharacter.get(member.characterCode) ?? [];
    profiles.push({ group, member });
    profilesByCharacter.set(member.characterCode, profiles);
    if (member.weapon != null) {
      profilesByCharacterWeapon.set(`${member.characterCode}:${member.weapon}`, { group, member });
    }
  }
}

function normalizeCharacteristicName(value: string) {
  return value.endsWith("형") ? value : `${value}형`;
}

export function getCharacterAffinityGroupName(
  group: Pick<CharacterAffinityGroup, "id" | "label" | "primaryMembers">,
  locale: RouteLocale
) {
  if (locale === "ko" && GROUP_NAMES_KO[group.id]) {
    return GROUP_NAMES_KO[group.id];
  }
  if (group.primaryMembers.length === 1) {
    return normalizeCharacteristicName(group.primaryMembers[0].firstOrderType);
  }
  return group.label;
}

export function getCharacterAffinitySubtype(member: CharacterAffinityMember) {
  return member.subtypeName ?? normalizeCharacteristicName(member.firstOrderType);
}

export function getCharacterAffinityProfiles(characterCode: number) {
  return profilesByCharacter.get(characterCode) ?? [];
}

export function getCharacterRisingCompositions(profileKey: string) {
  return risingCompositionIndex.profiles[profileKey] ?? [];
}

export function getCharacterAffinityTypeMembers(role: string, firstOrderType: string) {
  return effectiveCharacterAffinityGroups.flatMap((group) =>
    group.primaryMembers
      .filter((member) => member.role === role && member.firstOrderType === firstOrderType)
      .map((member) => ({
        profileKey: member.profileKey,
        characterCode: member.characterCode,
        characterName: member.characterName,
        weapon: member.weapon,
        weaponName: member.weaponName,
      }))
  );
}

function partnerTypesKey(partnerTypes: Array<{ role: string; fitRole: string }>) {
  return partnerTypes
    .map((partner) => `${partner.role}:${partner.fitRole}`)
    .sort((left, right) => left.localeCompare(right, "ko"))
    .join("|");
}

const MEMBER_ASSIGNMENTS = [
  [0, 1, 2],
  [0, 2, 1],
  [1, 0, 2],
  [1, 2, 0],
  [2, 0, 1],
  [2, 1, 0],
] as const;

const prototypesByKey = new Map(
  goodCompositionPrototypeSnapshot.prototypes.map((prototype) => [prototype.key, prototype])
);
const prototypesByRoleComposition = new Map<string, GoodCompositionPrototype[]>();
for (const prototype of goodCompositionPrototypeSnapshot.prototypes) {
  const candidates = prototypesByRoleComposition.get(prototype.roleComposition) ?? [];
  candidates.push(prototype);
  prototypesByRoleComposition.set(prototype.roleComposition, candidates);
}

function classifiedPrototypeKey(members: Array<{ role: string; firstOrderType: string }>) {
  return members
    .map((member) => `${member.role}:${member.firstOrderType}`)
    .sort((left, right) => left.localeCompare(right, "ko"))
    .join("|");
}

function classifiedRoleComposition(members: Array<{ role: string }>) {
  return members
    .map((member) => member.role)
    .sort((left, right) => left.localeCompare(right, "ko"))
    .join(" + ");
}

function matchPrototypeMembers(
  sources: Array<{
    characterCode: number;
    weapon: number;
    role: string;
    firstOrderType: string;
  }>,
  prototype: GoodCompositionPrototype
) {
  let best:
    | {
        assignment: (typeof MEMBER_ASSIGNMENTS)[number];
        similarities: number[];
        average: number;
        minimum: number;
      }
    | undefined;

  for (const assignment of MEMBER_ASSIGNMENTS) {
    const valid = sources.every(
      (source, sourceIndex) => source.role === prototype.members[assignment[sourceIndex]]?.role
    );
    if (!valid) continue;
    const similarities = sources.map((source, sourceIndex) =>
      compositionTypeSimilarity(
        source.firstOrderType,
        prototype.members[assignment[sourceIndex]].type
      )
    );
    const average = similarities.reduce((sum, value) => sum + value, 0) / similarities.length;
    const minimum = Math.min(...similarities);
    if (!best || average > best.average || (average === best.average && minimum > best.minimum)) {
      best = { assignment, similarities, average, minimum };
    }
  }
  return best;
}

function prototypeEvidenceScore(
  prototype: GoodCompositionPrototype,
  similarity: number,
  minimumSimilarity: number
) {
  const supportStrength = Math.min(1, prototype.supportingProfiles / 10);
  const evidenceStrength = supportStrength * 0.55 + prototype.reliableRate * 0.45;
  return similarity * 0.8 + minimumSimilarity * 0.1 + evidenceStrength * 0.1;
}

function getGoodCompositionPrototype(
  members: Array<{
    characterCode: number;
    weapon: number;
    role: string;
    firstOrderType: string;
  }>
): GoodCompositionPrototypeEvidence | null {
  if (members.length !== 3) return null;
  const exactKey = classifiedPrototypeKey(members);
  const exact = prototypesByKey.get(exactKey);
  const candidates = exact
    ? [exact]
    : (prototypesByRoleComposition.get(classifiedRoleComposition(members)) ?? []);

  let selected:
    | {
        prototype: GoodCompositionPrototype;
        match: NonNullable<ReturnType<typeof matchPrototypeMembers>>;
        score: number;
      }
    | undefined;
  for (const prototype of candidates) {
    const match = matchPrototypeMembers(members, prototype);
    if (!match) continue;
    const score = prototypeEvidenceScore(prototype, match.average, match.minimum);
    if (!selected || score > selected.score) selected = { prototype, match, score };
  }

  if (!selected) return null;
  const matchType = selected.prototype.key === exactKey ? "exact" : "nearest";
  if (matchType === "nearest" && (selected.match.average < 0.58 || selected.match.minimum < 0.2)) {
    return null;
  }

  const { prototype, match } = selected;
  return {
    match: matchType,
    key: prototype.key,
    roleComposition: prototype.roleComposition,
    members: prototype.members,
    memberMatches: members.map((member, memberIndex) => {
      const prototypeMember = prototype.members[match.assignment[memberIndex]];
      return {
        characterCode: member.characterCode,
        weapon: member.weapon,
        sourceType: member.firstOrderType,
        role: prototypeMember.role,
        type: prototypeMember.type,
        similarity: Number(match.similarities[memberIndex].toFixed(4)),
      };
    }),
    similarity: Number(match.average.toFixed(4)),
    minimumSimilarity: Number(match.minimum.toFixed(4)),
    observations: prototype.observations,
    supportingProfiles: prototype.supportingProfiles,
    reliableObservations: prototype.reliableObservations,
    reliableRate: prototype.reliableRate,
    contextGames: prototype.contextGames,
    adjustedResidual: prototype.adjustedResidual,
  };
}

export function getTrioCharacterAffinityEvidence(
  members: CompositionAffinityMemberInput[],
  locale: RouteLocale
): CompositionAffinityEvidence {
  const profiles = members.map((member) =>
    profilesByCharacterWeapon.get(`${member.characterCode}:${member.weapon}`)
  );

  const evidenceMembers = members.map((member, memberIndex) => {
    const profile = profiles[memberIndex];
    if (!profile) {
      return {
        ...member,
        characterName: "",
        weaponName: "",
        classification: null,
        trend: null,
      };
    }

    const partnerProfiles = profiles.filter(
      (candidate, candidateIndex): candidate is CharacterAffinityProfile =>
        candidateIndex !== memberIndex && candidate != null
    );
    const expectedPartnerKey =
      partnerProfiles.length === 2
        ? partnerTypesKey(
            partnerProfiles.map(({ member: partner }) => ({
              role: partner.role,
              fitRole: partner.firstOrderType,
            }))
          )
        : null;
    const matchedTrend = expectedPartnerKey
      ? getCharacterRisingCompositions(profile.member.profileKey).find(
          (context) => partnerTypesKey(context.partnerTypes) === expectedPartnerKey
        )
      : null;

    return {
      ...member,
      characterName: profile.member.characterName,
      weaponName: profile.member.weaponName,
      classification: {
        role: profile.member.role,
        groupName: getCharacterAffinityGroupName(profile.group, locale),
        subtype: getCharacterAffinitySubtype(profile.member),
        firstOrderType: profile.member.firstOrderType,
      },
      trend: matchedTrend
        ? {
            roleComposition: matchedTrend.roleComposition,
            games: matchedTrend.games,
            adjustedResidual: matchedTrend.adjustedResidual,
          }
        : null,
    };
  });
  const classifiedMembers = evidenceMembers.flatMap((member) =>
    member.classification
      ? [
          {
            characterCode: member.characterCode,
            weapon: member.weapon,
            role: member.classification.role,
            firstOrderType: member.classification.firstOrderType,
          },
        ]
      : []
  );

  return {
    key: buildCompositionAffinityKey(members),
    classifiedMembers: classifiedMembers.length,
    matchedMembers: evidenceMembers.filter((member) => member.trend != null).length,
    members: evidenceMembers,
    prototype: getGoodCompositionPrototype(classifiedMembers),
  };
}
