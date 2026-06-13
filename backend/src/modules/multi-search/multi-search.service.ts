import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RedisService } from '../../common/redis/redis.service';
import {
  BserApiService,
  BSERLookupResult,
  BSERUserByNickname,
  BSERUserSeasonStats,
  BSERUserStatsResult,
} from '../collect/bser-api.service';

const DEFAULT_SEASON_ID = 39;
const DEFAULT_MATCHING_MODE = 3;
const MAX_NICKNAMES = 3;
const NICKNAME_CACHE_TTL_SEC = 10 * 60;
const NOT_FOUND_CACHE_TTL_SEC = 5 * 60;
const USER_STATS_CACHE_TTL_SEC = 10 * 60;

type LookupCache =
  | { status: 'found'; user: BSERUserByNickname }
  | { status: 'not_found' };

type StatsCache =
  | { status: 'found'; stats: BSERUserSeasonStats }
  | { status: 'not_found' };

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
