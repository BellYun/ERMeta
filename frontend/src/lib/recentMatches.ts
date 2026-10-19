export interface RecentMatch {
  gameId: number | string;
  matchingMode: number;
  matchingTeamMode: number;
  seasonId: number;
  characterNum: number;
  gameRank: number;
  playerKill: number;
  playerAssistant: number;
  startDtm: string;
}

export interface RecentMatchesResponse {
  input: string;
  status: "ok" | "not_found" | "no_matches" | "error";
  nickname?: string;
  matches: RecentMatch[];
  nextCursor?: string | null;
  reason?:
    | "nickname_not_found"
    | "bser_api_key_missing"
    | "bser_api_unavailable"
    | "rate_limited"
    | "unknown_error";
  code?: string;
  retryAfter?: number;
  lastSyncedAt?: string;
  isStale?: boolean;
}

export function mergeRecentMatches(
  current: RecentMatchesResponse,
  page: RecentMatchesResponse
): RecentMatchesResponse {
  const seen = new Set(current.matches.map((match) => String(match.gameId)));
  const added = page.matches.filter((match) => {
    const id = String(match.gameId);
    if (seen.has(id)) return false;
    seen.add(id);
    return true;
  });

  return {
    ...current,
    status: current.matches.length + added.length ? "ok" : "no_matches",
    nickname: page.nickname ?? current.nickname,
    matches: [...current.matches, ...added],
    nextCursor: page.nextCursor ?? null,
    lastSyncedAt: page.lastSyncedAt ?? current.lastSyncedAt,
    isStale: Boolean(current.isStale || page.isStale),
  };
}
