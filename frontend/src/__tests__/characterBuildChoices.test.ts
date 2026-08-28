import { describe, expect, it } from "vitest";
import {
  aggregateSkillOrderChoices,
  aggregateTacticalSkillChoices,
  getSkillSlotLabel,
  normalizeSkillGroupCode,
} from "@/lib/characterBuildChoices";

describe("aggregateSkillOrderChoices", () => {
  it("누적 티어의 동일 스킬 순서를 합산하고 표본순으로 정렬한다", () => {
    const result = aggregateSkillOrderChoices([
      {
        skill_order: [1090100, 1090200, 1090300],
        total_games: 30,
        total_wins: 6,
        total_rp: 150,
      },
      {
        skill_order: [1090100, 1090200, 1090300],
        total_games: 20,
        total_wins: 4,
        total_rp: 50,
      },
      {
        skill_order: [1090200, 1090100],
        total_games: 50,
        total_wins: 15,
        total_rp: -100,
      },
      {
        skill_order: [],
        total_games: 999,
        total_wins: 999,
        total_rp: 999,
      },
    ]);

    expect(result).toHaveLength(2);
    expect(result[0]).toMatchObject({
      skills: [1090100, 1090200, 1090300],
      totalGames: 50,
      pickRate: 50,
      winRate: 20,
      averageRP: 4,
    });
    expect(result[1]).toMatchObject({
      skills: [1090200, 1090100],
      totalGames: 50,
      pickRate: 50,
      winRate: 30,
      averageRP: -2,
    });
  });

  it("BSER 응답에 섞인 선택 무기 외의 무기 스킬을 제거한다", () => {
    const result = aggregateSkillOrderChoices([
      {
        best_weapon: 16,
        skill_order: [
          3015100, 3015100, 3015100, 3018010, 3018010, 3018010, 1001400, 1001200, 1001300, 1001200,
          1001100, 1001500, 1001200, 3016000, 1001200, 1001100, 1001200, 1001500, 3016000, 1001400,
          1001400,
        ],
        total_games: 112,
        total_wins: 20,
        total_rp: 8366.4,
      },
    ]);

    expect(result[0].skills).toEqual([
      1001400, 1001200, 1001300, 1001200, 1001100, 1001500, 1001200, 3016000, 1001200, 1001100,
      1001200, 1001500, 3016000, 1001400, 1001400,
    ]);
    expect(result[0].averageRP).toBeCloseTo(74.7);
  });

  it("실제 레벨업이 아닌 무기 스킬 내부 파생 코드를 제거한다", () => {
    const result = aggregateSkillOrderChoices([
      {
        best_weapon: 15,
        skill_order: [3015100, 3015100, 3015100, 1063400, 1063200, 1063300, 3015000],
        total_games: 1,
        total_wins: 0,
        total_rp: 0,
      },
    ]);

    expect(result[0].skills).toEqual([1063400, 1063200, 1063300, 3015000]);
  });
});

describe("aggregateTacticalSkillChoices", () => {
  it("전술 스킬별 누적 티어 통계를 합산한다", () => {
    const result = aggregateTacticalSkillChoices([
      {
        tactical_skill_group: 500091,
        total_games: 60,
        total_wins: 12,
        total_rank_sum: 180,
        total_rp: 300,
      },
      {
        tactical_skill_group: 500091,
        total_games: 40,
        total_wins: 8,
        total_rank_sum: 100,
        total_rp: 100,
      },
      {
        tactical_skill_group: 500061,
        total_games: 100,
        total_wins: 30,
        total_rank_sum: 250,
        total_rp: -200,
      },
    ]);

    expect(result).toHaveLength(2);
    expect(result[0]).toMatchObject({
      code: 500091,
      totalGames: 100,
      pickRate: 50,
      winRate: 20,
      averageRank: 2.8,
      averageRP: 4,
    });
    expect(result[1]).toMatchObject({
      code: 500061,
      totalGames: 100,
      pickRate: 50,
      winRate: 30,
      averageRank: 2.5,
      averageRP: -2,
    });
  });
});

describe("skill label helpers", () => {
  it.each([
    [1090100, "T"],
    [1090210, "Q"],
    [1090300, "W"],
    [1090400, "E"],
    [1090500, "R"],
    [3011000, "D"],
  ] as const)("루치아 스킬 %s를 %s 슬롯으로 표시한다", (skillCode, label) => {
    expect(getSkillSlotLabel(90, skillCode)).toBe(label);
  });

  it("파생 스킬 코드를 기본 그룹 코드로 정규화한다", () => {
    expect(normalizeSkillGroupCode(1090210)).toBe(1090200);
  });
});
