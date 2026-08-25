import { describe, it, expect } from "vitest";
import {
  computeMetaScores,
  assignTier,
  computeCharacterMetaTiers,
  computeMetaRankPositions,
  META_SCORE_WEIGHTS,
} from "@/components/features/tier-ranking/utils";
import { comparePerformanceTierStats, computeComboTierScore } from "@/lib/tierScoring";

describe("assignTier", () => {
  it("S 티어: score >= 0.8", () => {
    expect(assignTier(0.8)).toBe("S");
    expect(assignTier(2.5)).toBe("S");
  });

  it("A 티어: 0.3 <= score < 0.8", () => {
    expect(assignTier(0.3)).toBe("A");
    expect(assignTier(0.79)).toBe("A");
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

  it("가중치: averageRP 40%, top3Rate 20%, winRate 20%, pickRate 20%", () => {
    expect(META_SCORE_WEIGHTS).toEqual({
      averageRP: 0.4,
      top3Rate: 0.2,
      winRate: 0.2,
      pickRate: 0.2,
    });

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
    // RP 가중치(40%)가 winRate 가중치(20%)보다 높으므로 RP가 높은 쪽이 스코어 높음
    expect(rpHigh).toBeGreaterThan(winHigh);
  });

  it("성적이 같으면 픽률이 높은 무기군의 메타 스코어가 더 높음", () => {
    const rankings = [
      {
        rank: 1,
        characterNum: 1,
        bestWeapon: 1,
        totalGames: 20,
        pickRate: 1,
        winRate: 15,
        averageRP: 10,
        top3Rate: 40,
      },
      {
        rank: 2,
        characterNum: 2,
        bestWeapon: 1,
        totalGames: 200,
        pickRate: 10,
        winRate: 15,
        averageRP: 10,
        top3Rate: 40,
      },
    ];

    const scores = computeMetaScores(rankings);
    expect(scores.get(2 * 1000 + 1)).toBeGreaterThan(scores.get(1 * 1000 + 1)!);
  });
});

describe("computeCharacterMetaTiers", () => {
  it("메인 랭킹과 동일한 분포 점수로 캐릭터 무기 티어를 계산", () => {
    const rankings = [
      {
        rank: 1,
        characterNum: 40,
        bestWeapon: 6,
        totalGames: 300,
        pickRate: 12,
        winRate: 20,
        averageRP: 18,
        top3Rate: 50,
      },
      {
        rank: 2,
        characterNum: 1,
        bestWeapon: 1,
        totalGames: 200,
        pickRate: 8,
        winRate: 12.5,
        averageRP: 0,
        top3Rate: 37.5,
      },
      {
        rank: 3,
        characterNum: 2,
        bestWeapon: 2,
        totalGames: 100,
        pickRate: 4,
        winRate: 5,
        averageRP: -18,
        top3Rate: 25,
      },
    ];

    expect(computeCharacterMetaTiers(rankings, 40)).toEqual({ "6": "S" });
    expect(computeCharacterMetaTiers(rankings, 1)).toEqual({ "1": "B" });
    expect(computeCharacterMetaTiers(rankings, 999)).toEqual({});
  });
});

describe("computeMetaRankPositions", () => {
  it("동일한 메타 점수 기준으로 무기별 이전 순위를 계산", () => {
    const rankings = [
      {
        rank: 3,
        characterNum: 1,
        bestWeapon: 2,
        totalGames: 100,
        pickRate: 2,
        winRate: 8,
        averageRP: -10,
        top3Rate: 30,
      },
      {
        rank: 2,
        characterNum: 2,
        bestWeapon: 1,
        totalGames: 200,
        pickRate: 5,
        winRate: 12.5,
        averageRP: 0,
        top3Rate: 37.5,
      },
      {
        rank: 1,
        characterNum: 1,
        bestWeapon: 1,
        totalGames: 300,
        pickRate: 10,
        winRate: 18,
        averageRP: 15,
        top3Rate: 48,
      },
    ];

    const positions = computeMetaRankPositions(rankings);

    expect(positions.get(1 * 1000 + 1)).toBe(1);
    expect(positions.get(2 * 1000 + 1)).toBe(2);
    expect(positions.get(1 * 1000 + 2)).toBe(3);
  });

  it("필터 내부 순위를 1위부터 다시 계산", () => {
    const rankings = [
      {
        rank: 1,
        characterNum: 1,
        bestWeapon: 1,
        totalGames: 300,
        pickRate: 10,
        winRate: 18,
        averageRP: 15,
        top3Rate: 48,
      },
      {
        rank: 2,
        characterNum: 2,
        bestWeapon: 1,
        totalGames: 200,
        pickRate: 5,
        winRate: 12.5,
        averageRP: 0,
        top3Rate: 37.5,
      },
      {
        rank: 3,
        characterNum: 1,
        bestWeapon: 2,
        totalGames: 100,
        pickRate: 2,
        winRate: 8,
        averageRP: -10,
        top3Rate: 30,
      },
    ];

    const positions = computeMetaRankPositions(rankings, (ranking) => ranking.characterNum === 1);

    expect(positions.get(1 * 1000 + 1)).toBe(1);
    expect(positions.get(1 * 1000 + 2)).toBe(2);
    expect(positions.has(2 * 1000 + 1)).toBe(false);
  });
});

describe("comparePerformanceTierStats", () => {
  const strong = {
    winRate: 20,
    averageRank: 3,
    averageRP: 18,
    totalGames: 50,
  };
  const average = {
    winRate: 12.5,
    averageRank: 4.5,
    averageRP: 0,
    totalGames: 200,
  };

  it("게임 수보다 티어 원점수가 높은 조합을 먼저 배치", () => {
    expect(comparePerformanceTierStats(strong, average)).toBeLessThan(0);
    expect(comparePerformanceTierStats(average, strong)).toBeGreaterThan(0);
  });

  it("지표가 높아도 10판 미만 소표본은 뒤로 배치", () => {
    expect(comparePerformanceTierStats({ ...strong, totalGames: 9 }, average)).toBeGreaterThan(0);
  });
});

describe("computeComboTierScore", () => {
  it("조합 티어에서는 평균 RP에 가장 높은 가중치를 부여", () => {
    const rpOnly = computeComboTierScore({
      winRate: 12.5,
      averageRank: 4.5,
      averageRP: 15,
    });
    const winOnly = computeComboTierScore({
      winRate: 16,
      averageRank: 4.5,
      averageRP: 0,
    });

    expect(rpOnly).toBe(0.5);
    expect(winOnly).toBeCloseTo(0.2);
    expect(rpOnly).toBeGreaterThan(winOnly);
  });
});
