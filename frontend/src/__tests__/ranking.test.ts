import { describe, it, expect } from "vitest";
import { buildRankings } from "@/lib/ranking";

function makeRow(
  overrides: Partial<{
    characterNum: number;
    bestWeapon: number;
    totalGames: number;
    totalWins: number;
    totalRP: number;
    totalTop3: number;
    averageRank: number;
  }> = {}
) {
  return {
    characterNum: 1,
    bestWeapon: 1,
    totalGames: 100,
    totalWins: 15,
    totalRP: 500,
    totalTop3: 40,
    averageRank: 4,
    ...overrides,
  };
}

describe("buildRankings", () => {
  it("빈 배열이면 빈 배열 반환", () => {
    expect(buildRankings([])).toEqual([]);
  });

  it("pickRate 계산: 각 캐릭터의 게임 수 / 전체 게임 수 * 100", () => {
    const rows = [
      makeRow({ characterNum: 1, totalGames: 60 }),
      makeRow({ characterNum: 2, totalGames: 40 }),
    ];
    const rankings = buildRankings(rows);
    expect(rankings.find((r) => r.characterNum === 1)!.pickRate).toBe(60);
    expect(rankings.find((r) => r.characterNum === 2)!.pickRate).toBe(40);
  });

  it("winRate 계산: totalWins / totalGames * 100", () => {
    const rows = [makeRow({ totalGames: 200, totalWins: 50 })];
    const rankings = buildRankings(rows);
    expect(rankings[0].winRate).toBe(25);
  });

  it("averageRP 계산: totalRP / totalGames", () => {
    const rows = [makeRow({ totalGames: 100, totalRP: 1000 })];
    const rankings = buildRankings(rows);
    expect(rankings[0].averageRP).toBe(10);
  });

  it("top3Rate 계산: totalTop3 / totalGames * 100", () => {
    const rows = [makeRow({ totalGames: 100, totalTop3: 35 })];
    const rankings = buildRankings(rows);
    expect(rankings[0].top3Rate).toBe(35);
  });

  it("averageRP 내림차순 정렬 + rank 부여", () => {
    const rows = [
      makeRow({ characterNum: 1, totalRP: 300, totalGames: 100 }), // avgRP 3
      makeRow({ characterNum: 2, totalRP: 1000, totalGames: 100 }), // avgRP 10
      makeRow({ characterNum: 3, totalRP: 500, totalGames: 100 }), // avgRP 5
    ];
    const rankings = buildRankings(rows);
    expect(rankings[0].characterNum).toBe(2);
    expect(rankings[0].rank).toBe(1);
    expect(rankings[1].characterNum).toBe(3);
    expect(rankings[1].rank).toBe(2);
    expect(rankings[2].characterNum).toBe(1);
    expect(rankings[2].rank).toBe(3);
  });

  it("totalGames가 0이면 모든 비율 0", () => {
    const rows = [makeRow({ totalGames: 0, totalWins: 0, totalRP: 0, totalTop3: 0 })];
    const rankings = buildRankings(rows);
    expect(rankings[0].pickRate).toBe(0);
    expect(rankings[0].winRate).toBe(0);
    expect(rankings[0].averageRP).toBe(0);
    expect(rankings[0].top3Rate).toBe(0);
  });
});
