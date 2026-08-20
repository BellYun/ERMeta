import { describe, expect, it } from "vitest";
import {
  buildHomeMetaView,
  filterReadyStatsPatchVersions,
  getHomeMetaQualificationGames,
  HOME_META_MIN_COLLECTED_GAMES,
  type HomeMetaStats,
} from "@/lib/homeMetaShared";

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
});

describe("latest stats patch sample gate", () => {
  const patches = ["12.2", "12.1", "11.7"];

  it("원본 수집량에 8배 환산을 적용한다", () => {
    expect(getHomeMetaQualificationGames(6_249)).toBe(49_992);
    expect(getHomeMetaQualificationGames(6_250)).toBe(HOME_META_MIN_COLLECTED_GAMES);
  });

  it("환산 기준 판수 전에는 12.1을 최신 통계 패치로 유지한다", () => {
    expect(filterReadyStatsPatchVersions(patches, 6_249)).toEqual(["12.1", "11.7"]);
  });

  it("환산 기준 판수를 채우면 12.2를 최신 통계 패치로 공개한다", () => {
    expect(filterReadyStatsPatchVersions(patches, 6_250)).toEqual(patches);
  });
});
