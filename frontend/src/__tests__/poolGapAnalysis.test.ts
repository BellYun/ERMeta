import { describe, expect, it } from "vitest";
import { PROFILE_AXES, type CharacterProfileVector } from "@/lib/characterProfileAxes";
import {
  POOL_ROLES,
  analyzeCharacterPool,
  type PoolProfile,
  type PoolSynergyContext,
} from "@/lib/poolGapAnalysis";

function vector(values: Partial<CharacterProfileVector>): CharacterProfileVector {
  return {
    ...(Object.fromEntries(PROFILE_AXES.map((axis) => [axis, 0])) as CharacterProfileVector),
    ...values,
  };
}

function context(
  partnerRoles: [string, string],
  adjustedRp: number,
  games = 1_000
): PoolSynergyContext {
  return {
    key: [...partnerRoles].sort((left, right) => left.localeCompare(right, "ko")).join("|"),
    partnerRoles,
    adjustedRp,
    games,
  };
}

function profile(
  overrides: Partial<PoolProfile> & Pick<PoolProfile, "profileKey" | "characterCode">
): PoolProfile {
  return {
    characterName: overrides.profileKey,
    weapon: 1,
    weaponName: "test",
    role: "전사",
    typeName: "test",
    traits: [],
    profileVector: vector({}),
    vectorEvidence: { source: "officialSkillText", skillCount: 5 },
    controlDifficulty: 0.5,
    difficultyRating: 3,
    difficultyEvidence: {
      source: "officialCharacterAttributes",
      version: "nimble-neuron-character-attributes-v1",
      tableHash: 1,
    },
    synergyContexts: [],
    evidenceGames: 1_000,
    evidenceRp: 0,
    seasonConsistency: "insufficient",
    ...overrides,
  };
}

const representativeCatalog = POOL_ROLES.map((role, index) =>
  profile({
    profileKey: `role-${role}`,
    characterCode: 100 + index,
    role,
    profileVector: vector({
      engage: role === "탱커" ? 0.9 : 0.25,
      frontline: role === "탱커" || role === "전사" ? 0.9 : 0.2,
      finish: role === "암살자" ? 0.95 : 0.4,
      peel: role === "지원가" ? 0.95 : 0.25,
      burst: role === "스킬딜러" || role === "암살자" ? 0.9 : 0.35,
      sustainedDps: role === "원거리 딜러" ? 0.95 : 0.45,
      rangePressure: role === "원거리 딜러" || role === "스킬딜러" ? 0.9 : 0.2,
    }),
  })
);

describe("analyzeCharacterPool", () => {
  it("evaluates all 21 unordered allied role combinations", () => {
    const selected = profile({
      profileKey: "main",
      characterCode: 1,
      synergyContexts: [context(["암살자", "지원가"], 3, 1_000)],
      profileVector: vector({ engage: 0.8, frontline: 0.8, crowdControl: 0.75 }),
    });

    const result = analyzeCharacterPool([selected], [selected, ...representativeCatalog]);
    const covered = result.scenarios.find(
      (scenario) =>
        scenario.partnerRoles.includes("암살자") && scenario.partnerRoles.includes("지원가")
    );

    expect(result.scenarios).toHaveLength(21);
    expect(covered?.status).toBe("covered");
    expect(covered?.bestPick?.profile.profileKey).toBe("main");
  });

  it("treats the selected characters as alternatives instead of adding their vectors together", () => {
    const first = profile({
      profileKey: "first",
      characterCode: 1,
      profileVector: vector({ engage: 0.6 }),
    });
    const second = profile({
      profileKey: "second",
      characterCode: 2,
      profileVector: vector({ engage: 0.6 }),
    });

    const result = analyzeCharacterPool([first, second], [first, second, ...representativeCatalog]);

    expect(result.axisCoverage.find((item) => item.axis === "engage")?.value).toBe(0.6);
  });

  it("chooses reliable positive role synergy before a structurally similar negative pick", () => {
    const negativeFrontliner = profile({
      profileKey: "negative-frontliner",
      characterCode: 1,
      profileVector: vector({ engage: 0.98, frontline: 0.98, peel: 0.9 }),
      synergyContexts: [context(["원거리 딜러", "원거리 딜러"], -1)],
    });
    const positiveFrontliner = profile({
      profileKey: "positive-frontliner",
      characterCode: 2,
      profileVector: vector({ engage: 0.75, frontline: 0.8, peel: 0.55 }),
      synergyContexts: [context(["원거리 딜러", "원거리 딜러"], 2.9, 629)],
    });

    const result = analyzeCharacterPool(
      [negativeFrontliner, positiveFrontliner],
      [negativeFrontliner, positiveFrontliner, ...representativeCatalog]
    );
    const twoRanged = result.scenarios.find((scenario) =>
      scenario.partnerRoles.every((role) => role === "원거리 딜러")
    );

    expect(twoRanged?.bestPick?.profile.profileKey).toBe("positive-frontliner");
    expect(twoRanged?.status).toBe("covered");
  });

  it("recommends only unselected characters from the pool owner's main position", () => {
    const currentMelee = profile({
      profileKey: "current-melee",
      characterCode: 1,
      role: "전사",
      profileVector: vector({ sustainedDps: 0.55 }),
    });
    const meleeAddition = profile({
      profileKey: "melee-addition",
      characterCode: 2,
      role: "암살자",
      profileVector: vector({ chase: 0.92, finish: 0.95, burst: 0.92, mobility: 0.9 }),
      synergyContexts: [context(["탱커", "지원가"], 2.5)],
    });
    const offPositionTank = profile({
      profileKey: "off-position-tank",
      characterCode: 3,
      role: "탱커",
      profileVector: vector({ engage: 0.98, frontline: 0.98, peel: 0.9 }),
      synergyContexts: [context(["탱커", "지원가"], 4)],
    });

    const result = analyzeCharacterPool(
      [currentMelee],
      [currentMelee, meleeAddition, offPositionTank, ...representativeCatalog]
    );

    expect(result.preferredArchetype).toBe("melee");
    expect(result.recommendations.map((item) => item.profile.profileKey)).toContain(
      "melee-addition"
    );
    expect(result.recommendations.map((item) => item.profile.profileKey)).not.toContain(
      "off-position-tank"
    );
  });

  it("keeps only the best weapon profile for each recommended character", () => {
    const current = profile({ profileKey: "current", characterCode: 1 });
    const weakWeapon = profile({
      profileKey: "weak",
      characterCode: 2,
      weapon: 1,
      profileVector: vector({ engage: 0.5 }),
    });
    const strongWeapon = profile({
      profileKey: "strong",
      characterCode: 2,
      weapon: 2,
      profileVector: vector({ engage: 0.95, frontline: 0.9, crowdControl: 0.85 }),
      synergyContexts: [context(["원거리 딜러", "원거리 딜러"], 2.9)],
    });

    const result = analyzeCharacterPool(
      [current],
      [current, weakWeapon, strongWeapon, ...representativeCatalog]
    );
    const characterRecommendations = result.recommendations.filter(
      (item) => item.profile.characterCode === 2
    );

    expect(characterRecommendations).toHaveLength(1);
    expect(characterRecommendations[0].profile.profileKey).toBe("strong");
  });

  it("excludes hard additions when the selected pool prefers easy controls", () => {
    const current = profile({
      profileKey: "easy-current",
      characterCode: 1,
      controlDifficulty: 0.28,
    });
    const easyAddition = profile({
      profileKey: "easy-addition",
      characterCode: 2,
      controlDifficulty: 0.3,
      profileVector: vector({ engage: 0.92, frontline: 0.9, crowdControl: 0.85 }),
      synergyContexts: [context(["원거리 딜러", "원거리 딜러"], 2.9)],
    });
    const hardAddition = profile({
      profileKey: "hard-addition",
      characterCode: 3,
      controlDifficulty: 0.84,
      profileVector: easyAddition.profileVector,
      synergyContexts: easyAddition.synergyContexts,
    });

    const result = analyzeCharacterPool(
      [current],
      [current, easyAddition, hardAddition, ...representativeCatalog]
    );

    expect(result.difficultyTendency).toBe("easy");
    expect(result.recommendations[0].profile.profileKey).toBe("easy-addition");
    expect(result.recommendations[0].difficultyPenalty).toBe(0);
    const hardRecommendation = result.recommendations.find(
      (item) => item.profile.profileKey === "hard-addition"
    );
    expect(hardRecommendation).toBeUndefined();
  });

  it("uses the difficulty range selected by the user", () => {
    const current = profile({
      profileKey: "current",
      characterCode: 1,
      controlDifficulty: 0.25,
    });
    const candidateVector = vector({ engage: 0.92, frontline: 0.9, crowdControl: 0.85 });
    const candidateSynergy = [context(["원거리 딜러", "원거리 딜러"], 2.9)];
    const easyAddition = profile({
      profileKey: "easy",
      characterCode: 2,
      controlDifficulty: 0.25,
      profileVector: candidateVector,
      synergyContexts: candidateSynergy,
    });
    const mediumAddition = profile({
      profileKey: "medium",
      characterCode: 3,
      controlDifficulty: 0.5,
      profileVector: candidateVector,
      synergyContexts: candidateSynergy,
    });
    const hardAddition = profile({
      profileKey: "hard",
      characterCode: 4,
      controlDifficulty: 0.75,
      profileVector: candidateVector,
      synergyContexts: candidateSynergy,
    });
    const catalog = [current, easyAddition, mediumAddition, hardAddition, ...representativeCatalog];

    const easyResult = analyzeCharacterPool([current], catalog, {
      difficultyPreference: "easy",
    });
    const mediumResult = analyzeCharacterPool([current], catalog, {
      difficultyPreference: "medium",
    });
    const anyResult = analyzeCharacterPool([current], catalog, {
      difficultyPreference: "any",
    });

    expect(easyResult.recommendations.map((item) => item.profile.profileKey)).toContain("easy");
    expect(easyResult.recommendations.map((item) => item.profile.profileKey)).not.toContain(
      "medium"
    );
    expect(mediumResult.recommendations.map((item) => item.profile.profileKey)).toContain("medium");
    expect(mediumResult.recommendations.map((item) => item.profile.profileKey)).not.toContain(
      "hard"
    );
    expect(anyResult.recommendations.map((item) => item.profile.profileKey)).toContain("hard");
    expect(
      anyResult.recommendations.find((item) => item.profile.profileKey === "hard")
        ?.difficultyPenalty
    ).toBe(0);
  });

  it("does not penalize an easier candidate for a technical pool", () => {
    const current = profile({
      profileKey: "technical-current",
      characterCode: 1,
      controlDifficulty: 0.82,
    });
    const easierAddition = profile({
      profileKey: "easier-addition",
      characterCode: 2,
      controlDifficulty: 0.32,
      profileVector: vector({ engage: 0.92, frontline: 0.9, crowdControl: 0.85 }),
      synergyContexts: [context(["원거리 딜러", "원거리 딜러"], 2.9)],
    });

    const result = analyzeCharacterPool(
      [current],
      [current, easierAddition, ...representativeCatalog]
    );

    expect(result.difficultyTendency).toBe("technical");
    expect(result.recommendations[0].difficultyPenalty).toBe(0);
  });
});
