import { createHash } from 'node:crypto';
import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RedisService } from '../../common/redis/redis.service';
import {
  BserApiService,
  BSERLookupResult,
  BSERPlayerData,
  BSERUserByNickname,
  BSERUserMatchesResult,
  BSERUserSeasonStats,
  BSERUserStatsResult,
} from '../collect/bser-api.service';

const DEFAULT_SEASON_ID = 41;
const DEFAULT_MATCHING_MODE = 3;
const MAX_NICKNAMES = 3;
const NICKNAME_CACHE_TTL_SEC = 24 * 60 * 60;
const NOT_FOUND_CACHE_TTL_SEC = 5 * 60;
const USER_STATS_CACHE_TTL_SEC = 10 * 60;
const RECENT_MATCHES_CACHE_TTL_SEC = 2 * 60;

type LookupCache =
  | { status: 'found'; user: BSERUserByNickname }
  | { status: 'not_found' };

type StatsCache =
  | { status: 'found'; stats: BSERUserSeasonStats }
  | { status: 'not_found' };

type MatchesCache = { matches: RecentMatchSummary[]; next?: number };

export interface RecentMatchSummary {
  gameId: number;
  matchingMode: number;
  matchingTeamMode: number;
  seasonId: number;
  characterNum: number;
  gameRank: number;
  playerKill: number;
  playerAssistant: number;
  startDtm: string;
  summary?: {
    equipment: Record<string, number>;
    damageToPlayer?: number;
    mmrBefore?: number;
    mmrAfter?: number;
    mmrGain?: number;
    duration?: number;
    routeIdOfStart?: number;
  };
}

export interface RecentMatchesResponse {
  input: string;
  status: 'ok' | 'not_found' | 'no_matches' | 'error';
  nickname?: string;
  matches: RecentMatchSummary[];
  nextCursor: string | null;
  reason?: MultiSearchFailureReason;
}

export type MultiSearchPlayerStatus = 'ok' | 'not_found' | 'no_stats' | 'error';

export type MultiSearchFailureReason =
  | 'nickname_not_found'
  | 'season_stats_not_found'
  | 'bser_api_key_missing'
  | 'bser_api_unavailable'
  | 'unknown_error';

export interface MultiSearchPlayerResult {
  input: string;
  status: MultiSearchPlayerStatus;
  nickname?: string;
  seasonId?: number;
  matchingMode?: number;
  matchingTeamMode?: number;
  mmr?: number;
  rank?: number;
  rankSize?: number;
  totalGames?: number;
  totalWins?: number;
  winRate?: number;
  top3Rate?: number;
  averageRank?: number;
  averageKills?: number;
  averageAssistants?: number;
  topCharacters?: Array<{
    characterCode: number;
    totalGames: number;
    wins: number;
    winRate: number;
    top3: number;
    top3Rate: number;
    averageRank: number;
    maxKillings: number;
  }>;
  reason?: MultiSearchFailureReason;
}

export interface MultiSearchPlayersResponse {
  seasonId: number;
  matchingMode: number;
  results: MultiSearchPlayerResult[];
  summary: {
    requested: number;
    ok: number;
    failed: number;
  };
}

class MultiSearchUpstreamError extends Error {
  constructor(readonly reason: MultiSearchFailureReason) {
    super(reason);
  }
}

@Injectable()
export class MultiSearchService {
  private readonly defaultSeasonId: number;
  private readonly defaultMatchingMode: number;

  constructor(
    private readonly bserApi: BserApiService,
    private readonly redis: RedisService,
    config: ConfigService,
  ) {
    this.defaultSeasonId = config.get<number>(
      'MULTI_SEARCH_SEASON_ID',
      DEFAULT_SEASON_ID,
    );
    this.defaultMatchingMode = config.get<number>(
      'MULTI_SEARCH_MATCHING_MODE',
      DEFAULT_MATCHING_MODE,
    );
  }

  async searchPlayers(
    nicknames: string[],
    seasonId?: number,
    matchingMode?: number,
  ): Promise<MultiSearchPlayersResponse> {
    const normalizedNicknames = this.normalizeNicknames(nicknames);
    const targetSeasonId = seasonId ?? this.defaultSeasonId;
    const targetMatchingMode = matchingMode ?? this.defaultMatchingMode;

    const results: MultiSearchPlayerResult[] = [];
    for (const nickname of normalizedNicknames) {
      results.push(
        await this.searchPlayer(nickname, targetSeasonId, targetMatchingMode),
      );
    }
    const ok = results.filter((result) => result.status === 'ok').length;

    return {
      seasonId: targetSeasonId,
      matchingMode: targetMatchingMode,
      results,
      summary: {
        requested: normalizedNicknames.length,
        ok,
        failed: results.length - ok,
      },
    };
  }

  async searchRecentMatches(
    nickname: string,
    limit = 10,
    cursorParam?: string,
  ): Promise<RecentMatchesResponse> {
    const input = nickname.trim();
    const cursor = parseRecentMatchesCursor(cursorParam);

    try {
      const user = await this.findUser(input);
      if (!user) {
        return {
          input,
          status: 'not_found',
          matches: [],
          nextCursor: null,
          reason: 'nickname_not_found',
        };
      }

      const userKey = createHash('sha256').update(user.userId).digest('base64url');
      if (cursor && cursor.userKey !== userKey) {
        throw new BadRequestException({ code: 'INVALID_CURSOR', message: '다른 플레이어의 커서입니다.' });
      }

      const page = cursor?.page || undefined;
      const cacheKey = `bser:user-matches:v2:${userKey}:${page ?? 'first'}`;
      const cached = await this.redis.getOrSet<MatchesCache>(
        cacheKey,
        RECENT_MATCHES_CACHE_TTL_SEC,
        async () =>
          toMatchesCache(
            await this.bserApi.fetchUserMatchesDetailed(user.userId, page),
          ),
      );

      let start = 0;
      if (cursor?.after) {
        const previous = cached.matches.findIndex((match) => match.gameId === cursor.after);
        if (previous < 0) {
          throw new BadRequestException({ code: 'INVALID_CURSOR', message: '전적을 처음부터 다시 조회해 주세요.' });
        }
        start = previous + 1;
      }

      const end = start + limit;
      const matches = cached.matches.slice(start, end);
      const last = matches.at(-1);
      let nextCursor: string | null = null;
      if (last && end < cached.matches.length) {
        nextCursor = `${userKey}.${page ?? 0}.${last.gameId}`;
      } else if (cached.next !== undefined) {
        nextCursor = `${userKey}.${cached.next}.0`;
      }

      return {
        input,
        status: matches.length ? 'ok' : 'no_matches',
        nickname: user.nickname,
        matches,
        nextCursor,
      };
    } catch (error) {
      if (error instanceof BadRequestException) throw error;
      return {
        input,
        status: 'error',
        matches: [],
        nextCursor: null,
        reason:
          error instanceof MultiSearchUpstreamError
            ? error.reason
            : 'unknown_error',
      };
    }
  }

  private normalizeNicknames(nicknames: string[]) {
    const seen = new Set<string>();
    const normalized = nicknames
      .map((nickname) => nickname.trim())
      .filter(Boolean)
      .filter((nickname) => {
        const key = nickname.toLocaleLowerCase('ko-KR');
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });

    if (normalized.length === 0) {
      throw new BadRequestException('검색할 닉네임을 입력해주세요.');
    }
    if (normalized.length > MAX_NICKNAMES) {
      throw new BadRequestException(
        `닉네임은 최대 ${MAX_NICKNAMES}개까지 검색할 수 있습니다.`,
      );
    }

    return normalized;
  }

  private async searchPlayer(
    nickname: string,
    seasonId: number,
    matchingMode: number,
  ): Promise<MultiSearchPlayerResult> {
    try {
      const user = await this.findUser(nickname);
      if (!user) {
        return {
          input: nickname,
          status: 'not_found',
          reason: 'nickname_not_found',
        };
      }

      const stats = await this.fetchUserStats(
        user.userId,
        seasonId,
        matchingMode,
      );
      if (!stats) {
        return {
          input: nickname,
          status: 'no_stats',
          nickname: user.nickname,
          reason: 'season_stats_not_found',
        };
      }

      return this.toPlayerSearchResult(nickname, user, stats);
    } catch (error) {
      return {
        input: nickname,
        status: 'error',
        reason:
          error instanceof MultiSearchUpstreamError
            ? error.reason
            : 'unknown_error',
      };
    }
  }

  private async findUser(nickname: string) {
    const cacheKey = `bser:nickname:${this.cacheKeyPart(nickname)}`;
    const cached = await this.redis.get<LookupCache>(cacheKey);
    if (cached) {
      return cached.status === 'found' ? cached.user : null;
    }

    const result = await this.bserApi.findUserByNicknameDetailed(nickname);
    const cacheValue = toLookupCache(result);
    await this.redis.set(
      cacheKey,
      cacheValue,
      cacheValue.status === 'found'
        ? NICKNAME_CACHE_TTL_SEC
        : NOT_FOUND_CACHE_TTL_SEC,
    );

    return cacheValue.status === 'found' ? cacheValue.user : null;
  }

  private async fetchUserStats(
    userId: string,
    seasonId: number,
    matchingMode: number,
  ) {
    const cacheKey = `bser:user-stats:${this.cacheKeyPart(userId)}:${seasonId}:${matchingMode}`;
    const cached = await this.redis.getOrSet<StatsCache>(
      cacheKey,
      USER_STATS_CACHE_TTL_SEC,
      async () => {
        const result = await this.bserApi.fetchUserStatsDetailed(
          userId,
          seasonId,
          matchingMode,
        );
        return toStatsCache(result);
      },
    );

    return cached.status === 'found' ? cached.stats : null;
  }

  private toPlayerSearchResult(
    input: string,
    user: BSERUserByNickname,
    stats: BSERUserSeasonStats,
  ): MultiSearchPlayerResult {
    return {
      input,
      status: 'ok',
      nickname: user.nickname,
      seasonId: stats.seasonId,
      matchingMode: stats.matchingMode,
      matchingTeamMode: stats.matchingTeamMode,
      mmr: stats.mmr,
      rank: stats.rank,
      rankSize: stats.rankSize,
      totalGames: stats.totalGames,
      totalWins: stats.totalWins,
      winRate: toPercent(stats.totalWins, stats.totalGames),
      top3Rate: Math.round(stats.top3 * 10000) / 100,
      averageRank: stats.averageRank,
      averageKills: stats.averageKills,
      averageAssistants: stats.averageAssistants,
      topCharacters: [...(stats.characterStats ?? [])]
        .sort((a, b) => b.totalGames - a.totalGames)
        .slice(0, 5)
        .map((character) => ({
          characterCode: character.characterCode,
          totalGames: character.totalGames,
          wins: character.wins,
          winRate: toPercent(character.wins, character.totalGames),
          top3: character.top3,
          top3Rate: toPercent(character.top3, character.totalGames),
          averageRank: character.averageRank,
          maxKillings: character.maxKillings,
        })),
    };
  }

  private cacheKeyPart(value: string) {
    return encodeURIComponent(value.trim().toLocaleLowerCase('ko-KR'));
  }
}

function parseRecentMatchesCursor(value?: string) {
  if (value === undefined) return undefined;

  // The cursor carries the hashed UID, upstream page, and last returned game ID.
  const parts = /^([A-Za-z0-9_-]{43})\.(0|[1-9]\d{0,15})\.(0|[1-9]\d{0,15})$/.exec(value);
  if (parts) {
    const [, userKey, rawPage, rawAfter] = parts;
    const page = Number(rawPage);
    const after = Number(rawAfter);
    if ((page || after) && Number.isSafeInteger(page) && Number.isSafeInteger(after)) {
      return { userKey, page, after };
    }
  }
  throw new BadRequestException({ code: 'INVALID_CURSOR', message: '유효하지 않은 전적 커서입니다.' });
}

function toPercent(numerator: number, denominator: number) {
  if (!denominator) return 0;
  return Math.round((numerator / denominator) * 10000) / 100;
}

function toLookupCache(result: BSERLookupResult): LookupCache {
  if (result.status === 'found') return { status: 'found', user: result.user };
  if (result.status === 'not_found') return { status: 'not_found' };
  if (result.status === 'not_configured')
    throw new MultiSearchUpstreamError('bser_api_key_missing');
  throw new MultiSearchUpstreamError('bser_api_unavailable');
}

function toStatsCache(result: BSERUserStatsResult): StatsCache {
  if (result.status === 'found')
    return { status: 'found', stats: result.stats };
  if (result.status === 'not_found') return { status: 'not_found' };
  if (result.status === 'not_configured')
    throw new MultiSearchUpstreamError('bser_api_key_missing');
  throw new MultiSearchUpstreamError('bser_api_unavailable');
}

function toMatchesCache(result: BSERUserMatchesResult): MatchesCache {
  if (result.status === 'found') {
    const seen = new Set<number>();
    return {
      next: result.next,
      matches: result.games
        .filter(isRecentMatch)
        .sort((a, b) => Date.parse(b.startDtm) - Date.parse(a.startDtm) || b.gameId - a.gameId)
        .filter(({ gameId }) => {
          if (seen.has(gameId)) return false;
          seen.add(gameId);
          return true;
        })
        .map((match) => ({
          gameId: match.gameId,
          matchingMode: match.matchingMode,
          matchingTeamMode: match.matchingTeamMode,
          seasonId: match.seasonId,
          characterNum: match.characterNum,
          gameRank: match.gameRank,
          playerKill: match.playerKill,
          playerAssistant: match.playerAssistant,
          startDtm: new Date(match.startDtm).toISOString(),
          summary: {
            equipment: match.equipment ?? {},
            damageToPlayer: match.damageToPlayer,
            mmrBefore: match.mmrBefore,
            mmrAfter: match.mmrAfter,
            mmrGain: match.mmrGain,
            duration: match.duration,
            routeIdOfStart: match.routeIdOfStart,
          },
        })),
    };
  }
  if (result.status === 'not_found') return { matches: [] };
  if (result.status === 'not_configured')
    throw new MultiSearchUpstreamError('bser_api_key_missing');
  throw new MultiSearchUpstreamError('bser_api_unavailable');
}

function isRecentMatch(match: BSERPlayerData): match is BSERPlayerData {
  return (
    Number.isSafeInteger(match?.gameId) && match.gameId > 0 &&
    Number.isInteger(match.matchingMode) &&
    Number.isInteger(match.matchingTeamMode) &&
    Number.isInteger(match.seasonId) &&
    Number.isInteger(match.characterNum) &&
    Number.isInteger(match.gameRank) &&
    Number.isInteger(match.playerKill) &&
    Number.isInteger(match.playerAssistant) &&
    typeof match.startDtm === 'string' &&
    Number.isFinite(Date.parse(match.startDtm))
  );
}
