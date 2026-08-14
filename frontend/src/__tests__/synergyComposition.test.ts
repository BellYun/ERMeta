import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import type { CompositionAffinityEvidence } from "@/lib/characterAffinityComposition";
import {
  buildTrioCompositionInsight,
  classifyCompositionPattern,
  type CompositionMemberProfile,
  type CompositionPatternKey,
  type CompositionRoleKey,
} from "@/lib/synergyComposition";

function member(
  primaryRole: CompositionRoleKey,
  roles: CompositionRoleKey[] = [primaryRole],
  traits: CompositionMemberProfile["traits"] = []
): CompositionMemberProfile {
  return {
    character: 1,
    weapon: 1,
    roles,
    traits,
    primaryRole,
    flexible: roles.length > 1,
    formation:
      primaryRole === "tank" || primaryRole === "warrior" || primaryRole === "assassin"
        ? "front"
        : "back",
    effectiveRange:
      primaryRole === "tank" || primaryRole === "warrior" || primaryRole === "assassin"
        ? "melee"
        : "long",
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
  it("new 유형을 우선 사용해 전투 역할과 교전 순서를 다시 배정", () => {
    const affinityEvidence = {
      key: "8:22|20:4|74:3",
      classifiedMembers: 3,
      matchedMembers: 0,
      prototype: null,
      members: [
        {
          characterCode: 74,
          weapon: 3,
          characterName: "다르코",
          weaponName: "방망이",
          classification: {
            role: "전사",
            groupName: "선봉 지속 압박형",
            subtype: "전열 유지 · 선봉 지속 압박형",
            firstOrderType: "전열 유지 · 선봉 지속 압박형",
          },
          trend: null,
        },
        {
          characterCode: 20,
          weapon: 4,
          characterName: "레녹스",
          weaponName: "채찍",
          classification: {
            role: "탱커",
            groupName: "전열 보호 · 장악 연계형",
            subtype: "선봉 보호형",
            firstOrderType: "선봉 보호",
          },
          trend: null,
        },
        {
          characterCode: 8,
          weapon: 22,
          characterName: "하트",
          weaponName: "기타",
          classification: {
            role: "원거리 딜러",
            groupName: "받아치기 유지형",
            subtype: "받아치기 유지형",
            firstOrderType: "받아치기 유지",
          },
          trend: null,
        },
      ],
    } satisfies CompositionAffinityEvidence;

    const insight = buildTrioCompositionInsight(
      [
        { character: 74, weapon: 3 },
        { character: 20, weapon: 4 },
        { character: 8, weapon: 22 },
      ],
      affinityEvidence
    );

    expect(insight.analysisBasis).toBe("affinityTypes");
    expect(insight.pattern).toBe("protectCarry");
    expect(insight.members.map(({ traits }) => traits)).toEqual([
      ["engage", "sustain"],
      ["peel", "protect", "zoneControl"],
      ["peel", "sustain"],
    ]);
    expect(insight.combatDoctrine.features).toMatchObject({
      damageDelivery: "sustained",
      accessMethod: "forcedEngage",
      frontlineStructure: "doubleFront",
    });
    expect(insight.combatSequence).toEqual([
      { character: 74, weapon: 3, task: "initiate" },
      { character: 8, weapon: 22, task: "primaryDamage" },
      { character: 20, weapon: 4, task: "protect" },
    ]);

    const evidenceBacked = buildTrioCompositionInsight(
      [
        { character: 74, weapon: 3 },
        { character: 20, weapon: 4 },
        { character: 8, weapon: 22 },
      ],
      { ...affinityEvidence, matchedMembers: 2 }
    );
    expect(evidenceBacked.analysisBasis).toBe("affinityEvidence");

    const prototypeBacked = buildTrioCompositionInsight(
      [
        { character: 74, weapon: 3 },
        { character: 20, weapon: 4 },
        { character: 8, weapon: 22 },
      ],
      {
        ...affinityEvidence,
        prototype: {
          match: "exact",
          key: "원거리 딜러:받아치기 유지|전사:전열 유지 · 선봉 지속 압박형|탱커:선봉 보호",
          roleComposition: "원거리 딜러 + 전사 + 탱커",
          members: [
            { role: "원거리 딜러", type: "받아치기 유지" },
            { role: "전사", type: "전열 유지 · 선봉 지속 압박형" },
            { role: "탱커", type: "선봉 보호" },
          ],
          memberMatches: [
            {
              characterCode: 74,
              weapon: 3,
              sourceType: "전열 유지 · 선봉 지속 압박형",
              role: "전사",
              type: "전열 유지 · 선봉 지속 압박형",
              similarity: 1,
            },
            {
              characterCode: 20,
              weapon: 4,
              sourceType: "선봉 보호",
              role: "탱커",
              type: "선봉 보호",
              similarity: 1,
            },
            {
              characterCode: 8,
              weapon: 22,
              sourceType: "받아치기 유지",
              role: "원거리 딜러",
              type: "받아치기 유지",
              similarity: 1,
            },
          ],
          similarity: 1,
          minimumSimilarity: 1,
          observations: 4,
          supportingProfiles: 4,
          reliableObservations: 3,
          reliableRate: 0.75,
          contextGames: 1_200,
          adjustedResidual: 1.4,
        },
      }
    );
    expect(prototypeBacked.analysisBasis).toBe("successfulPrototypeExact");
  });

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

  it("동일한 역할 구성에서도 캐릭터 전술 성향으로 진입 연계를 구분", () => {
    const insight = buildTrioCompositionInsight([
      { character: 1, weapon: 15 }, // 재키: 후속 돌진/지속 교전
      { character: 2, weapon: 9 }, // 아야: 포킹/순간 폭딜
      { character: 30, weapon: 13 }, // 일레븐: 강제 진입/밀어내기
    ]);

    expect(insight.pattern).toBe("diveFollow");
    expect(insight.members[0].traits).toEqual(["dive", "sustain"]);
    expect(insight.members[1].traits).toEqual(["poke", "burst"]);
    expect(insight.members[2].traits).toEqual(["engage", "peel"]);
    expect(insight.combatPlan).toBe("engageChain");
    expect(insight.combatSequence).toEqual([
      { character: 30, weapon: 13, task: "initiate" },
      { character: 1, weapon: 15, task: "followDive" },
      { character: 2, weapon: 9, task: "primaryDamage" },
    ]);
    expect(insight.combatDoctrine).toMatchObject({
      features: {
        damageDelivery: "distributed",
        accessMethod: "forcedEngage",
        carryDependency: "careRequired",
        frontlineStructure: "doubleFront",
        fightLength: "longCycle",
        targetRule: "controlledTarget",
      },
      winCondition: "preserveCarryUptime",
      opening: "controlThenCommit",
      target: "controlledTarget",
      frontline: "alternateAggro",
      damage: "sameTargetDistributed",
      switchRule: "regroupOnSeparation",
      failure: "simultaneousFrontCooldowns",
    });
    expect(insight.combatDoctrine.memberDuties).toEqual([
      {
        character: 30,
        weapon: 13,
        task: "initiate",
        secondaryTask: "frontline",
        action: "openControlledTarget",
        avoid: "doNotLeaveFollowupRange",
      },
      {
        character: 1,
        weapon: 15,
        task: "followDive",
        secondaryTask: "primaryDamage",
        action: "followInitiatorTarget",
        avoid: "doNotLeaveFollowupRange",
      },
      {
        character: 2,
        weapon: 9,
        task: "primaryDamage",
        secondaryTask: "poke",
        action: "damageControlledTarget",
        avoid: "doNotCrossFrontline",
      },
    ]);
  });

  it("포킹 조합은 실제 교전 전에 포킹 우위를 기다리는 구도로 분리", () => {
    const insight = buildTrioCompositionInsight([
      { character: 2, weapon: 11 }, // 아야 저격총: 포킹/폭딜
      { character: 6, weapon: 7 }, // 나딘 활: 포킹/지속 화력
      { character: 31, weapon: 7 }, // 리오: 포킹/지속 화력
    ]);

    expect(insight.combatPlan).toBe("pokeCatch");
    expect(insight.combatDoctrine).toMatchObject({
      features: {
        damageDelivery: "poke",
        accessMethod: "frontToBack",
        carryDependency: "noSingleCarry",
        frontlineStructure: "noFront",
        fightLength: "longCycle",
        targetRule: "nearestThreat",
      },
      winCondition: "pokeBeforeCommit",
      opening: "pokeThenCommit",
      target: "nearestThreat",
      frontline: "preserveRangedSpace",
      damage: "repeatPoke",
      switchRule: "reopenDistance",
      failure: "fightBeforePoke",
    });
  });

  it.each([9, 10, 11])(
    "아야(%s)+이바 조합은 사거리가 더 긴 이바가 선제 견제하고 아야가 주 화력을 담당",
    (ayaWeapon) => {
      const insight = buildTrioCompositionInsight([
        { character: 2, weapon: ayaWeapon }, // 아야: 안정적인 주 화력
        { character: 15, weapon: 5 }, // 시셀라: 포킹 이후 진입 억제
        { character: 36, weapon: 5 }, // 이바: 가장 긴 사거리의 선제 견제
      ]);

      expect(insight.combatPlan).toBe("pokeCatch");
      expect(insight.combatSequence).toEqual([
        { character: 36, weapon: 5, task: "poke" },
        { character: 15, weapon: 5, task: "suppress" },
        { character: 2, weapon: ayaWeapon, task: "primaryDamage" },
      ]);
      expect(insight.combatDoctrine.memberDuties).toMatchObject([
        { character: 36, weapon: 5, action: "repeatPoke" },
        { character: 15, weapon: 5, action: "suppressApproach" },
        { character: 2, weapon: ayaWeapon, action: "damageAfterPoke" },
      ]);
    }
  );

  it("아야+이바+헨리 3원딜에서 헨리는 마무리가 아니라 진입 억제를 담당", () => {
    const insight = buildTrioCompositionInsight([
      { character: 2, weapon: 10 }, // 아야: 주 화력
      { character: 36, weapon: 5 }, // 이바: 선제 견제
      { character: 83, weapon: 6 }, // 헨리: 공간 통제와 진입 억제
    ]);

    expect(insight.combatSequence).toEqual([
      { character: 36, weapon: 5, task: "poke" },
      { character: 83, weapon: 6, task: "suppress" },
      { character: 2, weapon: 10, task: "primaryDamage" },
    ]);
    expect(insight.combatDoctrine.memberDuties[1]).toEqual({
      character: 83,
      weapon: 6,
      task: "suppress",
      secondaryTask: "control",
      action: "suppressApproach",
      avoid: "doNotSpendSuppressionEarly",
    });
    const henry = insight.members.find(({ character }) => character === 83);
    expect(henry?.capabilities).toMatchObject({
      evidence: "officialSkillText",
      officialSkillCount: 5,
    });
    expect(henry?.capabilities.functions.suppress).toBeGreaterThan(
      henry?.capabilities.functions.finish ?? Number.POSITIVE_INFINITY
    );
  });

  it("단일 화력 조합의 헨리는 주 화력을 보존하면서 학습된 진입 억제를 보조 기능으로 표시", () => {
    const insight = buildTrioCompositionInsight([
      { character: 20, weapon: 4 }, // 레녹스: 제어 전열
      { character: 83, weapon: 6 }, // 헨리: 유일한 주 화력 + 지역 억제
      { character: 41, weapon: 24 }, // 요한: 보호
    ]);

    expect(insight.combatPlan).toBe("counterEngage");
    expect(insight.combatDoctrine.memberDuties).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ character: 41, task: "protect" }),
        expect.objectContaining({
          character: 83,
          task: "primaryDamage",
          secondaryTask: "suppress",
        }),
        expect.objectContaining({ character: 20, task: "control" }),
      ])
    );
  });

  it.each([
    { character: 26, weapon: 9 },
    { character: 67, weapon: 14 },
  ])("실제 아야 돌격 소총+이바 후보 조합에서도 사거리 담당을 유지", (third) => {
    const insight = buildTrioCompositionInsight([
      { character: 2, weapon: 10 },
      { character: 36, weapon: 5 },
      third,
    ]);

    expect(insight.combatSequence).toEqual(
      expect.arrayContaining([
        { character: 36, weapon: 5, task: "poke" },
        { character: 2, weapon: 10, task: "primaryDamage" },
      ])
    );
  });

  it("3근접 조합은 같은 공간과 타깃을 압축하는 교전법을 생성", () => {
    const insight = buildTrioCompositionInsight([
      { character: 1, weapon: 15 }, // 재키: 후속 돌진/지속 교전
      { character: 11, weapon: 16 }, // 유키: 진입/폭딜
      { character: 53, weapon: 14 }, // 마커스: 진입/지속 전열
    ]);

    expect(insight.combatDoctrine.features).toMatchObject({
      damageDelivery: "sustained",
      accessMethod: "forcedEngage",
      frontlineStructure: "tripleMelee",
      targetRule: "controlledTarget",
    });
    expect(insight.combatDoctrine).toMatchObject({
      winCondition: "compressMeleeSpace",
      frontline: "collapseSameZone",
      damage: "sustainNearest",
      switchRule: "regroupOnSeparation",
      failure: "splitMeleeTargets",
    });
  });

  it("같은 캐릭터도 무기별 전술 성향과 전열 위치를 구분", () => {
    const insight = buildTrioCompositionInsight([
      { character: 11, weapon: 16 }, // 유키 양손검: 진입/폭딜
      { character: 2, weapon: 10 }, // 아야 돌격 소총: 포킹/지속 딜
      { character: 53, weapon: 14 }, // 마커스 도끼: 진입/지속 전열
    ]);

    expect(insight.members[0]).toMatchObject({
      traits: ["engage", "burst"],
      formation: "front",
      effectiveRange: "melee",
    });
    expect(insight.members[1]).toMatchObject({
      traits: ["poke", "sustain"],
      formation: "back",
      effectiveRange: "long",
    });
    expect(insight.members[2]).toMatchObject({
      traits: ["engage", "sustain"],
      formation: "front",
      effectiveRange: "melee",
    });
    expect(insight.combatPlan).toBe("frontToBack");
    expect(insight.combatSequence).toHaveLength(3);
  });

  it("펜리르는 교전을 열고 원거리 딜러가 주 화력을 맡음", () => {
    const insight = buildTrioCompositionInsight([
      { character: 1, weapon: 15 }, // 재키: 후속 진입
      { character: 2, weapon: 9 }, // 아야: 원거리 주 화력
      { character: 86, weapon: 1 }, // 펜리르: 교전 개시
    ]);

    expect(insight.combatPlan).toBe("engageChain");
    expect(insight.combatSequence).toEqual([
      { character: 86, weapon: 1, task: "initiate" },
      { character: 1, weapon: 15, task: "followDive" },
      { character: 2, weapon: 9, task: "primaryDamage" },
    ]);
  });

  it("2근딜 조합에서 펜리르가 다른 진입형 전사보다 먼저 교전을 개시", () => {
    const insight = buildTrioCompositionInsight([
      { character: 2, weapon: 9 }, // 아야: 원거리 주 화력
      { character: 11, weapon: 16 }, // 유키: 근접 마무리
      { character: 86, weapon: 1 }, // 펜리르: 교전 개시
    ]);

    expect(insight.combatPlan).toBe("frontToBack");
    expect(insight.combatSequence).toEqual([
      { character: 86, weapon: 1, task: "initiate" },
      { character: 2, weapon: 9, task: "primaryDamage" },
      { character: 11, weapon: 16, task: "finish" },
    ]);
  });

  it("근접 암살자가 주 화력이면 원거리 마무리보다 먼저 교전에 합류", () => {
    const insight = buildTrioCompositionInsight([
      { character: 1, weapon: 15 }, // 재키: 첫 후속 진입
      { character: 2, weapon: 9 }, // 아야: 원거리 마무리
      { character: 37, weapon: 15 }, // 다니엘: 근접 주 화력
    ]);

    expect(insight.combatPlan).toBe("collapse");
    expect(insight.combatSequence).toEqual([
      { character: 1, weapon: 15, task: "followDive" },
      { character: 37, weapon: 15, task: "primaryDamage" },
      { character: 2, weapon: 9, task: "followupDamage" },
    ]);
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

  it("조합 DB의 모든 캐릭터·무기 3인 조합에 6개 특성과 7개 교전 원칙을 생성", () => {
    const matrixDirectory = join(process.cwd(), "public/data/synergy-matrix");
    const matrixMembers = readdirSync(matrixDirectory)
      .filter((fileName) => /^\d{3}\.json$/.test(fileName))
      .flatMap((fileName) => {
        const data = JSON.parse(readFileSync(join(matrixDirectory, fileName), "utf8")) as {
          characterCode: number;
          weapons: Array<{ weapon: number }>;
        };
        return data.weapons.map(({ weapon }) => ({ character: data.characterCode, weapon }));
      });
    const memberInputs = [
      ...matrixMembers,
      // 누적 시너지 매트릭스 생성 이후 추가된 현재 실험체·무기 조합
      { character: 88, weapon: 3 },
      { character: 89, weapon: 9 },
    ].filter(
      (member, index, all) =>
        all.findIndex(
          ({ character, weapon }) => character === member.character && weapon === member.weapon
        ) === index
    );

    const invalid: string[] = [];
    const validDoctrineFeatures = {
      damageDelivery: new Set(["poke", "burst", "sustained", "distributed"]),
      accessMethod: new Set(["forcedEngage", "dive", "counterEngage", "frontToBack"]),
      carryDependency: new Set(["careRequired", "infighting", "selfSufficient", "noSingleCarry"]),
      frontlineStructure: new Set(["soloFront", "doubleFront", "noFront", "tripleMelee"]),
      fightLength: new Set(["shortWindow", "longCycle"]),
      targetRule: new Set([
        "controlledTarget",
        "nearestThreat",
        "exposedBackline",
        "intrudingDiver",
      ]),
    };
    let checked = 0;

    for (let first = 0; first < memberInputs.length; first += 1) {
      for (let second = first + 1; second < memberInputs.length; second += 1) {
        for (let third = second + 1; third < memberInputs.length; third += 1) {
          const input = [memberInputs[first], memberInputs[second], memberInputs[third]] as const;
          if (new Set(input.map(({ character }) => character)).size !== 3) continue;

          const insight = buildTrioCompositionInsight(input);
          const uniqueSequenceMembers = new Set(
            insight.combatSequence.map(({ character, weapon }) => `${character}_${weapon}`)
          );
          const uniqueDutyMembers = new Set(
            insight.combatDoctrine.memberDuties.map(
              ({ character, weapon }) => `${character}_${weapon}`
            )
          );
          const { features } = insight.combatDoctrine;
          const validCapabilityVectors = insight.members.every(
            ({ character, capabilities }) =>
              capabilities.pressureRange > 0 &&
              Object.values(capabilities.functions).length === 10 &&
              Object.values(capabilities.functions).every(Number.isFinite) &&
              Object.values(capabilities.officialUtility).length === 10 &&
              Object.values(capabilities.officialUtility).every(Number.isFinite) &&
              (character >= 88
                ? capabilities.evidence === "editorialFallback"
                : capabilities.evidence === "officialSkillText" &&
                  capabilities.officialSkillCount > 0)
          );
          const doctrineRules = [
            insight.combatDoctrine.winCondition,
            insight.combatDoctrine.opening,
            insight.combatDoctrine.target,
            insight.combatDoctrine.frontline,
            insight.combatDoctrine.damage,
            insight.combatDoctrine.switchRule,
            insight.combatDoctrine.failure,
          ];
          if (
            insight.members.some(
              ({ primaryRole, traits }) => primaryRole === "unknown" || traits.length === 0
            ) ||
            insight.combatSequence.length !== 3 ||
            uniqueSequenceMembers.size !== 3 ||
            insight.combatDoctrine.memberDuties.length !== 3 ||
            uniqueDutyMembers.size !== 3 ||
            !validCapabilityVectors ||
            insight.combatDoctrine.memberDuties.some(
              ({ character, weapon, task, secondaryTask, action, avoid }) =>
                !action ||
                !avoid ||
                secondaryTask === task ||
                !input.some((member) => member.character === character && member.weapon === weapon)
            ) ||
            !validDoctrineFeatures.damageDelivery.has(features.damageDelivery) ||
            !validDoctrineFeatures.accessMethod.has(features.accessMethod) ||
            !validDoctrineFeatures.carryDependency.has(features.carryDependency) ||
            !validDoctrineFeatures.frontlineStructure.has(features.frontlineStructure) ||
            !validDoctrineFeatures.fightLength.has(features.fightLength) ||
            !validDoctrineFeatures.targetRule.has(features.targetRule) ||
            doctrineRules.length !== 7 ||
            doctrineRules.some((rule) => !rule)
          ) {
            invalid.push(input.map(({ character, weapon }) => `${character}_${weapon}`).join("+"));
          }
          checked += 1;
        }
      }
    }

    expect(memberInputs).toHaveLength(117);
    expect(checked).toBe(256_010);
    expect(invalid).toEqual([]);
  }, 10_000);
});
