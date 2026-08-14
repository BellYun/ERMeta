import { describe, expect, it } from "vitest";
import { buildHomeMetaView, type HomeMetaStats } from "@/lib/homeMetaShared";

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
