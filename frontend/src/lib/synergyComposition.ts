import { COMPOSITION_CAPABILITY_HINTS } from "@/generated/compositionCapabilityHints";
import type { CompositionAffinityEvidence } from "@/lib/characterAffinityComposition";
import { getCompositionTypeTraits } from "@/lib/compositionTypeSemantics";
import { getComboRoles, type CharacterRole } from "./characterMap";

export type CompositionRoleKey =
  | "tank"
  | "warrior"
  | "assassin"
  | "skillDealer"
  | "rangedCarry"
  | "support"
  | "unknown";

export type CompositionTraitKey =
  | "engage"
  | "dive"
  | "peel"
  | "protect"
  | "poke"
  | "burst"
  | "sustain"
  | "zoneControl";

export type CompositionFormationKey = "front" | "mid" | "back";

export type CompositionRangeKey = "melee" | "mid" | "long";

export type CombatPlanKey =
  | "engageChain"
  | "pokeCatch"
  | "frontToBack"
  | "counterEngage"
  | "collapse"
  | "brawlCycle"
  | "coordinate";

export type DamageDeliveryKey = "poke" | "burst" | "sustained" | "distributed";

export type AccessMethodKey = "forcedEngage" | "dive" | "counterEngage" | "frontToBack";

export type CarryDependencyKey = "careRequired" | "infighting" | "selfSufficient" | "noSingleCarry";

export type FrontlineStructureKey = "soloFront" | "doubleFront" | "noFront" | "tripleMelee";

export type FightLengthKey = "shortWindow" | "longCycle";

export type TargetRuleKey =
  | "controlledTarget"
  | "nearestThreat"
  | "exposedBackline"
  | "intrudingDiver";

export type WinConditionKey =
  | "pokeBeforeCommit"
  | "syncBurstWindow"
  | "preserveCarryUptime"
  | "rotateFrontline"
  | "compressMeleeSpace"
  | "preserveRangedSpacing"
  | "sustainAccessibleTarget";

export type OpeningRuleKey =
  | "pokeThenCommit"
  | "waitEnemyEntry"
  | "syncDiveEntry"
  | "controlThenCommit"
  | "frontlineContact";

export type FrontlineRuleKey =
  | "screenCarry"
  | "alternateAggro"
  | "collapseSameZone"
  | "preserveRangedSpace"
  | "holdFollowupRange";

export type DamageRuleKey =
  | "repeatPoke"
  | "overlapBurst"
  | "sustainNearest"
  | "sameTargetDistributed";

export type SwitchRuleKey =
  | "resetOnMiss"
  | "regroupOnSeparation"
  | "reopenDistance"
  | "switchWhenOutOfRange"
  | "chaseOnlyEscapeSpent";

export type FailureRuleKey =
  | "fightBeforePoke"
  | "staggeredEntry"
  | "frontlineOverextends"
  | "simultaneousFrontCooldowns"
  | "splitMeleeTargets"
  | "spendAllMobility"
  | "splitDamage";

export type MemberActionKey =
  | "openControlledTarget"
  | "punishEnemyEntry"
  | "openDiveAngle"
  | "confirmPokeAdvantage"
  | "startFrontlineContact"
  | "followInitiatorTarget"
  | "syncDiveSameTarget"
  | "screenCarry"
  | "alternateFrontline"
  | "compressMeleeSpace"
  | "denyApproach"
  | "holdFollowupRange"
  | "repeatPoke"
  | "damageAfterPoke"
  | "applySafeFollowupDamage"
  | "damageControlledTarget"
  | "damageNearestThreat"
  | "damageExposedBackline"
  | "damageIntrudingDiver"
  | "chainControlOnTarget"
  | "holdControlForDiver"
  | "suppressApproach"
  | "protectPrimaryDamage"
  | "finishCurrentTarget";

export type MemberAvoidKey =
  | "doNotEnterAlone"
  | "doNotLeaveFollowupRange"
  | "doNotOverlapFrontCooldowns"
  | "doNotSplitMeleeTarget"
  | "doNotOverchase"
  | "doNotCrossFrontline"
  | "keepEscapeTool"
  | "doNotSpendDefensiveToolEarly"
  | "doNotSpendSuppressionEarly"
  | "doNotChangeTargetEarly";

export type CombatTaskKey =
  | "initiate"
  | "followDive"
  | "frontline"
  | "primaryDamage"
  | "followupDamage"
  | "poke"
  | "control"
  | "suppress"
  | "protect"
  | "finish";

export type CapabilityEvidenceKey = "affinityProfile" | "officialSkillText" | "editorialFallback";

export type CompositionAnalysisBasisKey =
  | "successfulPrototypeExact"
  | "successfulPrototypeNearest"
  | "affinityEvidence"
  | "affinityTypes"
  | "legacyCapabilities";

export interface CompositionCapabilityVector {
  pressureRange: number;
  functions: Record<CombatTaskKey, number>;
  officialUtility: Record<CombatTaskKey, number>;
  evidence: CapabilityEvidenceKey;
  officialSkillCount: number;
}

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
  traits: CompositionTraitKey[];
  primaryRole: CompositionRoleKey;
  flexible: boolean;
  formation: CompositionFormationKey;
  effectiveRange: CompositionRangeKey;
  capabilities: CompositionCapabilityVector;
}

export interface CompositionCombatStep extends CompositionMemberInput {
  task: CombatTaskKey;
}

export interface CompositionMemberDuty extends CompositionCombatStep {
  secondaryTask?: CombatTaskKey;
  action: MemberActionKey;
  avoid: MemberAvoidKey;
}

export interface CompositionCombatDoctrine {
  features: {
    damageDelivery: DamageDeliveryKey;
    accessMethod: AccessMethodKey;
    carryDependency: CarryDependencyKey;
    frontlineStructure: FrontlineStructureKey;
    fightLength: FightLengthKey;
    targetRule: TargetRuleKey;
  };
  winCondition: WinConditionKey;
  opening: OpeningRuleKey;
  target: TargetRuleKey;
  frontline: FrontlineRuleKey;
  damage: DamageRuleKey;
  switchRule: SwitchRuleKey;
  failure: FailureRuleKey;
  memberDuties: [CompositionMemberDuty, CompositionMemberDuty, CompositionMemberDuty];
}

export interface TrioCompositionInsight {
  members: [CompositionMemberProfile, CompositionMemberProfile, CompositionMemberProfile];
  pattern: CompositionPatternKey;
  combatPlan: CombatPlanKey;
  combatSequence: [CompositionCombatStep, CompositionCombatStep, CompositionCombatStep];
  combatDoctrine: CompositionCombatDoctrine;
  powerSpike: PowerSpikeKey;
  favorableMatchup: FavorableMatchupKey;
  threatMatchup: ThreatMatchupKey;
  hasDirectMatchupEvidence: false;
  hasTimedPowerSpikeEvidence: false;
  analysisBasis: CompositionAnalysisBasisKey;
  affinityClassifiedMembers: number;
  affinityMatchedMembers: number;
}

const ROLE_KEYS: Record<CharacterRole, CompositionRoleKey> = {
  탱커: "tank",
  전사: "warrior",
  암살자: "assassin",
  스킬딜러: "skillDealer",
  "원거리 딜러": "rangedCarry",
  지원가: "support",
};

/**
 * 역할만으로 사라지는 실험체별 전술 차이를 보완하는 ERMeta 휴리스틱입니다.
 * 패치 수치가 아니라 스킬셋의 대표적인 교전 기능만 2개 이내로 보수적으로 기록합니다.
 */
const CHARACTER_TRAITS: Record<number, CompositionTraitKey[]> = {
  1: ["dive", "sustain"],
  2: ["poke", "burst"],
  3: ["dive", "burst"],
  4: ["engage", "peel"],
  5: ["poke", "zoneControl"],
  6: ["poke", "sustain"],
  7: ["engage", "burst"],
  8: ["peel", "sustain"],
  9: ["zoneControl", "poke"],
  10: ["dive", "sustain"],
  11: ["engage", "burst"],
  12: ["poke", "zoneControl"],
  13: ["sustain", "peel"],
  14: ["engage", "sustain"],
  15: ["poke", "zoneControl"],
  16: ["dive", "sustain"],
  17: ["zoneControl", "poke"],
  18: ["dive", "burst"],
  19: ["poke", "peel"],
  20: ["engage", "peel"],
  21: ["dive", "sustain"],
  22: ["dive", "burst"],
  23: ["dive", "burst"],
  24: ["burst", "zoneControl"],
  25: ["poke", "peel"],
  26: ["zoneControl", "sustain"],
  27: ["dive", "zoneControl"],
  28: ["engage", "peel"],
  29: ["engage", "burst"],
  30: ["engage", "peel"],
  31: ["poke", "sustain"],
  32: ["poke", "sustain"],
  33: ["engage", "dive"],
  34: ["poke", "zoneControl"],
  35: ["engage", "dive"],
  36: ["poke", "burst"],
  37: ["dive", "burst"],
  38: ["poke", "sustain"],
  39: ["dive", "sustain"],
  40: ["burst", "sustain"],
  41: ["protect", "peel"],
  42: ["engage", "burst"],
  43: ["zoneControl", "burst"],
  44: ["dive", "sustain"],
  45: ["protect", "peel"],
  46: ["dive", "burst"],
  47: ["dive", "burst"],
  48: ["zoneControl", "poke"],
  49: ["dive", "sustain"],
  50: ["engage", "zoneControl"],
  51: ["protect", "zoneControl"],
  52: ["poke", "protect"],
  53: ["engage", "peel"],
  54: ["poke", "burst"],
  55: ["engage", "protect"],
  56: ["dive", "sustain"],
  57: ["poke", "sustain"],
  58: ["poke", "burst"],
  59: ["engage", "sustain"],
  60: ["poke", "burst"],
  61: ["dive", "zoneControl"],
  62: ["poke", "protect"],
  63: ["engage", "sustain"],
  64: ["dive", "sustain"],
  65: ["engage", "sustain"],
  66: ["protect", "zoneControl"],
  67: ["dive", "burst"],
  68: ["engage", "peel"],
  69: ["protect", "peel"],
  70: ["dive", "burst"],
  71: ["engage", "sustain"],
  72: ["poke", "burst"],
  73: ["protect", "peel"],
  74: ["engage", "sustain"],
  75: ["zoneControl", "poke"],
  76: ["engage", "sustain"],
  // E로 바람 지대를 만들며 진입하고 W 넉백/R 에어본으로 교전을 여는 장악형.
  77: ["engage", "zoneControl"],
  78: ["engage", "sustain"],
  79: ["poke", "burst"],
  80: ["engage", "sustain"],
  81: ["zoneControl", "burst"],
  82: ["dive", "sustain"],
  83: ["poke", "zoneControl"],
  84: ["zoneControl", "burst"],
  85: ["engage", "peel"],
  86: ["engage", "sustain"],
  87: ["zoneControl", "sustain"],
  88: ["engage", "sustain"],
  89: ["poke", "burst"],
};

/**
 * 같은 실험체도 무기군에 따라 실제 교전 위치와 임무가 달라지는 경우만 덮어씁니다.
 * 나머지는 실험체 기본 성향을 사용해 신규 조합도 안전하게 설명합니다.
 */
const COMBO_TRAIT_OVERRIDES: Record<string, CompositionTraitKey[]> = {
  "2_9": ["poke", "burst"], // 아야 권총: 스킬 폭딜과 짧은 재배치
  "2_10": ["poke", "sustain"], // 아야 돌격 소총: 후열 지속 화력
  "2_11": ["poke", "burst"], // 아야 저격총: 장거리 선제 타격
  "4_3": ["engage", "sustain"], // 매그너스 방망이: 근거리 난전
  "4_13": ["engage", "peel"], // 매그너스 망치: 진입과 밀어내기
  "6_7": ["poke", "sustain"], // 나딘 활: 거리 유지 지속 딜
  "6_8": ["poke", "burst"], // 나딘 석궁: 선제 점사
  "9_9": ["zoneControl", "burst"], // 아이솔 권총: 설치 연계 폭딜
  "9_10": ["zoneControl", "sustain"], // 아이솔 돌격 소총: 지역 장악 지속 딜
  "11_16": ["engage", "burst"], // 유키 양손검: 제어 후 짧은 집중 화력
  "11_18": ["dive", "sustain"], // 유키 쌍검: 추격형 지속 교전
  "13_15": ["sustain", "peel"], // 쇼우 단검: 전열 유지
  "13_19": ["engage", "sustain"], // 쇼우 창: 사거리 있는 전열 개시
  "15_5": ["poke", "zoneControl"], // 시셀라 투척: 지속 견제
  "15_6": ["poke", "burst"], // 시셀라 암기: 순간 화력 비중
  "23_15": ["dive", "burst"], // 캐시 단검: 단일 목표 암살
  "23_18": ["dive", "sustain"], // 캐시 쌍검: 추격 교전
  "28_3": ["zoneControl", "peel"], // 수아 방망이: 중거리 제어
  "28_13": ["engage", "peel"], // 수아 망치: 전열 개입
  "35_1": ["engage", "dive"], // 얀 글러브: 강제 진입
  "35_2": ["peel", "sustain"], // 얀 톤파: 받아치기
  "39_18": ["dive", "sustain"], // 카밀로 쌍검: 긴 추격전
  "39_21": ["dive", "burst"], // 카밀로 레이피어: 짧은 진입 폭딜
  "53_13": ["engage", "peel"], // 마커스 망치: 제어와 진입 차단
  "53_14": ["engage", "sustain"], // 마커스 도끼: 진입 후 전열 유지
};

/**
 * 실제 스킬 사거리 수치가 없는 현재 지식 레이어에서 선제 견제 담당을 비교하기 위한 상대 척도입니다.
 * 미등록 조합은 전열 위치·역할로 계산하고, 체감 사거리가 역할 분류보다 뚜렷한 경우만 덮어씁니다.
 */
const PRESSURE_RANGE_OVERRIDES: Record<string, number> = {
  "2_9": 4, // 아야 권총
  "2_10": 4, // 아야 돌격 소총
  "2_11": 5, // 아야 저격총
  "36_5": 6, // 이바 투척: 장거리 스킬 견제
};

const INITIATION_PRIORITY: Partial<Record<number, number>> = {
  86: 4, // 펜리르: W 끌어오기와 R 지정 돌진으로 선진입을 주도
};

const COMBAT_TASK_KEYS: CombatTaskKey[] = [
  "initiate",
  "followDive",
  "frontline",
  "primaryDamage",
  "followupDamage",
  "poke",
  "control",
  "suppress",
  "protect",
  "finish",
];

/**
 * 역할명이 아니라 실제 조합 판단에 사용할 수 있을 만큼 기능 점수가 모였는지 보는 기준입니다.
 * 자동 추출 스킬 신호 하나만으로 역할이 바뀌지 않도록 편집 태그·역할·공식 신호가 함께
 * 쌓이는 구간에 기준을 둡니다.
 */
const CAPABILITY_THRESHOLDS: Record<CombatTaskKey, number> = {
  initiate: 8,
  followDive: 8,
  frontline: 7,
  primaryDamage: 8,
  followupDamage: 7,
  poke: 20,
  control: 7,
  suppress: 10,
  protect: 8,
  finish: 8,
};

/** 공식 스킬 문장에서 같은 기능 신호가 충분히 반복되면 편집 태그가 없어도 후보로 인정합니다. */
const OFFICIAL_UTILITY_THRESHOLDS: Partial<Record<CombatTaskKey, number>> = {
  initiate: 3.25,
  control: 3,
  suppress: 3,
  protect: 4,
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

function countTrait(members: CompositionMemberProfile[], trait: CompositionTraitKey) {
  return members.filter((member) => member.traits.includes(trait)).length;
}

function countPrimary(members: CompositionMemberProfile[], role: CompositionRoleKey) {
  return members.filter((member) => member.primaryRole === role).length;
}

function countPrimaryIn(members: CompositionMemberProfile[], roles: CompositionRoleKey[]) {
  return members.filter((member) => roles.includes(member.primaryRole)).length;
}

function traitsForMember(member: CompositionMemberInput): CompositionTraitKey[] {
  return (
    COMBO_TRAIT_OVERRIDES[`${member.character}_${member.weapon}`] ??
    CHARACTER_TRAITS[member.character] ??
    []
  );
}

function affinityMemberForInput(
  evidence: CompositionAffinityEvidence | null | undefined,
  member: CompositionMemberInput
) {
  return evidence?.members.find(
    (candidate) =>
      candidate.characterCode === member.character && candidate.weapon === member.weapon
  );
}

function formationForMember(
  primaryRole: CompositionRoleKey,
  traits: CompositionTraitKey[]
): CompositionFormationKey {
  if (primaryRole === "tank" || primaryRole === "warrior" || primaryRole === "assassin") {
    return traits.includes("poke") && !traits.includes("engage") && !traits.includes("dive")
      ? "mid"
      : "front";
  }
  if (primaryRole === "support") return traits.includes("engage") ? "mid" : "back";
  if (traits.includes("dive") || traits.includes("engage")) return "mid";
  return "back";
}

function rangeForMember(
  primaryRole: CompositionRoleKey,
  traits: CompositionTraitKey[]
): CompositionRangeKey {
  if (primaryRole === "tank" || primaryRole === "warrior" || primaryRole === "assassin") {
    return traits.includes("poke") ? "mid" : "melee";
  }
  if (primaryRole === "rangedCarry") return traits.includes("dive") ? "mid" : "long";
  if (primaryRole === "support") return "mid";
  return traits.includes("poke") ? "long" : "mid";
}

type CapabilityProfileInput = Omit<CompositionMemberProfile, "capabilities">;

function pressureRangeForMember(member: CapabilityProfileInput): number {
  const defaultPressureRange =
    member.effectiveRange === "long" ? 4 : member.effectiveRange === "mid" ? 2 : 1;
  return PRESSURE_RANGE_OVERRIDES[`${member.character}_${member.weapon}`] ?? defaultPressureRange;
}

function baseTaskScore(member: CapabilityProfileInput, task: CombatTaskKey): number {
  const role = (key: CompositionRoleKey, score: number) => (member.roles.includes(key) ? score : 0);
  const trait = (key: CompositionTraitKey, score: number) =>
    member.traits.includes(key) ? score : 0;

  switch (task) {
    case "initiate":
      return (
        trait("engage", 8) +
        role("tank", 5) +
        trait("zoneControl", 2) +
        (INITIATION_PRIORITY[member.character] ?? 0)
      );
    case "followDive":
      return trait("dive", 8) + role("assassin", 5) + role("warrior", 3) + trait("burst", 2);
    case "frontline":
      return role("tank", 8) + role("warrior", 4) + trait("sustain", 3) + trait("peel", 2);
    case "primaryDamage": {
      const roleScore: Record<CompositionRoleKey, number> = {
        assassin: 10,
        skillDealer: 8,
        rangedCarry: 8,
        warrior: 6,
        tank: 1,
        support: 1,
        unknown: 0,
      };
      return (
        roleScore[member.primaryRole] +
        role("rangedCarry", 2) +
        trait("burst", 3) +
        trait("sustain", 3) +
        trait("dive", 1)
      );
    }
    case "followupDamage":
      return role("rangedCarry", 6) + role("skillDealer", 5) + trait("burst", 3) + trait("poke", 2);
    case "poke": {
      const pressureRange = pressureRangeForMember(member);
      return trait("poke", 8) + pressureRange * 3 + role("skillDealer", 3) + role("rangedCarry", 2);
    }
    case "control":
      return trait("zoneControl", 7) + trait("engage", 4) + trait("peel", 3);
    case "suppress":
      return trait("zoneControl", 9) + trait("peel", 5) + trait("poke", 2);
    case "protect":
      return trait("protect", 8) + trait("peel", 6) + role("support", 4) + role("tank", 2);
    case "finish":
      return trait("burst", 7) + trait("dive", 5) + role("assassin", 4) + role("warrior", 2);
  }
}

type OfficialCapabilityHint =
  (typeof COMPOSITION_CAPABILITY_HINTS)[keyof typeof COMPOSITION_CAPABILITY_HINTS];

function officialCapabilityHint(character: number): OfficialCapabilityHint | undefined {
  return (COMPOSITION_CAPABILITY_HINTS as Record<number, OfficialCapabilityHint>)[character];
}

function officialTaskBonus(hint: OfficialCapabilityHint | undefined, task: CombatTaskKey): number {
  if (!hint) return 0;
  const { hints } = hint;

  switch (task) {
    case "initiate":
      return (hints.hardControl * 2 + hints.mobility) / 4;
    case "followDive":
      return 0;
    case "frontline":
      return (hints.selfSustain * 2 + hints.untargetable + hints.hardControl) / 4;
    case "primaryDamage":
      return 0;
    case "followupDamage":
      return 0;
    case "poke":
      return 0;
    case "control":
      return (hints.hardControl * 2 + hints.softControl) / 4;
    case "suppress":
      return (
        (hints.persistentZone * 2 +
          hints.projectileDenial * 2 +
          hints.hardControl +
          hints.softControl +
          hints.visionControl) /
        4
      );
    case "protect":
      return (hints.allyProtection * 3 + hints.projectileDenial + hints.hardControl) / 4;
    case "finish":
      return 0;
  }
}

function buildCapabilityVector(
  member: CapabilityProfileInput,
  usesAffinityProfile = false
): CompositionCapabilityVector {
  const officialHint = officialCapabilityHint(member.character);
  const officialUtility = Object.fromEntries(
    COMBAT_TASK_KEYS.map((task) => [task, officialTaskBonus(officialHint, task)])
  ) as Record<CombatTaskKey, number>;
  const functions = Object.fromEntries(
    COMBAT_TASK_KEYS.map((task) => [task, baseTaskScore(member, task) + officialUtility[task]])
  ) as Record<CombatTaskKey, number>;

  return {
    pressureRange: pressureRangeForMember(member),
    functions,
    officialUtility,
    evidence: usesAffinityProfile
      ? "affinityProfile"
      : officialHint?.skillCount
        ? "officialSkillText"
        : "editorialFallback",
    officialSkillCount: officialHint?.skillCount ?? 0,
  };
}

function scoreMember(member: CompositionMemberProfile, task: CombatTaskKey): number {
  return member.capabilities.functions[task];
}

function isCapable(member: CompositionMemberProfile, task: CombatTaskKey): boolean {
  const officialThreshold = OFFICIAL_UTILITY_THRESHOLDS[task];
  return (
    scoreMember(member, task) >= CAPABILITY_THRESHOLDS[task] ||
    (officialThreshold != null &&
      member.capabilities.evidence === "officialSkillText" &&
      member.capabilities.officialUtility[task] >= officialThreshold)
  );
}

function countCapable(members: CompositionMemberProfile[], task: CombatTaskKey): number {
  return members.filter((member) => isCapable(member, task)).length;
}

function hasDistinctCapabilityPair(
  members: CompositionMemberProfile[],
  firstTask: CombatTaskKey,
  secondTask: CombatTaskKey
): boolean {
  return members.some(
    (firstMember, firstIndex) =>
      isCapable(firstMember, firstTask) &&
      members.some(
        (secondMember, secondIndex) =>
          firstIndex !== secondIndex && isCapable(secondMember, secondTask)
      )
  );
}

function canDefendEntry(member: CompositionMemberProfile): boolean {
  return (
    isCapable(member, "protect") ||
    isCapable(member, "suppress") ||
    scoreMember(member, "control") >= CAPABILITY_THRESHOLDS.control + 3
  );
}

function combatPlanForMembers(members: CompositionMemberProfile[]): CombatPlanKey {
  const engageCount = countCapable(members, "initiate");
  const diveCount = countCapable(members, "followDive");
  const pokeCount = countCapable(members, "poke");
  const defensiveCount = members.filter(canDefendEntry).length;
  const sustainCount = countTrait(members, "sustain");
  const backlineCount = members.filter(({ formation }) => formation === "back").length;
  const frontlineCount = members.filter(({ formation }) => formation === "front").length;

  if (pokeCount >= 2 && engageCount === 0) return "pokeCatch";
  if (defensiveCount >= 2 && backlineCount >= 1) return "counterEngage";
  if (hasDistinctCapabilityPair(members, "initiate", "followDive")) return "engageChain";
  if (diveCount >= 2 || countPrimary(members, "assassin") >= 2) return "collapse";
  if (frontlineCount >= 1 && backlineCount >= 1) return "frontToBack";
  if (pokeCount >= 1 && countCapable(members, "suppress") >= 1) return "pokeCatch";
  if (sustainCount >= 2 || frontlineCount >= 2) return "brawlCycle";
  return "coordinate";
}

function strongestTeamTask(
  members: CompositionMemberProfile[],
  candidates: CombatTaskKey[]
): CombatTaskKey {
  return candidates.reduce((bestTask, task) => {
    const bestScore = Math.max(...members.map((member) => scoreMember(member, bestTask)));
    const taskScore = Math.max(...members.map((member) => scoreMember(member, task)));
    return taskScore > bestScore ? task : bestTask;
  });
}

function strongestLearnedUtilityTask(
  members: CompositionMemberProfile[],
  candidates: Array<"control" | "suppress" | "protect">
): "control" | "suppress" | "protect" | null {
  let selected: "control" | "suppress" | "protect" | null = null;
  let bestConfidence = 1;

  for (const task of candidates) {
    const threshold = OFFICIAL_UTILITY_THRESHOLDS[task];
    if (threshold == null) continue;
    const confidence = Math.max(
      ...members.map((member) => member.capabilities.officialUtility[task] / threshold)
    );
    if (confidence > bestConfidence) {
      selected = task;
      bestConfidence = confidence;
    }
  }

  return selected;
}

function tasksForPlan(
  members: CompositionMemberProfile[],
  plan: CombatPlanKey
): [CombatTaskKey, CombatTaskKey, CombatTaskKey] {
  const hasBacklineDamage = members.some(
    ({ primaryRole }) => primaryRole === "skillDealer" || primaryRole === "rangedCarry"
  );
  const hasProtection = countCapable(members, "protect") >= 1;
  const hasControl = countCapable(members, "control") >= 1;
  const hasDive = countCapable(members, "followDive") >= 1;
  const hasEngage = countCapable(members, "initiate") >= 1;

  switch (plan) {
    case "engageChain":
      return ["initiate", "followDive", hasBacklineDamage ? "primaryDamage" : "finish"];
    case "pokeCatch":
      return [
        "poke",
        strongestTeamTask(members, ["suppress", "protect", "control", "finish"]),
        "primaryDamage",
      ];
    case "frontToBack":
      return [
        hasEngage ? "initiate" : "frontline",
        "primaryDamage",
        hasProtection ? "protect" : "finish",
      ];
    case "counterEngage":
      return ["protect", "primaryDamage", hasControl ? "control" : "finish"];
    case "collapse":
      return [
        "followDive",
        hasControl ? "control" : "primaryDamage",
        hasControl ? "primaryDamage" : "followupDamage",
      ];
    case "brawlCycle":
      return [
        "frontline",
        hasDive ? "followDive" : hasControl ? "control" : "primaryDamage",
        "finish",
      ];
    default:
      return [
        hasControl ? "control" : "poke",
        hasBacklineDamage ? "primaryDamage" : "frontline",
        "finish",
      ];
  }
}

const MEMBER_ASSIGNMENTS = [
  [0, 1, 2],
  [0, 2, 1],
  [1, 0, 2],
  [1, 2, 0],
  [2, 0, 1],
  [2, 1, 0],
] as const;

function bestAssignmentForTasks(
  members: CompositionMemberProfile[],
  tasks: readonly [CombatTaskKey, CombatTaskKey, CombatTaskKey],
  officialUtilityWeight = 0
) {
  let bestAssignment: (typeof MEMBER_ASSIGNMENTS)[number] = MEMBER_ASSIGNMENTS[0];
  let bestScore = Number.NEGATIVE_INFINITY;

  for (const assignment of MEMBER_ASSIGNMENTS) {
    const score =
      scoreMember(members[assignment[0]], tasks[0]) +
      members[assignment[0]].capabilities.officialUtility[tasks[0]] * officialUtilityWeight +
      scoreMember(members[assignment[1]], tasks[1]) +
      members[assignment[1]].capabilities.officialUtility[tasks[1]] * officialUtilityWeight +
      scoreMember(members[assignment[2]], tasks[2]) +
      members[assignment[2]].capabilities.officialUtility[tasks[2]] * officialUtilityWeight;
    if (score > bestScore) {
      bestAssignment = assignment;
      bestScore = score;
    }
  }

  return { assignment: bestAssignment, score: bestScore };
}

function buildCombatSequence(
  members: CompositionMemberProfile[],
  plan: CombatPlanKey
): [CompositionCombatStep, CompositionCombatStep, CompositionCombatStep] {
  const planTasks = tasksForPlan(members, plan);
  const { assignment: bestAssignment } = bestAssignmentForTasks(members, planTasks, 2);

  return planTasks.map((task, taskIndex) => {
    const member = members[bestAssignment[taskIndex]];
    return {
      character: member.character,
      weapon: member.weapon,
      task,
    };
  }) as [CompositionCombatStep, CompositionCombatStep, CompositionCombatStep];
}

function damageDeliveryForMembers(members: CompositionMemberProfile[]): DamageDeliveryKey {
  const burstCount = countTrait(members, "burst");
  const pokeCount = countTrait(members, "poke");
  const sustainCount = countTrait(members, "sustain");
  const accessCount = countTrait(members, "engage") + countTrait(members, "dive");

  if (burstCount >= 2 && accessCount >= 1) return "burst";
  if (pokeCount >= 2) return "poke";
  if (sustainCount >= 2) return "sustained";
  return "distributed";
}

function accessMethodForMembers(members: CompositionMemberProfile[]): AccessMethodKey {
  const defensiveCount = members.filter(canDefendEntry).length;
  const backlineCount = members.filter(({ formation }) => formation === "back").length;
  const diveCount = countCapable(members, "followDive");

  if (defensiveCount >= 2 && backlineCount >= 1) return "counterEngage";
  if (diveCount >= 2 || countPrimary(members, "assassin") >= 2) return "dive";
  if (countCapable(members, "initiate") >= 1) return "forcedEngage";
  return "frontToBack";
}

function carryDependencyForMembers(members: CompositionMemberProfile[]): CarryDependencyKey {
  const backlineDamage = members.filter(
    ({ formation, primaryRole }) =>
      formation === "back" && (primaryRole === "skillDealer" || primaryRole === "rangedCarry")
  );

  if (backlineDamage.length !== 1) return "noSingleCarry";
  const [carry] = backlineDamage;
  if (carry.traits.includes("dive") || carry.effectiveRange === "mid") return "infighting";
  if (carry.traits.includes("protect") || carry.traits.includes("peel")) {
    return "selfSufficient";
  }
  return "careRequired";
}

function frontlineStructureForMembers(members: CompositionMemberProfile[]): FrontlineStructureKey {
  const meleeCount = members.filter(({ effectiveRange }) => effectiveRange === "melee").length;
  const frontlineCount = members.filter(({ formation }) => formation === "front").length;

  if (meleeCount === 3) return "tripleMelee";
  if (frontlineCount >= 2) return "doubleFront";
  if (frontlineCount === 1) return "soloFront";
  return "noFront";
}

function targetRuleForFeatures(
  damageDelivery: DamageDeliveryKey,
  accessMethod: AccessMethodKey
): TargetRuleKey {
  if (accessMethod === "counterEngage") return "intrudingDiver";
  if (accessMethod === "dive") return "exposedBackline";
  if (accessMethod === "forcedEngage" || damageDelivery === "burst") {
    return "controlledTarget";
  }
  return "nearestThreat";
}

function secondaryTaskForMember(
  member: CompositionMemberProfile,
  primaryTask: CombatTaskKey
): CombatTaskKey | undefined {
  const learnedUtility = strongestLearnedUtilityTask(
    [member],
    ["suppress", "protect", "control"].filter(
      (task): task is "suppress" | "protect" | "control" => task !== primaryTask
    )
  );
  if (learnedUtility) return learnedUtility;

  const candidates: CombatTaskKey[] = [
    "primaryDamage",
    "poke",
    "control",
    "suppress",
    "protect",
    "finish",
    "frontline",
    "followDive",
  ];
  let selected: CombatTaskKey | undefined;
  let bestConfidence = 1;

  for (const task of candidates) {
    if (task === primaryTask) continue;
    const confidence = scoreMember(member, task) / CAPABILITY_THRESHOLDS[task];
    if (confidence > bestConfidence) {
      selected = task;
      bestConfidence = confidence;
    }
  }

  return selected;
}

function memberActionForStep(
  step: CompositionCombatStep,
  doctrine: Omit<CompositionCombatDoctrine, "memberDuties">
): MemberActionKey {
  switch (step.task) {
    case "initiate":
      if (doctrine.opening === "waitEnemyEntry") return "punishEnemyEntry";
      if (doctrine.opening === "syncDiveEntry") return "openDiveAngle";
      if (doctrine.opening === "pokeThenCommit") return "confirmPokeAdvantage";
      if (doctrine.opening === "controlThenCommit") return "openControlledTarget";
      return "startFrontlineContact";
    case "followDive":
      return doctrine.features.accessMethod === "dive"
        ? "syncDiveSameTarget"
        : "followInitiatorTarget";
    case "frontline":
      if (doctrine.frontline === "screenCarry") return "screenCarry";
      if (doctrine.frontline === "alternateAggro") return "alternateFrontline";
      if (doctrine.frontline === "collapseSameZone") return "compressMeleeSpace";
      if (doctrine.frontline === "preserveRangedSpace") return "denyApproach";
      return "holdFollowupRange";
    case "primaryDamage":
      if (doctrine.damage === "repeatPoke") return "damageAfterPoke";
      if (doctrine.target === "intrudingDiver") return "damageIntrudingDiver";
      if (doctrine.target === "exposedBackline") return "damageExposedBackline";
      if (doctrine.target === "controlledTarget") return "damageControlledTarget";
      return "damageNearestThreat";
    case "followupDamage":
      return "applySafeFollowupDamage";
    case "poke":
      return "repeatPoke";
    case "control":
      return doctrine.target === "intrudingDiver" ? "holdControlForDiver" : "chainControlOnTarget";
    case "suppress":
      return "suppressApproach";
    case "protect":
      return "protectPrimaryDamage";
    case "finish":
      return "finishCurrentTarget";
  }
}

function memberAvoidForStep(
  step: CompositionCombatStep,
  doctrine: Omit<CompositionCombatDoctrine, "memberDuties">
): MemberAvoidKey {
  switch (step.task) {
    case "initiate":
    case "followDive":
      return doctrine.features.accessMethod === "dive"
        ? "doNotEnterAlone"
        : "doNotLeaveFollowupRange";
    case "frontline":
      if (doctrine.features.frontlineStructure === "doubleFront") {
        return "doNotOverlapFrontCooldowns";
      }
      if (doctrine.features.frontlineStructure === "tripleMelee") {
        return "doNotSplitMeleeTarget";
      }
      return "doNotOverchase";
    case "primaryDamage":
    case "followupDamage":
    case "poke":
      return doctrine.features.frontlineStructure === "noFront"
        ? "keepEscapeTool"
        : "doNotCrossFrontline";
    case "control":
    case "protect":
      return "doNotSpendDefensiveToolEarly";
    case "suppress":
      return "doNotSpendSuppressionEarly";
    case "finish":
      return "doNotChangeTargetEarly";
  }
}

function buildCombatDoctrine(
  members: CompositionMemberProfile[],
  combatSequence: [CompositionCombatStep, CompositionCombatStep, CompositionCombatStep]
): CompositionCombatDoctrine {
  const damageDelivery = damageDeliveryForMembers(members);
  const accessMethod = accessMethodForMembers(members);
  const carryDependency = carryDependencyForMembers(members);
  const frontlineStructure = frontlineStructureForMembers(members);
  const fightLength: FightLengthKey =
    damageDelivery === "burst" && countTrait(members, "sustain") < 2 ? "shortWindow" : "longCycle";
  const targetRule = targetRuleForFeatures(damageDelivery, accessMethod);

  const winCondition: WinConditionKey =
    damageDelivery === "poke"
      ? "pokeBeforeCommit"
      : damageDelivery === "burst"
        ? "syncBurstWindow"
        : carryDependency === "careRequired"
          ? "preserveCarryUptime"
          : frontlineStructure === "tripleMelee"
            ? "compressMeleeSpace"
            : frontlineStructure === "doubleFront"
              ? "rotateFrontline"
              : frontlineStructure === "noFront"
                ? "preserveRangedSpacing"
                : "sustainAccessibleTarget";

  const opening: OpeningRuleKey =
    damageDelivery === "poke"
      ? "pokeThenCommit"
      : accessMethod === "counterEngage"
        ? "waitEnemyEntry"
        : accessMethod === "dive"
          ? "syncDiveEntry"
          : accessMethod === "forcedEngage"
            ? "controlThenCommit"
            : "frontlineContact";

  const frontline: FrontlineRuleKey =
    frontlineStructure === "tripleMelee"
      ? "collapseSameZone"
      : frontlineStructure === "noFront"
        ? "preserveRangedSpace"
        : frontlineStructure === "doubleFront"
          ? "alternateAggro"
          : carryDependency === "careRequired"
            ? "screenCarry"
            : "holdFollowupRange";

  const damage: DamageRuleKey =
    damageDelivery === "poke"
      ? "repeatPoke"
      : damageDelivery === "burst"
        ? "overlapBurst"
        : damageDelivery === "sustained"
          ? "sustainNearest"
          : "sameTargetDistributed";

  const switchRule: SwitchRuleKey =
    fightLength === "shortWindow"
      ? "resetOnMiss"
      : damageDelivery === "poke" || frontlineStructure === "noFront"
        ? "reopenDistance"
        : frontlineStructure === "doubleFront" || frontlineStructure === "tripleMelee"
          ? "regroupOnSeparation"
          : damageDelivery === "sustained"
            ? "switchWhenOutOfRange"
            : "chaseOnlyEscapeSpent";

  const failure: FailureRuleKey =
    damageDelivery === "poke"
      ? "fightBeforePoke"
      : accessMethod === "dive"
        ? "staggeredEntry"
        : frontlineStructure === "tripleMelee"
          ? "splitMeleeTargets"
          : frontlineStructure === "doubleFront"
            ? "simultaneousFrontCooldowns"
            : frontlineStructure === "noFront"
              ? "spendAllMobility"
              : carryDependency === "careRequired"
                ? "frontlineOverextends"
                : "splitDamage";

  const doctrine = {
    features: {
      damageDelivery,
      accessMethod,
      carryDependency,
      frontlineStructure,
      fightLength,
      targetRule,
    },
    winCondition,
    opening,
    target: targetRule,
    frontline,
    damage,
    switchRule,
    failure,
  } satisfies Omit<CompositionCombatDoctrine, "memberDuties">;

  const memberDuties = combatSequence.map((step) => {
    const member = members.find(
      (candidate) => candidate.character === step.character && candidate.weapon === step.weapon
    );
    const secondaryTask = member ? secondaryTaskForMember(member, step.task) : undefined;
    return {
      ...step,
      ...(secondaryTask ? { secondaryTask } : {}),
      action: memberActionForStep(step, doctrine),
      avoid: memberAvoidForStep(step, doctrine),
    };
  }) as [CompositionMemberDuty, CompositionMemberDuty, CompositionMemberDuty];

  return { ...doctrine, memberDuties };
}

export function classifyCompositionPattern(
  members: CompositionMemberProfile[]
): CompositionPatternKey {
  const hasCapabilityVectors = members.every((member) => Boolean(member.capabilities));
  const hasTank = hasRole(members, "tank");
  const hasSupport = hasRole(members, "support");
  const assassinCount = countPrimary(members, "assassin");
  const frontlineCount = countPrimaryIn(members, ["tank", "warrior"]);
  const backlineDamageCount = countPrimaryIn(members, ["skillDealer", "rangedCarry"]);
  const closeRangeCount = countPrimaryIn(members, ["tank", "warrior", "assassin"]);
  const engageCount = hasCapabilityVectors
    ? countCapable(members, "initiate")
    : countTrait(members, "engage");
  const diveCount = hasCapabilityVectors
    ? countCapable(members, "followDive")
    : countTrait(members, "dive");
  const protectCount = hasCapabilityVectors
    ? countCapable(members, "protect")
    : countTrait(members, "protect");
  const pokeCount = hasCapabilityVectors
    ? countCapable(members, "poke")
    : countTrait(members, "poke");
  const burstCount = countTrait(members, "burst");
  const sustainCount = countTrait(members, "sustain");

  if (hasTank && hasSupport && backlineDamageCount >= 1) return "threeLayer";
  if (engageCount >= 1 && diveCount >= 1) return "diveFollow";
  if (protectCount >= 1 && backlineDamageCount >= 1) return "protectCarry";
  if (pokeCount >= 2 && engageCount === 0) return "pokeKite";
  if (burstCount >= 2 && (diveCount >= 1 || assassinCount >= 1)) return "pickBurst";
  if (assassinCount >= 1 && frontlineCount >= 1) return "diveFollow";
  if (frontlineCount >= 2 && backlineDamageCount >= 1) return "doubleFront";
  if (hasTank && backlineDamageCount >= 1) return "frontToBack";
  if (hasSupport && backlineDamageCount >= 1) return "protectCarry";
  if (assassinCount >= 2) return "pickBurst";
  if (backlineDamageCount >= 2 && frontlineCount === 0) return "pokeKite";
  if (sustainCount >= 2 || closeRangeCount >= 2) return "brawl";
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

const COMPOSITION_INSIGHT_CACHE_LIMIT = 512;
const compositionInsightCache = new Map<string, TrioCompositionInsight>();

function getCompositionInsightCacheKey(
  input: readonly [CompositionMemberInput, CompositionMemberInput, CompositionMemberInput],
  affinityEvidence?: CompositionAffinityEvidence | null
) {
  const trioKey = input.map((member) => `${member.character}:${member.weapon}`).join("|");
  if (!affinityEvidence) return `${trioKey}:legacy`;
  const profileKey = affinityEvidence.members
    .map((member) =>
      member.classification
        ? `${member.characterCode}:${member.weapon}:${member.classification.role}:${member.classification.firstOrderType}`
        : `${member.characterCode}:${member.weapon}:unclassified`
    )
    .sort((left, right) => left.localeCompare(right, "ko"))
    .join("|");
  const prototypeKey = affinityEvidence.prototype
    ? `${affinityEvidence.prototype.match}:${affinityEvidence.prototype.key}`
    : "no-prototype";
  return `${trioKey}:${affinityEvidence.matchedMembers}:${prototypeKey}:${profileKey}`;
}

function buildPrototypeMemberProfiles(
  members: [CompositionMemberProfile, CompositionMemberProfile, CompositionMemberProfile],
  affinityEvidence?: CompositionAffinityEvidence | null
): [CompositionMemberProfile, CompositionMemberProfile, CompositionMemberProfile] | null {
  if (!affinityEvidence?.prototype) return null;
  return members.map((member) => {
    const match = affinityEvidence.prototype?.memberMatches.find(
      (candidate) =>
        candidate.characterCode === member.character && candidate.weapon === member.weapon
    );
    const traits = match ? getCompositionTypeTraits(match.type) : [];
    if (traits.length === 0) return member;
    const profile = {
      ...member,
      traits,
      formation: formationForMember(member.primaryRole, traits),
      effectiveRange: rangeForMember(member.primaryRole, traits),
    } satisfies CompositionMemberProfile;
    return {
      ...profile,
      capabilities: buildCapabilityVector(profile, true),
    };
  }) as [CompositionMemberProfile, CompositionMemberProfile, CompositionMemberProfile];
}

function computeTrioCompositionInsight(
  input: readonly [CompositionMemberInput, CompositionMemberInput, CompositionMemberInput],
  affinityEvidence?: CompositionAffinityEvidence | null
): TrioCompositionInsight {
  const members = input.map((member) => {
    const affinityMember = affinityMemberForInput(affinityEvidence, member);
    const affinityRole = affinityMember?.classification?.role as CharacterRole | undefined;
    const roles = affinityRole
      ? toRoleKeys([affinityRole])
      : toRoleKeys(getComboRoles(member.character, member.weapon));
    const affinityTraits = affinityMember?.classification
      ? getCompositionTypeTraits(
          affinityMember.classification.groupName,
          affinityMember.classification.subtype,
          affinityMember.classification.firstOrderType
        )
      : [];
    const traits = affinityTraits.length > 0 ? affinityTraits : traitsForMember(member);
    const primaryRole = roles[0];
    const profile = {
      ...member,
      roles,
      traits,
      primaryRole,
      flexible: roles.length > 1,
      formation: formationForMember(primaryRole, traits),
      effectiveRange: rangeForMember(primaryRole, traits),
    } satisfies CapabilityProfileInput;
    return {
      ...profile,
      capabilities: buildCapabilityVector(profile, affinityMember?.classification != null),
    } satisfies CompositionMemberProfile;
  }) as [CompositionMemberProfile, CompositionMemberProfile, CompositionMemberProfile];
  const prototypeMembers = buildPrototypeMemberProfiles(members, affinityEvidence);
  const teamStructureMembers = prototypeMembers ?? members;
  const pattern = classifyCompositionPattern(teamStructureMembers);
  const combatPlan = combatPlanForMembers(teamStructureMembers);
  const combatSequence = buildCombatSequence(members, combatPlan);
  const affinityClassifiedMembers = affinityEvidence?.classifiedMembers ?? 0;
  const affinityMatchedMembers = affinityEvidence?.matchedMembers ?? 0;
  const analysisBasis: CompositionAnalysisBasisKey =
    affinityEvidence?.prototype?.match === "exact"
      ? "successfulPrototypeExact"
      : affinityEvidence?.prototype?.match === "nearest"
        ? "successfulPrototypeNearest"
        : affinityMatchedMembers >= 2
          ? "affinityEvidence"
          : affinityClassifiedMembers > 0
            ? "affinityTypes"
            : "legacyCapabilities";

  return {
    members,
    pattern,
    combatPlan,
    combatSequence,
    combatDoctrine: buildCombatDoctrine(teamStructureMembers, combatSequence),
    powerSpike: powerSpikeForPattern(pattern),
    favorableMatchup: favorableMatchupForPattern(pattern),
    threatMatchup: threatMatchupForPattern(pattern),
    // 현재 DB는 팀 결과 집계만 가지며 실제 교전 상대와 획득 시각을 제공하지 않는다.
    hasDirectMatchupEvidence: false,
    hasTimedPowerSpikeEvidence: false,
    analysisBasis,
    affinityClassifiedMembers,
    affinityMatchedMembers,
  };
}

export function buildTrioCompositionInsight(
  input: readonly [CompositionMemberInput, CompositionMemberInput, CompositionMemberInput],
  affinityEvidence?: CompositionAffinityEvidence | null
): TrioCompositionInsight {
  const cacheKey = getCompositionInsightCacheKey(input, affinityEvidence);
  const cached = compositionInsightCache.get(cacheKey);
  if (cached) return cached;

  const insight = computeTrioCompositionInsight(input, affinityEvidence);
  compositionInsightCache.set(cacheKey, insight);
  if (compositionInsightCache.size > COMPOSITION_INSIGHT_CACHE_LIMIT) {
    const oldestKey = compositionInsightCache.keys().next().value;
    if (oldestKey !== undefined) compositionInsightCache.delete(oldestKey);
  }
  return insight;
}
