import {
  PROFILE_AXES,
  getCharacterProfileLayer,
  type CharacterProfileAxis,
  type CharacterProfileLayer,
  type CharacterProfileVector,
  type CharacterProfileVectorEvidence,
} from "@/lib/characterProfileAxes";
import type { CompositionTraitKey } from "@/lib/synergyComposition";

export type PoolArchetypeKey = "melee" | "tank" | "marksman" | "caster" | "support";
export type PoolCoverageStatus = "vulnerable" | "limited" | "covered";
export type PoolDifficultyTendency = "easy" | "balanced" | "technical";
export type ControlDifficultyLevel = "easy" | "medium" | "hard";
export type PoolDifficultyPreference = "auto" | "easy" | "medium" | "any";

export interface PoolAnalysisOptions {
  recommendationLimit?: number;
  difficultyPreference?: PoolDifficultyPreference;
}

export const POOL_ROLES = ["탱커", "전사", "암살자", "스킬딜러", "원거리 딜러", "지원가"] as const;

export type PoolRole = (typeof POOL_ROLES)[number];

export interface PoolSynergyContext {
  key: string;
  partnerRoles: [string, string];
  games: number;
  adjustedRp: number;
}

export interface PoolProfile {
  profileKey: string;
  characterCode: number;
  characterName: string;
  weapon: number | null;
  weaponName: string;
  role: string;
  typeName: string;
  traits: CompositionTraitKey[];
  profileVector: CharacterProfileVector;
  vectorEvidence: CharacterProfileVectorEvidence;
  controlDifficulty: number;
  difficultyRating: number | null;
  difficultyEvidence: {
    source: "officialCharacterAttributes" | "officialSkillTextProxy" | "roleTypeFallback";
    version: "nimble-neuron-character-attributes-v1" | "control-difficulty-v1";
    tableHash: number | null;
  };
  synergyContexts: PoolSynergyContext[];
  evidenceGames: number;
  evidenceRp: number | null;
  seasonConsistency: "both-positive" | "mixed" | "insufficient";
}

export interface PoolAxisCoverage {
  axis: CharacterProfileAxis;
  layer: CharacterProfileLayer;
  value: number;
  gap: number;
  bestProfile: PoolProfile | null;
}

export interface PoolAxisFill {
  axis: CharacterProfileAxis;
  layer: CharacterProfileLayer;
  before: number;
  after: number;
  gain: number;
}

export interface PoolRecommendationSynergy {
  partnerRoles: [string, string];
  adjustedRp: number;
  games: number;
}

export interface PoolScenarioPick {
  profile: PoolProfile;
  score: number;
  axisFills: PoolAxisFill[];
  redundancyPenalty: number;
  synergy: PoolRecommendationSynergy | null;
}

export interface PoolRoleScenario {
  key: string;
  partnerRoles: [PoolRole, PoolRole];
  status: PoolCoverageStatus;
  bestPick: PoolScenarioPick | null;
  viablePickCount: number;
  priorityGaps: CharacterProfileAxis[];
}

export interface PoolScenarioImprovement {
  key: string;
  partnerRoles: [PoolRole, PoolRole];
  before: PoolCoverageStatus;
  after: PoolCoverageStatus;
  synergy: PoolRecommendationSynergy | null;
}

export interface PoolRecommendation {
  profile: PoolProfile;
  score: number;
  axisFills: PoolAxisFill[];
  redundancyPenalty: number;
  difficultyDelta: number;
  difficultyPenalty: number;
  improvements: PoolScenarioImprovement[];
}

export interface PoolGapAnalysis {
  pool: PoolProfile[];
  axisCoverage: PoolAxisCoverage[];
  scenarios: PoolRoleScenario[];
  recommendations: PoolRecommendation[];
  roleCounts: Record<string, number>;
  typeCounts: Record<string, number>;
  preferredArchetype: PoolArchetypeKey | null;
  difficultyScore: number | null;
  difficultyTendency: PoolDifficultyTendency | null;
  difficultyUsesFallback: boolean;
}

const LAYER_WEIGHTS: Record<CharacterProfileLayer, number> = {
  function: 1.15,
  damage: 1.1,
  combat: 0.9,
};

const STATUS_RANK: Record<PoolCoverageStatus, number> = {
  vulnerable: 0,
  limited: 1,
  covered: 2,
};

export function getControlDifficultyLevel(score: number): ControlDifficultyLevel {
  if (score < 0.44) return "easy";
  if (score < 0.66) return "medium";
  return "hard";
}

function getMedian(values: number[]) {
  if (values.length === 0) return null;
  const sorted = values.toSorted((left, right) => left - right);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[middle - 1] + sorted[middle]) / 2 : sorted[middle];
}

function getDifficultyTendency(score: number | null): PoolDifficultyTendency | null {
  if (score == null) return null;
  const level = getControlDifficultyLevel(score);
  if (level === "easy") return "easy";
  if (level === "hard") return "technical";
  return "balanced";
}

function getDifficultyFit(
  profile: PoolProfile,
  poolDifficulty: number | null,
  difficultyPreference: PoolDifficultyPreference
) {
  if (poolDifficulty == null) return { delta: 0, penalty: 0 };
  const delta = profile.controlDifficulty - poolDifficulty;
  if (difficultyPreference !== "auto") return { delta, penalty: 0 };
  const harderGap = Math.max(0, delta - 0.06);
  return {
    delta,
    // Deliberately asymmetric: an easier candidate is never punished. Difficulty
    // refines otherwise useful additions; it does not override composition fit.
    penalty: harderGap * 7,
  };
}

function isDifficultyCompatible(
  profile: PoolProfile,
  poolDifficulty: number | null,
  difficultyPreference: PoolDifficultyPreference
) {
  const candidateLevel = getControlDifficultyLevel(profile.controlDifficulty);
  if (difficultyPreference === "easy") return candidateLevel === "easy";
  if (difficultyPreference === "medium") return candidateLevel !== "hard";
  if (difficultyPreference === "any") return true;

  // Auto follows the selected pool: easy pools can bridge into medium picks,
  // but do not jump directly to characters rated hard by the official data.
  return !(getDifficultyTendency(poolDifficulty) === "easy" && candidateLevel === "hard");
}

export function getPoolArchetype(profile: Pick<PoolProfile, "role">): PoolArchetypeKey {
  switch (profile.role) {
    case "탱커":
      return "tank";
    case "원거리 딜러":
      return "marksman";
    case "스킬딜러":
      return "caster";
    case "지원가":
      return "support";
    case "전사":
    case "암살자":
    default:
      return "melee";
  }
}

function inferPreferredArchetype(selected: PoolProfile[]): PoolArchetypeKey | null {
  if (selected.length === 0) return null;
  const firstSeen = [...new Set(selected.map(getPoolArchetype))];
  const counts = selected.reduce<Partial<Record<PoolArchetypeKey, number>>>((result, profile) => {
    const archetype = getPoolArchetype(profile);
    result[archetype] = (result[archetype] ?? 0) + 1;
    return result;
  }, {});
  return firstSeen.sort((left, right) => (counts[right] ?? 0) - (counts[left] ?? 0))[0];
}

function saturatingCombine(values: number[]) {
  return 1 - values.reduce((remaining, value) => remaining * (1 - value), 1);
}

function averageVector(profiles: PoolProfile[]): CharacterProfileVector {
  return Object.fromEntries(
    PROFILE_AXES.map((axis) => [
      axis,
      profiles.length === 0
        ? 0
        : profiles.reduce((sum, profile) => sum + profile.profileVector[axis], 0) / profiles.length,
    ])
  ) as CharacterProfileVector;
}

function buildRoleVectors(catalog: PoolProfile[]) {
  return Object.fromEntries(
    POOL_ROLES.map((role) => [
      role,
      averageVector(catalog.filter((profile) => profile.role === role)),
    ])
  ) as Record<PoolRole, CharacterProfileVector>;
}

function buildRolePairs(): Array<[PoolRole, PoolRole]> {
  return POOL_ROLES.flatMap((left, leftIndex) =>
    POOL_ROLES.slice(leftIndex).map((right) => [left, right] as [PoolRole, PoolRole])
  );
}

function buildTeamAxisCoverage(
  partnerRoles: [PoolRole, PoolRole],
  roleVectors: Record<PoolRole, CharacterProfileVector>
): PoolAxisCoverage[] {
  return PROFILE_AXES.map((axis) => {
    const value = saturatingCombine(partnerRoles.map((role) => roleVectors[role][axis]));
    return {
      axis,
      layer: getCharacterProfileLayer(axis),
      value,
      gap: 1 - value,
      bestProfile: null,
    };
  });
}

function buildPoolAxisCoverage(pool: PoolProfile[]): PoolAxisCoverage[] {
  return PROFILE_AXES.map((axis) => {
    const ranked = pool.toSorted(
      (left, right) => right.profileVector[axis] - left.profileVector[axis]
    );
    const value = ranked[0]?.profileVector[axis] ?? 0;
    return {
      axis,
      layer: getCharacterProfileLayer(axis),
      value,
      gap: 1 - value,
      bestProfile: ranked[0] ?? null,
    };
  });
}

function buildTeamAxisFills(profile: PoolProfile, coverage: PoolAxisCoverage[]): PoolAxisFill[] {
  return coverage
    .map((item) => {
      const after = saturatingCombine([item.value, profile.profileVector[item.axis]]);
      return {
        axis: item.axis,
        layer: item.layer,
        before: item.value,
        after,
        gain: after - item.value,
      };
    })
    .filter((fill) => fill.gain >= 0.08 && profile.profileVector[fill.axis] >= 0.45)
    .sort(
      (left, right) =>
        right.gain * LAYER_WEIGHTS[right.layer] - left.gain * LAYER_WEIGHTS[left.layer]
    );
}

function buildPoolAxisFills(profile: PoolProfile, coverage: PoolAxisCoverage[]): PoolAxisFill[] {
  return coverage
    .map((item) => {
      const after = Math.max(item.value, profile.profileVector[item.axis]);
      return {
        axis: item.axis,
        layer: item.layer,
        before: item.value,
        after,
        gain: after - item.value,
      };
    })
    .filter((fill) => fill.gain >= 0.08)
    .sort(
      (left, right) =>
        right.gain * LAYER_WEIGHTS[right.layer] - left.gain * LAYER_WEIGHTS[left.layer]
    );
}

function redundancyPenalty(profile: PoolProfile, coverage: PoolAxisCoverage[]) {
  return coverage.reduce((sum, item) => {
    const saturated = Math.max(0, item.value - 0.72);
    return sum + profile.profileVector[item.axis] * saturated * saturated;
  }, 0);
}

function rolePairKey(partnerRoles: readonly string[]) {
  return [...partnerRoles].sort((left, right) => left.localeCompare(right, "ko")).join("|");
}

function getLongTermSynergy(
  profile: PoolProfile,
  partnerRoles: [PoolRole, PoolRole]
): PoolRecommendationSynergy | null {
  const key = rolePairKey(partnerRoles);
  const context = profile.synergyContexts.find((item) => item.key === key);
  if (!context) return null;

  const reliability = Math.min(1, Math.sqrt(context.games / 1_000));
  return {
    partnerRoles: context.partnerRoles,
    adjustedRp: context.adjustedRp * reliability,
    games: context.games,
  };
}

function scoreScenarioPick(
  profile: PoolProfile,
  axisFills: PoolAxisFill[],
  penalty: number,
  synergy: PoolRecommendationSynergy | null
) {
  const gapFit = axisFills.reduce(
    (sum, fill, index) =>
      sum +
      fill.gain * (1 + (1 - fill.before)) * LAYER_WEIGHTS[fill.layer] * (index < 5 ? 1 : 0.35),
    0
  );
  const synergyScore = synergy == null ? 0 : Math.max(-2, Math.min(3, synergy.adjustedRp)) * 0.65;
  return gapFit * 8 - penalty * 2.5 + synergyScore;
}

function evaluateScenarioPick(
  profile: PoolProfile,
  partnerRoles: [PoolRole, PoolRole],
  coverage: PoolAxisCoverage[]
): PoolScenarioPick {
  const axisFills = buildTeamAxisFills(profile, coverage);
  const penalty = redundancyPenalty(profile, coverage);
  const synergy = getLongTermSynergy(profile, partnerRoles);
  return {
    profile,
    score: scoreScenarioPick(profile, axisFills, penalty, synergy),
    axisFills: axisFills.slice(0, 5),
    redundancyPenalty: penalty,
    synergy,
  };
}

function classifyPick(pick: PoolScenarioPick | null): PoolCoverageStatus {
  if (!pick) return "vulnerable";
  const synergy = pick.synergy?.adjustedRp;
  if (synergy != null && synergy >= 0.75) return "covered";
  if (synergy != null && synergy < 0) return "vulnerable";
  return pick.score >= 4.5 ? "limited" : "vulnerable";
}

function buildScenarios(pool: PoolProfile[], catalog: PoolProfile[]): PoolRoleScenario[] {
  const roleVectors = buildRoleVectors(catalog);
  return buildRolePairs().map((partnerRoles) => {
    const coverage = buildTeamAxisCoverage(partnerRoles, roleVectors);
    const picks = pool
      .map((profile) => evaluateScenarioPick(profile, partnerRoles, coverage))
      .sort(
        (left, right) =>
          STATUS_RANK[classifyPick(right)] - STATUS_RANK[classifyPick(left)] ||
          (right.synergy?.adjustedRp ?? Number.NEGATIVE_INFINITY) -
            (left.synergy?.adjustedRp ?? Number.NEGATIVE_INFINITY) ||
          right.score - left.score
      );
    const bestPick = picks[0] ?? null;
    return {
      key: rolePairKey(partnerRoles),
      partnerRoles,
      status: classifyPick(bestPick),
      bestPick,
      viablePickCount: picks.filter((pick) => classifyPick(pick) !== "vulnerable").length,
      priorityGaps: coverage
        .toSorted((left, right) => right.gap - left.gap)
        .slice(0, 3)
        .map((item) => item.axis),
    };
  });
}

function buildRecommendations(
  pool: PoolProfile[],
  catalog: PoolProfile[],
  scenarios: PoolRoleScenario[],
  poolCoverage: PoolAxisCoverage[],
  preferredArchetype: PoolArchetypeKey | null,
  poolDifficulty: number | null,
  difficultyPreference: PoolDifficultyPreference,
  recommendationLimit: number
) {
  if (!preferredArchetype) return [];
  const roleVectors = buildRoleVectors(catalog);
  const selectedCharacterCodes = new Set(pool.map((profile) => profile.characterCode));
  const bestByCharacter = new Map<number, PoolRecommendation>();

  for (const profile of catalog) {
    if (selectedCharacterCodes.has(profile.characterCode)) continue;
    if (getPoolArchetype(profile) !== preferredArchetype) continue;
    if (!isDifficultyCompatible(profile, poolDifficulty, difficultyPreference)) continue;

    const improvements = scenarios.flatMap((scenario) => {
      if (scenario.status === "covered") return [];
      const coverage = buildTeamAxisCoverage(scenario.partnerRoles, roleVectors);
      const candidatePick = evaluateScenarioPick(profile, scenario.partnerRoles, coverage);
      const candidateStatus = classifyPick(candidatePick);
      const currentScore = scenario.bestPick?.score ?? Number.NEGATIVE_INFINITY;
      const rankGain = STATUS_RANK[candidateStatus] - STATUS_RANK[scenario.status];
      if (rankGain <= 0 && candidatePick.score < currentScore + 1.25) return [];
      return [
        {
          key: scenario.key,
          partnerRoles: scenario.partnerRoles,
          before: scenario.status,
          after:
            rankGain > 0 || candidatePick.score > currentScore ? candidateStatus : scenario.status,
          synergy: candidatePick.synergy,
        } satisfies PoolScenarioImprovement,
      ];
    });

    if (improvements.length === 0) continue;
    const axisFills = buildPoolAxisFills(profile, poolCoverage);
    const penalty = redundancyPenalty(profile, poolCoverage);
    const difficultyFit = getDifficultyFit(profile, poolDifficulty, difficultyPreference);
    const scenarioGain = improvements.reduce((sum, improvement) => {
      const rankGain = Math.max(
        0,
        STATUS_RANK[improvement.after] - STATUS_RANK[improvement.before]
      );
      const synergy = improvement.synergy?.adjustedRp ?? 0;
      return sum + 2 + rankGain * 4 + Math.max(0, Math.min(2, synergy));
    }, 0);
    const poolGapGain = axisFills.reduce(
      (sum, fill) => sum + fill.gain * LAYER_WEIGHTS[fill.layer] * 4,
      0
    );
    const recommendation = {
      profile,
      score: scenarioGain + poolGapGain - penalty * 1.5 - difficultyFit.penalty,
      axisFills: axisFills.slice(0, 4),
      redundancyPenalty: penalty,
      difficultyDelta: difficultyFit.delta,
      difficultyPenalty: difficultyFit.penalty,
      improvements: improvements
        .toSorted(
          (left, right) =>
            STATUS_RANK[right.after] -
              STATUS_RANK[right.before] -
              (STATUS_RANK[left.after] - STATUS_RANK[left.before]) ||
            (right.synergy?.adjustedRp ?? 0) - (left.synergy?.adjustedRp ?? 0)
        )
        .slice(0, 4),
    } satisfies PoolRecommendation;
    const current = bestByCharacter.get(profile.characterCode);
    if (!current || recommendation.score > current.score) {
      bestByCharacter.set(profile.characterCode, recommendation);
    }
  }

  return [...bestByCharacter.values()]
    .sort(
      (left, right) =>
        right.score - left.score ||
        right.improvements.length - left.improvements.length ||
        left.profile.characterName.localeCompare(right.profile.characterName, "ko")
    )
    .slice(0, recommendationLimit);
}

export function analyzeCharacterPool(
  selected: PoolProfile[],
  catalog: PoolProfile[],
  { recommendationLimit = 10, difficultyPreference = "auto" }: PoolAnalysisOptions = {}
): PoolGapAnalysis {
  const pool = selected;
  const preferredArchetype = inferPreferredArchetype(pool);
  const difficultyScore = getMedian(pool.map((profile) => profile.controlDifficulty));
  const difficultyTendency = getDifficultyTendency(difficultyScore);
  const difficultyUsesFallback = pool.some(
    (profile) => profile.difficultyEvidence.source !== "officialCharacterAttributes"
  );
  const roleCounts = pool.reduce<Record<string, number>>((counts, profile) => {
    counts[profile.role] = (counts[profile.role] ?? 0) + 1;
    return counts;
  }, {});
  const typeCounts = pool.reduce<Record<string, number>>((counts, profile) => {
    counts[profile.typeName] = (counts[profile.typeName] ?? 0) + 1;
    return counts;
  }, {});
  const axisCoverage = buildPoolAxisCoverage(pool);
  const scenarios = buildScenarios(pool, catalog).toSorted(
    (left, right) =>
      STATUS_RANK[left.status] - STATUS_RANK[right.status] ||
      left.partnerRoles[0].localeCompare(right.partnerRoles[0], "ko") ||
      left.partnerRoles[1].localeCompare(right.partnerRoles[1], "ko")
  );
  const recommendations = buildRecommendations(
    pool,
    catalog,
    scenarios,
    axisCoverage,
    preferredArchetype,
    difficultyScore,
    difficultyPreference,
    recommendationLimit
  );

  return {
    pool,
    axisCoverage,
    scenarios,
    recommendations,
    roleCounts,
    typeCounts,
    preferredArchetype,
    difficultyScore,
    difficultyTendency,
    difficultyUsesFallback,
  };
}
