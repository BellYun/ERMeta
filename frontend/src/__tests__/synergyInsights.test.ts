import { describe, expect, it } from "vitest";
import {
  buildTrioInsightBenchmarks,
  getTrioOperationProfile,
  type TrioMetricCombo,
} from "@/lib/synergyInsights";

function makeCombo(overrides: Partial<TrioMetricCombo> = {}): TrioMetricCombo {
  return {
    character1: 1,
    weaponType1: 1,
    character2: 2,
    weaponType2: 2,
    character3: 3,
    weaponType3: 3,
    totalGames: 100,
    winRate: 12.5,
    averageRP: 0,
    averageRank: 4.5,
    ...overrides,
  };
}

const benchmarkRows = [
  { averageRP: -10, winRate: 5, averageRank: 5.5 },
  { averageRP: -5, winRate: 8, averageRank: 5 },
  { averageRP: 0, winRate: 10, averageRank: 4.8 },
  { averageRP: 2, winRate: 12.5, averageRank: 4.5 },
  { averageRP: 4, winRate: 14, averageRank: 4.2 },
  { averageRP: 6, winRate: 16, averageRank: 4 },
  { averageRP: 8, winRate: 18, averageRank: 3.8 },
  { averageRP: 10, winRate: 20, averageRank: 3.5 },
  { averageRP: 12, winRate: 22, averageRank: 3.2 },
  { averageRP: 15, winRate: 25, averageRank: 2.8 },
].map((stats, index) =>
  makeCombo({
    ...stats,
    character1: index + 1,
    totalGames: 100,
  })
);

const benchmarks = buildTrioInsightBenchmarks(benchmarkRows, 50);

describe("getTrioOperationProfile", () => {
  it("50판 이상 후보가 부족하면 10판 이상 후보군으로 백분위를 계산", () => {
    const lowSampleBenchmarks = buildTrioInsightBenchmarks(
      benchmarkRows.map((combo) => ({ ...combo, totalGames: 20 })),
      50
    );
    const profile = getTrioOperationProfile(
      makeCombo({ totalGames: 20, averageRP: 12, winRate: 22, averageRank: 3.2 }),
      lowSampleBenchmarks
    );

    expect(profile.rpPercentile).toBeGreaterThan(50);
    expect(profile.winRatePercentile).toBeGreaterThan(50);
    expect(profile.rankPercentile).toBeGreaterThan(50);
  });

  it("RP·승률·평균 순위가 모두 강하면 고점 우세형으로 분류", () => {
    const profile = getTrioOperationProfile(
      makeCombo({ averageRP: 12, winRate: 22, averageRank: 3.2 }),
      benchmarks
    );

    expect(profile.key).toBe("snowball");
  });

  it("승률이 강하고 RP가 양수이며 순위가 무너지지 않으면 승리 전환형으로 분류", () => {
    const profile = getTrioOperationProfile(
      makeCombo({ averageRP: 4, winRate: 22, averageRank: 4 }),
      benchmarks
    );

    expect(profile.key).toBe("tempo");
  });

  it("평균 순위가 승률보다 강하면 순방 우세형으로 분류", () => {
    const profile = getTrioOperationProfile(
      makeCombo({ averageRP: 4, winRate: 10, averageRank: 3.2 }),
      benchmarks
    );

    expect(profile.key).toBe("lateValue");
  });

  it("양수 RP와 안정적인 평균 순위를 함께 유지하면 순방 안정형으로 분류", () => {
    const profile = getTrioOperationProfile(
      makeCombo({ averageRP: 4, winRate: 13, averageRank: 3.8 }),
      benchmarks
    );

    expect(profile.key).toBe("stable");
  });

  it("승률 고점과 달리 평균 순위가 불안하면 후반 고점형으로 분류", () => {
    const profile = getTrioOperationProfile(
      makeCombo({ averageRP: 10, winRate: 20, averageRank: 5 }),
      benchmarks
    );

    expect(profile.key).toBe("volatile");
    expect(profile.risk).toBe("high");
  });

  it("RP만 강하고 평균 순위가 불안하면 등반 변동형으로 분류", () => {
    const profile = getTrioOperationProfile(
      makeCombo({ averageRP: 10, winRate: 10, averageRank: 5 }),
      benchmarks
    );

    expect(profile.key).toBe("climbVolatile");
    expect(profile.risk).toBe("high");
  });

  it("충분한 표본에서 세 지표가 모두 중립 이하이면 주의 필요로 분류", () => {
    const profile = getTrioOperationProfile(
      makeCombo({ totalGames: 120, averageRP: -5, winRate: 8, averageRank: 5 }),
      benchmarks
    );

    expect(profile.key).toBe("trap");
    expect(profile.confidence).toBe("high");
  });

  it("뚜렷한 우세 축이 없으면 균형형으로 분류", () => {
    const profile = getTrioOperationProfile(
      makeCombo({ averageRP: 1, winRate: 13, averageRank: 4.2 }),
      benchmarks
    );

    expect(profile.key).toBe("balanced");
  });

  it("30판 미만은 성향과 별개로 낮은 신뢰도와 높은 위험도를 부여", () => {
    const profile = getTrioOperationProfile(
      makeCombo({ totalGames: 20, averageRP: 12, winRate: 22, averageRank: 3.2 }),
      benchmarks
    );

    expect(profile.key).toBe("snowball");
    expect(profile.confidence).toBe("low");
    expect(profile.risk).toBe("high");
  });
});
