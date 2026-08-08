import { describe, expect, it } from "vitest";
import {
  buildTrioCompositionInsight,
  classifyCompositionPattern,
  type CompositionMemberProfile,
  type CompositionPatternKey,
  type CompositionRoleKey,
} from "@/lib/synergyComposition";

function member(
  primaryRole: CompositionRoleKey,
  roles: CompositionRoleKey[] = [primaryRole]
): CompositionMemberProfile {
  return {
    character: 1,
    weapon: 1,
    roles,
    primaryRole,
    flexible: roles.length > 1,
  };
}

const patternCases: Array<{
  expected: CompositionPatternKey;
  members: CompositionMemberProfile[];
}> = [
  {
    expected: "threeLayer",
    members: [member("tank"), member("support"), member("rangedCarry")],
  },
  {
    expected: "diveFollow",
    members: [member("tank"), member("assassin"), member("skillDealer")],
  },
  {
    expected: "doubleFront",
    members: [member("tank"), member("warrior"), member("rangedCarry")],
  },
  {
    expected: "frontToBack",
    members: [member("tank"), member("skillDealer"), member("skillDealer")],
  },
  {
    expected: "protectCarry",
    members: [member("support"), member("rangedCarry"), member("skillDealer")],
  },
  {
    expected: "pickBurst",
    members: [member("assassin"), member("assassin"), member("skillDealer")],
  },
  {
    expected: "pokeKite",
    members: [member("rangedCarry"), member("skillDealer"), member("skillDealer")],
  },
  {
    expected: "brawl",
    members: [member("warrior"), member("warrior"), member("support")],
  },
  {
    expected: "flexible",
    members: [member("warrior"), member("skillDealer"), member("rangedCarry")],
  },
];

describe("classifyCompositionPattern", () => {
  it.each(patternCases)("$expected 패턴을 분류", ({ expected, members }) => {
    expect(classifyCompositionPattern(members)).toBe(expected);
  });

  it("모든 1차 역할 3인 조합에서 설명 가능한 패턴을 반환", () => {
    const roles: CompositionRoleKey[] = [
      "tank",
      "warrior",
      "assassin",
      "skillDealer",
      "rangedCarry",
      "support",
      "unknown",
    ];
    const validPatterns = new Set(patternCases.map(({ expected }) => expected));
    let checked = 0;

    for (const role1 of roles) {
      for (const role2 of roles) {
        for (const role3 of roles) {
          const pattern = classifyCompositionPattern([member(role1), member(role2), member(role3)]);
          expect(validPatterns.has(pattern)).toBe(true);
          checked += 1;
        }
      }
    }

    expect(checked).toBe(343);
  });
});

describe("buildTrioCompositionInsight", () => {
  it("실제 캐릭터+무기 역할을 3단 조합 설명으로 변환", () => {
    const insight = buildTrioCompositionInsight([
      { character: 20, weapon: 4 }, // 레녹스: 탱커
      { character: 41, weapon: 24 }, // 요한: 지원가
      { character: 31, weapon: 7 }, // 리오: 원거리 딜러
    ]);

    expect(insight.pattern).toBe("threeLayer");
    expect(insight.powerSpike).toBe("formationReady");
    expect(insight.favorableMatchup).toBe("singleDive");
    expect(insight.threatMatchup).toBe("splitPressure");
    expect(insight.members.map(({ primaryRole }) => primaryRole)).toEqual([
      "tank",
      "support",
      "rangedCarry",
    ]);
  });

  it("복수 역할을 보존하면서 첫 역할을 조합 분류 기준으로 사용", () => {
    const insight = buildTrioCompositionInsight([
      { character: 55, weapon: 14 }, // 에스텔: 탱커/전사
      { character: 52, weapon: 24 }, // 아디나: 스킬딜러/지원가
      { character: 31, weapon: 7 },
    ]);

    expect(insight.members[0]).toMatchObject({
      roles: ["tank", "warrior"],
      primaryRole: "tank",
      flexible: true,
    });
    expect(insight.members[1]).toMatchObject({
      roles: ["skillDealer", "support"],
      primaryRole: "skillDealer",
      flexible: true,
    });
    expect(insight.pattern).toBe("threeLayer");
  });

  it("미등록 코드도 빈 설명 대신 미분류·조건 대응형으로 안전하게 처리", () => {
    const insight = buildTrioCompositionInsight([
      { character: 9901, weapon: 9901 },
      { character: 9902, weapon: 9902 },
      { character: 9903, weapon: 9903 },
    ]);

    expect(insight.pattern).toBe("flexible");
    expect(insight.members.every(({ primaryRole }) => primaryRole === "unknown")).toBe(true);
    expect(insight.hasDirectMatchupEvidence).toBe(false);
    expect(insight.hasTimedPowerSpikeEvidence).toBe(false);
  });
});
