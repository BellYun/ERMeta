import { describe, expect, it } from "vitest";
import { mergeRecentMatches, type RecentMatchesResponse } from "@/lib/recentMatches";

const first: RecentMatchesResponse = {
  input: "테스터",
  nickname: "테스터",
  status: "ok",
  lastSyncedAt: "2026-10-18T00:00:00.000Z",
  isStale: false,
  nextCursor: "second",
  matches: [
    {
      gameId: "123",
      matchingMode: 3,
      matchingTeamMode: 3,
      seasonId: 41,
      characterNum: 1,
      gameRank: 2,
      playerKill: 5,
      playerAssistant: 6,
      startDtm: "2026-10-18T00:00:00.000Z",
    },
  ],
};

describe("전적 목록 페이지 결합", () => {
  it("겹친 경기 ID를 한 번만 표시하고 마지막 페이지에서 더 보기를 끝낸다", () => {
    const result = mergeRecentMatches(first, {
      ...first,
      matches: [
        { ...first.matches[0], gameId: 123 },
        { ...first.matches[0], gameId: "9007199254740994" },
      ],
      nextCursor: null,
      isStale: true,
      lastSyncedAt: "2026-10-19T00:00:00.000Z",
    });

    expect(result.matches.map((match) => String(match.gameId))).toEqual([
      "123",
      "9007199254740994",
    ]);
    expect(result.nextCursor).toBeNull();
    expect(result.isStale).toBe(true);
    expect(result.lastSyncedAt).toBe("2026-10-19T00:00:00.000Z");
  });
});
