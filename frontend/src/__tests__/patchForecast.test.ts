import { describe, expect, it } from "vitest";
import { isPatchForecastActualReady } from "@/components/features/home/PatchForecastComparison";
import type { HomeMetaStats } from "@/lib/homeMetaShared";

const row: HomeMetaStats["rows"][number] = {
  characterNum: 9,
  bestWeapon: 9,
  totalGames: 100_000,
  totalWins: 10_000,
  totalRP: 1_000_000,
  totalTop3: 40_000,
  averageRank: 4,
  tier: "DIAMOND",
  patchVersion: "12.4",
};

describe("patch tier forecast observation gate", () => {
  it("12.4의 현재 통계가 공개 표본 기준을 넘으면 실제 티어를 표시한다", () => {
    const stats: HomeMetaStats = {
      patchVersion: "12.4",
      previousPatch: "12.3",
      collectedGames: 100_000,
      rows: [row],
    };

    expect(isPatchForecastActualReady("12.4", stats)).toBe(true);
  });

  it("12.4 현재 통계가 없거나 공개 표본 기준 전이면 예상 상태를 유지한다", () => {
    const stats: HomeMetaStats = {
      patchVersion: "12.4",
      previousPatch: "12.3",
      collectedGames: 6_249,
      rows: [row],
    };

    expect(isPatchForecastActualReady("12.4", stats)).toBe(false);
    expect(isPatchForecastActualReady("12.4", { ...stats, collectedGames: 6_250, rows: [] })).toBe(
      false
    );
  });

  it("이전 패치의 관측 비교는 유지한다", () => {
    const stats: HomeMetaStats = {
      patchVersion: "12.2",
      previousPatch: "12.1",
      rows: [{ ...row, patchVersion: "12.2" }],
    };

    expect(isPatchForecastActualReady("12.2", stats)).toBe(true);
  });
});
