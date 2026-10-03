import { describe, expect, it } from "vitest";
import {
  buildHomeMetaView,
  filterReadyStatsPatchVersions,
  getHomeMetaQualificationGames,
  HOME_META_COMPARISON_PATCH,
  HOME_META_FALLBACK_PATCH,
  HOME_META_MIN_COLLECTED_GAMES,
  HOME_META_TARGET_PATCH,
  type HomeMetaStats,
} from "@/lib/homeMetaShared";
import { buildHomePersonalizedPerformances } from "@/lib/homePersonalization";

const stats: HomeMetaStats = {
  patchVersion: "12.1",
  previousPatch: null,
  rows: [
    {
      characterNum: 1,
      bestWeapon: 16,
      totalGames: 10,
      totalWins: 1,
      totalRP: 100,
      totalTop3: 3,
      averageRank: 4,
      tier: "DIAMOND",
      patchVersion: "12.1",
    },
    {
      characterNum: 1,
      bestWeapon: 16,
      totalGames: 20,
      totalWins: 2,
      totalRP: 200,
      totalTop3: 6,
      averageRank: 4,
      tier: "METEORITE",
      patchVersion: "12.1",
    },
    {
      characterNum: 1,
      bestWeapon: 16,
      totalGames: 30,
      totalWins: 3,
      totalRP: 300,
      totalTop3: 9,
      averageRank: 4,
      tier: "MITHRIL",
      patchVersion: "12.1",
    },
  ],
};

describe("buildHomeMetaView cumulative tiers", () => {
  it.each([
    ["DIAMOND_PLUS", 60],
    ["METEORITE_PLUS", 50],
    ["MITHRIL_PLUS", 30],
  ])("%s 누적 범위를 적용한다", (tier, expectedGames) => {
    const view = buildHomeMetaView(stats, tier);
    expect(view.rankingData.rankings[0]?.totalGames).toBe(expectedGames);
  });

  it("12.4 누적 범위에서는 원본 티어와 무관하게 같은 기준 입장료를 뺀다", () => {
    const earnedStats: HomeMetaStats = {
      patchVersion: "12.4",
      previousPatch: "12.3",
      rows: stats.rows.map((row) => ({
        ...row,
        patchVersion: "12.4",
        totalRP: row.totalGames * 60,
      })),
    };

    expect(buildHomeMetaView(earnedStats, "DIAMOND_PLUS").rankingData.rankings[0].averageRP).toBe(
      15
    );
    expect(buildHomeMetaView(earnedStats, "METEORITE_PLUS").rankingData.rankings[0].averageRP).toBe(
      7
    );
    expect(buildHomeMetaView(earnedStats, "MITHRIL_PLUS").rankingData.rankings[0].averageRP).toBe(
      2
    );
    expect(buildHomeMetaView(earnedStats, "DIAMOND_PLUS").honeyPicks).toEqual([]);
  });
});

describe("latest stats patch sample gate", () => {
  const patches = ["12.5", "12.4", "12.3", "12.2"];

  it("12.5 통계 공개 전에는 12.4 순위와 비교 데이터를 사용한다", () => {
    expect(HOME_META_TARGET_PATCH).toBe("12.5");
    expect(HOME_META_FALLBACK_PATCH).toBe("12.4");
    expect(HOME_META_COMPARISON_PATCH).toBe("12.4");
  });

  it("원본 수집량에 8배 환산을 적용한다", () => {
    expect(getHomeMetaQualificationGames(6_249)).toBe(49_992);
    expect(getHomeMetaQualificationGames(6_250)).toBe(HOME_META_MIN_COLLECTED_GAMES);
  });

  it("12.5 표본이 없거나 기준 판수 전에는 12.4를 최신 통계 패치로 유지한다", () => {
    expect(filterReadyStatsPatchVersions(patches, 0)).toEqual(["12.4", "12.3", "12.2"]);
    expect(filterReadyStatsPatchVersions(patches, 6_249)).toEqual(["12.4", "12.3", "12.2"]);
  });

  it("환산 기준 판수를 채우면 12.5를 최신 통계 패치로 공개한다", () => {
    expect(filterReadyStatsPatchVersions(patches, 6_250)).toEqual(patches);
  });
});

describe("home personalization", () => {
  const personalizedStats: HomeMetaStats = {
    patchVersion: "12.2",
    previousPatch: "12.1",
    rows: [
      {
        characterNum: 1,
        bestWeapon: 16,
        totalGames: 60,
        totalWins: 12,
        totalRP: 1200,
        totalTop3: 24,
        averageRank: 3.5,
        tier: "DIAMOND",
        patchVersion: "12.2",
      },
      {
        characterNum: 1,
        bestWeapon: 16,
        totalGames: 30,
        totalWins: 3,
        totalRP: 300,
        totalTop3: 9,
        averageRank: 4.5,
        tier: "DIAMOND",
        patchVersion: "12.1",
      },
    ],
  };

  it("저장된 실험체·무기의 현재 성적과 이전 패치 변화량을 계산한다", () => {
    const [performance] = buildHomePersonalizedPerformances(personalizedStats, [
      { charCode: 1, weaponCode: 16 },
    ]);

    expect(performance).toMatchObject({
      charCode: 1,
      weaponCode: 16,
      currentTier: "B",
      previousTier: "B",
      averageRP: 20,
      averageRPDelta: 10,
      winRate: 20,
      winRateDelta: 10,
      currentGames: 60,
      previousGames: 30,
    });
  });

  it("현재 패치 표본이 없는 등록 항목은 집계 중 상태로 남긴다", () => {
    const [performance] = buildHomePersonalizedPerformances(personalizedStats, [
      { charCode: 999, weaponCode: 1 },
    ]);

    expect(performance).toMatchObject({
      currentTier: null,
      averageRP: null,
      averageRPDelta: null,
      winRate: null,
      winRateDelta: null,
      currentGames: 0,
    });
  });
});
