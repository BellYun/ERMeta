interface OfficialCharacterStats {
  characterCode: number;
  totalGames: number;
  wins: number;
  top3Rate: number;
  averageRank: number;
}

interface OfficialSeasonStats {
  matchingTeamMode: number;
  mmr: number | null;
  rank: number | null;
  rankSize: number | null;
  totalGames: number;
  totalWins: number;
  winRate: number;
  top3Rate: number | null;
  averageRank: number;
  averageKills: number | null;
  averageAssistants: number | null;
  characterStats: OfficialCharacterStats[];
}

interface PlayerCompareResult {
  input: string;
  status: "ok" | "no_stats" | "not_found" | "error";
  nickname?: string;
  seasonId?: number;
  matchingMode?: number;
  source?: "bser_official";
  stats?: OfficialSeasonStats | null;
  fetchedAt?: string | null;
  isStale?: boolean;
  code?: string;
  retryAfter?: number;
}

export interface PlayerCompareResponse {
  seasonId: number;
  matchingMode: number;
  results: PlayerCompareResult[];
  summary: { requested: number; ok: number; failed: number };
}

interface StoredMatch {
  gameId: string;
  seasonId: number;
  matchingMode: number;
  matchingTeamMode: number;
  startedAt: string;
  characterCode: number;
  rank: number;
  kills: number;
  assists: number;
}

export interface PlayerMatchesResponse {
  nickname: string;
  matches: StoredMatch[];
  nextCursor: string | null;
  lastSyncedAt: string;
  isStale: boolean;
}

export function adaptPlayerCompare(payload: PlayerCompareResponse) {
  return {
    seasonId: payload.seasonId,
    matchingMode: payload.matchingMode,
    summary: payload.summary,
    results: payload.results.map((result) => {
      const common = {
        input: result.input,
        status: result.status,
        nickname: result.nickname,
        seasonId: result.seasonId,
        matchingMode: result.matchingMode,
        source: result.source,
        fetchedAt: result.fetchedAt,
        isStale: result.isStale,
        code: result.code,
        retryAfter: result.retryAfter,
      };
      if (result.status !== "ok" || !result.stats) {
        return {
          ...common,
          status: result.status === "ok" ? "error" : result.status,
          reason:
            result.status === "not_found"
              ? "nickname_not_found"
              : result.status === "no_stats"
                ? "season_stats_not_found"
                : result.code === "BSER_RATE_LIMITED" || result.code === "RATE_LIMITED"
                  ? "rate_limited"
                  : result.code === "BSER_UNAVAILABLE"
                    ? "bser_api_unavailable"
                    : "unknown_error",
        };
      }

      const stats = result.stats;
      return {
        ...common,
        matchingTeamMode: stats.matchingTeamMode,
        mmr: stats.mmr,
        rank: stats.rank,
        rankSize: stats.rankSize,
        totalGames: stats.totalGames,
        totalWins: stats.totalWins,
        winRate: stats.winRate,
        top3Rate: stats.top3Rate === null ? undefined : toPercent(stats.top3Rate),
        averageRank: stats.averageRank,
        averageKills: stats.averageKills ?? undefined,
        averageAssistants: stats.averageAssistants ?? undefined,
        topCharacters: [...stats.characterStats]
          .sort((a, b) => b.totalGames - a.totalGames)
          .slice(0, 5)
          .map((character) => ({
            characterCode: character.characterCode,
            totalGames: character.totalGames,
            wins: character.wins,
            winRate: character.totalGames
              ? Math.round((character.wins / character.totalGames) * 10000) / 100
              : 0,
            top3Rate: toPercent(character.top3Rate),
            averageRank: character.averageRank,
          })),
      };
    }),
  };
}

export function adaptPlayerMatches(input: string, payload: PlayerMatchesResponse) {
  return {
    input,
    status: payload.matches.length ? "ok" : "no_matches",
    nickname: payload.nickname,
    lastSyncedAt: payload.lastSyncedAt,
    isStale: payload.isStale,
    nextCursor: payload.nextCursor,
    matches: payload.matches.map((match) => ({
      gameId: match.gameId,
      seasonId: match.seasonId,
      matchingMode: match.matchingMode,
      matchingTeamMode: match.matchingTeamMode,
      startDtm: match.startedAt,
      characterNum: match.characterCode,
      gameRank: match.rank,
      playerKill: match.kills,
      playerAssistant: match.assists,
    })),
  };
}

function toPercent(fraction: number): number {
  return Math.round(fraction * 10000) / 100;
}
