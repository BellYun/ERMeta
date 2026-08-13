import "server-only";

import type { RouteLocale } from "@/i18n/routing";
import editorialOverridesJson from "../../analysis-snapshots/composition-affinity/season10-11-exact-two-partner-affinity-v1/editorial-overrides.json";
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
const replacedGroupIds = new Set(overrides.replacedGroupIds);

export const effectiveCharacterAffinityGroups = [
  ...snapshot.groups.filter((group) => !replacedGroupIds.has(group.id)),
  ...overrides.mergedGroups,
];

const profilesByCharacter = new Map<number, CharacterAffinityProfile[]>();

for (const group of effectiveCharacterAffinityGroups) {
  for (const member of group.primaryMembers) {
    const profiles = profilesByCharacter.get(member.characterCode) ?? [];
    profiles.push({ group, member });
    profilesByCharacter.set(member.characterCode, profiles);
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
