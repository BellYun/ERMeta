import { describe, expect, it } from "vitest";
import {
  adaptPlayerCompare,
  adaptPlayerMatches,
  type PlayerCompareResponse,
} from "@/lib/playerApiAdapter";

const compare: PlayerCompareResponse = {
  seasonId: 39,
  matchingMode: 3,
  summary: { requested: 3, ok: 1, failed: 2 },
  results: [
    {
      input: "A",
      status: "ok",
      nickname: "A",
      seasonId: 39,
      matchingMode: 3,
      source: "bser_official",
      fetchedAt: "2026-10-14T00:00:00.000Z",
      isStale: true,
      stats: {
        matchingTeamMode: 3,
        mmr: 2800,
        rank: 100,
        rankSize: 10000,
        totalGames: 10,
        totalWins: 3,
        winRate: 30,
        top3Rate: 0.4567,
        averageRank: 3.2,
        averageKills: 2.1,
        averageAssistants: 4.2,
        characterStats: [
          { characterCode: 2, totalGames: 3, wins: 1, top3Rate: 0.5, averageRank: 3 },
          { characterCode: 1, totalGames: 7, wins: 2, top3Rate: 0.6, averageRank: 2 },
        ],
      },
    },
    {
      input: "B",
      status: "no_stats",
      nickname: "B",
      source: "bser_official",
      stats: null,
      fetchedAt: null,
      isStale: false,
    },
    { input: "C", status: "error", code: "BSER_RATE_LIMITED" },
  ],
};

describe("새 플레이어 API 화면 어댑터", () => {
  it("공식 통계 비율과 캐시 상태를 화면 계약으로 옮긴다", () => {
    const payload = adaptPlayerCompare(compare);
    expect(payload.summary).toEqual({ requested: 3, ok: 1, failed: 2 });
    expect(payload.results[0]).toMatchObject({
      input: "A",
      status: "ok",
      source: "bser_official",
      fetchedAt: "2026-10-14T00:00:00.000Z",
      isStale: true,
      winRate: 30,
      top3Rate: 45.67,
      topCharacters: [
        { characterCode: 1, totalGames: 7, top3Rate: 60 },
        { characterCode: 2, totalGames: 3, top3Rate: 50 },
      ],
    });
    expect(payload.results[1]).toMatchObject({
      input: "B",
      status: "no_stats",
      reason: "season_stats_not_found",
    });
    expect(payload.results[2]).toMatchObject({
      input: "C",
      status: "error",
      reason: "bser_api_unavailable",
    });
  });

  it("저장된 경기의 필드와 갱신 상태를 최근 전적 화면으로 옮긴다", () => {
    expect(
      adaptPlayerMatches("A", {
        nickname: "A",
        nextCursor: null,
        lastSyncedAt: "2026-10-14T00:00:00.000Z",
        isStale: true,
        matches: [
          {
            gameId: "9007199254740993",
            seasonId: 39,
            matchingMode: 3,
            matchingTeamMode: 3,
            startedAt: "2026-10-13T00:00:00.000Z",
            characterCode: 4,
            rank: 2,
            kills: 5,
            assists: 6,
          },
        ],
      })
    ).toMatchObject({
      status: "ok",
      lastSyncedAt: "2026-10-14T00:00:00.000Z",
      isStale: true,
      matches: [
        {
          gameId: "9007199254740993",
          characterNum: 4,
          gameRank: 2,
          playerKill: 5,
          playerAssistant: 6,
        },
      ],
    });
    expect(
      adaptPlayerMatches("A", {
        nickname: "A",
        nextCursor: null,
        lastSyncedAt: "2026-10-14T00:00:00.000Z",
        isStale: false,
        matches: [],
      }).status
    ).toBe("no_matches");
  });
});
