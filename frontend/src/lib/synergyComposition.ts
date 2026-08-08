import { getComboRoles, type CharacterRole } from "./characterMap";

export type CompositionRoleKey =
  | "tank"
  | "warrior"
  | "assassin"
  | "skillDealer"
  | "rangedCarry"
  | "support"
  | "unknown";

export type CompositionPatternKey =
  | "threeLayer"
  | "diveFollow"
  | "doubleFront"
  | "frontToBack"
  | "protectCarry"
  | "pickBurst"
  | "pokeKite"
  | "brawl"
  | "flexible";

export type PowerSpikeKey =
  | "formationReady"
  | "burstCooldowns"
  | "frontlineReady"
  | "rangeSetup"
  | "sustainedResources"
  | "synchronizedTools";

export type FavorableMatchupKey =
  | "singleDive"
  | "exposedBackline"
  | "shortRangeApproach"
  | "slowFrontline"
  | "closeRangeFight"
  | "conditional";

export type ThreatMatchupKey =
  | "splitPressure"
  | "peelDisengage"
  | "flankCollapse"
  | "hardEngage"
  | "longRangeKite"
  | "unclearInitiation";

export interface CompositionMemberInput {
  character: number;
  weapon: number;
}

export interface CompositionMemberProfile extends CompositionMemberInput {
  roles: CompositionRoleKey[];
  primaryRole: CompositionRoleKey;
  flexible: boolean;
}

export interface TrioCompositionInsight {
  members: [CompositionMemberProfile, CompositionMemberProfile, CompositionMemberProfile];
  pattern: CompositionPatternKey;
  powerSpike: PowerSpikeKey;
  favorableMatchup: FavorableMatchupKey;
  threatMatchup: ThreatMatchupKey;
  hasDirectMatchupEvidence: false;
  hasTimedPowerSpikeEvidence: false;
}

const ROLE_KEYS: Record<CharacterRole, CompositionRoleKey> = {
  탱커: "tank",
  전사: "warrior",
  암살자: "assassin",
  스킬딜러: "skillDealer",
  "원거리 딜러": "rangedCarry",
  지원가: "support",
};

function unique<T>(values: T[]): T[] {
  return [...new Set(values)];
}

function toRoleKeys(roles: CharacterRole[]): CompositionRoleKey[] {
  const keys = unique(roles.map((role) => ROLE_KEYS[role]).filter(Boolean));
  return keys.length > 0 ? keys : ["unknown"];
}

function hasRole(members: CompositionMemberProfile[], role: CompositionRoleKey) {
  return members.some((member) => member.roles.includes(role));
}

function countPrimary(members: CompositionMemberProfile[], role: CompositionRoleKey) {
  return members.filter((member) => member.primaryRole === role).length;
}

function countPrimaryIn(members: CompositionMemberProfile[], roles: CompositionRoleKey[]) {
  return members.filter((member) => roles.includes(member.primaryRole)).length;
}

export function classifyCompositionPattern(
  members: CompositionMemberProfile[]
): CompositionPatternKey {
  const hasTank = hasRole(members, "tank");
  const hasSupport = hasRole(members, "support");
  const assassinCount = countPrimary(members, "assassin");
  const frontlineCount = countPrimaryIn(members, ["tank", "warrior"]);
  const backlineDamageCount = countPrimaryIn(members, ["skillDealer", "rangedCarry"]);
  const closeRangeCount = countPrimaryIn(members, ["tank", "warrior", "assassin"]);

  if (hasTank && hasSupport && backlineDamageCount >= 1) return "threeLayer";
  if (assassinCount >= 1 && frontlineCount >= 1) return "diveFollow";
  if (frontlineCount >= 2 && backlineDamageCount >= 1) return "doubleFront";
  if (hasTank && backlineDamageCount >= 1) return "frontToBack";
  if (hasSupport && backlineDamageCount >= 1) return "protectCarry";
  if (assassinCount >= 2) return "pickBurst";
  if (backlineDamageCount >= 2 && frontlineCount === 0) return "pokeKite";
  if (closeRangeCount >= 2) return "brawl";
  return "flexible";
}

function powerSpikeForPattern(pattern: CompositionPatternKey): PowerSpikeKey {
  switch (pattern) {
    case "threeLayer":
    case "protectCarry":
      return "formationReady";
    case "diveFollow":
    case "pickBurst":
      return "burstCooldowns";
    case "doubleFront":
    case "frontToBack":
      return "frontlineReady";
    case "pokeKite":
      return "rangeSetup";
    case "brawl":
      return "sustainedResources";
    default:
      return "synchronizedTools";
  }
}

function favorableMatchupForPattern(pattern: CompositionPatternKey): FavorableMatchupKey {
  switch (pattern) {
    case "threeLayer":
    case "protectCarry":
      return "singleDive";
    case "diveFollow":
    case "pickBurst":
      return "exposedBackline";
    case "doubleFront":
    case "frontToBack":
      return "shortRangeApproach";
    case "pokeKite":
      return "slowFrontline";
    case "brawl":
      return "closeRangeFight";
    default:
      return "conditional";
  }
}

function threatMatchupForPattern(pattern: CompositionPatternKey): ThreatMatchupKey {
  switch (pattern) {
    case "threeLayer":
    case "protectCarry":
      return "splitPressure";
    case "diveFollow":
    case "pickBurst":
      return "peelDisengage";
    case "doubleFront":
    case "frontToBack":
      return "flankCollapse";
    case "pokeKite":
      return "hardEngage";
    case "brawl":
      return "longRangeKite";
    default:
      return "unclearInitiation";
  }
}

export function buildTrioCompositionInsight(
  input: readonly [CompositionMemberInput, CompositionMemberInput, CompositionMemberInput]
): TrioCompositionInsight {
  const members = input.map((member) => {
    const roles = toRoleKeys(getComboRoles(member.character, member.weapon));
    return {
      ...member,
      roles,
      primaryRole: roles[0],
      flexible: roles.length > 1,
    } satisfies CompositionMemberProfile;
  }) as [CompositionMemberProfile, CompositionMemberProfile, CompositionMemberProfile];
  const pattern = classifyCompositionPattern(members);

  return {
    members,
    pattern,
    powerSpike: powerSpikeForPattern(pattern),
    favorableMatchup: favorableMatchupForPattern(pattern),
    threatMatchup: threatMatchupForPattern(pattern),
    // 현재 DB는 팀 결과 집계만 가지며 실제 교전 상대와 획득 시각을 제공하지 않는다.
    hasDirectMatchupEvidence: false,
    hasTimedPowerSpikeEvidence: false,
  };
}
