import { describe, it, expect } from "vitest";
import { assignCharTier } from "@/components/features/character-analysis/utils";
import { computeMetaScores, assignTier } from "@/components/features/tier-ranking/utils";

describe("assignTier", () => {
  it("S 티어: score >= 1.0", () => {
    expect(assignTier(1.0)).toBe("S");
    expect(assignTier(2.5)).toBe("S");
  });

  it("A 티어: 0.3 <= score < 1.0", () => {
    expect(assignTier(0.3)).toBe("A");
    expect(assignTier(0.99)).toBe("A");
  });

  it("B 티어: -0.3 <= score < 0.3", () => {
    expect(assignTier(-0.3)).toBe("B");
    expect(assignTier(0)).toBe("B");
    expect(assignTier(0.29)).toBe("B");
  });

  it("C 티어: -1.0 <= score < -0.3", () => {
    expect(assignTier(-1.0)).toBe("C");
    expect(assignTier(-0.31)).toBe("C");
  });

  it("D 티어: score < -1.0", () => {
    expect(assignTier(-1.01)).toBe("D");
    expect(assignTier(-3.0)).toBe("D");
  });
});

describe("computeMetaScores", () => {
  it("빈 배열이면 빈 Map 반환", () => {
    expect(computeMetaScores([])).toEqual(new Map());
  });

  it("단일 캐릭터면 Z-score 0 (평균 = 본인)", () => {
    const rankings = [
      {
        rank: 1,
        characterNum: 1,
        bestWeapon: 1,
        totalGames: 100,
        pickRate: 5,
        winRate: 15,
        averageRP: 10,
        top3Rate: 40,
      },
    ];
    const scores = computeMetaScores(rankings);
    expect(scores.get(1 * 1000 + 1)).toBe(0);
  });

  it("높은 스탯이 높은 스코어", () => {
    const rankings = [
      {
        rank: 1,
        characterNum: 1,
        bestWeapon: 1,
        totalGames: 100,
        pickRate: 5,
        winRate: 20,
        averageRP: 15,
        top3Rate: 50,
      },
      {
        rank: 2,
        characterNum: 2,
        bestWeapon: 1,
        totalGames: 100,
        pickRate: 5,
        winRate: 10,
        averageRP: 5,
        top3Rate: 30,
      },
    ];
    const scores = computeMetaScores(rankings);
    const score1 = scores.get(1 * 1000 + 1)!;
    const score2 = scores.get(2 * 1000 + 1)!;
    expect(score1).toBeGreaterThan(score2);
  });

  it("가중치: averageRP 50%, top3Rate 30%, winRate 20%", () => {
    // 두 캐릭터 - 하나는 RP만 높고 하나는 winRate만 높음
    const rankings = [
      {
        rank: 1,
        characterNum: 1,
        bestWeapon: 1,
        totalGames: 100,
        pickRate: 5,
        winRate: 10,
        averageRP: 20,
        top3Rate: 35,
      },
      {
        rank: 2,
        characterNum: 2,
        bestWeapon: 1,
        totalGames: 100,
        pickRate: 5,
        winRate: 20,
        averageRP: 5,
        top3Rate: 35,
      },
    ];
    const scores = computeMetaScores(rankings);
    const rpHigh = scores.get(1 * 1000 + 1)!;
    const winHigh = scores.get(2 * 1000 + 1)!;
    // RP 가중치(50%)가 winRate 가중치(20%)보다 높으므로 RP가 높은 쪽이 스코어 높음
    expect(rpHigh).toBeGreaterThan(winHigh);
  });
});

describe("assignCharTier", () => {
  it("높은 승률 + 높은 RP → S 티어", () => {
    expect(
      assignCharTier({
        winRate: 25, // 기대치 12.5% 대비 매우 높음
        top3Rate: 60, // 기대치 37.5% 대비 높음
        averageRank: 2,
        averageRP: 30,
      })
    ).toBe("S");
  });

  it("평균적 스탯 → B 티어", () => {
    expect(
      assignCharTier({
        winRate: 12.5,
        top3Rate: 37.5,
        averageRank: 4.5,
        averageRP: 0,
      })
    ).toBe("B");
  });

  it("낮은 스탯 → D 티어", () => {
    expect(
      assignCharTier({
        winRate: 5,
        top3Rate: 20,
        averageRank: 7,
        averageRP: -20,
      })
    ).toBe("D");
  });

  it("top3Rate 없으면 averageRank로 대체", () => {
    const withTop3 = assignCharTier({
      winRate: 15,
      top3Rate: 45,
      averageRank: 3,
      averageRP: 10,
    });
    const withRank = assignCharTier({
      winRate: 15,
      averageRank: 3,
      averageRP: 10,
    });
    // top3Rate 45%와 averageRank 3의 Z-score는 비슷 (둘 다 평균보다 좋음)
    expect(["S", "A"]).toContain(withTop3);
    expect(["S", "A"]).toContain(withRank);
  });
});
