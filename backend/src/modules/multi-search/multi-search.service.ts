import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RedisService } from '../../common/redis/redis.service';
import { BserApiService, BSERUserByNickname, BSERUserSeasonStats } from '../collect/bser-api.service';

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

interface PlayerSearchResult {
  input: string;
  status: 'ok' | 'not_found' | 'no_stats' | 'error';
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
  reason?: string;
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
    this.defaultSeasonId = config.get<number>('MULTI_SEARCH_SEASON_ID', DEFAULT_SEASON_ID);
    this.defaultMatchingMode = config.get<number>('MULTI_SEARCH_MATCHING_MODE', DEFAULT_MATCHING_MODE);
  }

  async searchPlayers(nicknames: string[], seasonId?: number, matchingMode?: number) {
    const normalizedNicknames = this.normalizeNicknames(nicknames);
    const targetSeasonId = seasonId ?? this.defaultSeasonId;
    const targetMatchingMode = matchingMode ?? this.defaultMatchingMode;

    const results: PlayerSearchResult[] = [];
    for (const nickname of normalizedNicknames) {
      results.push(await this.searchPlayer(nickname, targetSeasonId, targetMatchingMode));
    }

    return {
      seasonId: targetSeasonId,
      matchingMode: targetMatchingMode,
      results,
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
      throw new BadRequestException(`닉네임은 최대 ${MAX_NICKNAMES}개까지 검색할 수 있습니다.`);
    }

    return normalized;
  }

  private async searchPlayer(
    nickname: string,
    seasonId: number,
    matchingMode: number,
  ): Promise<PlayerSearchResult> {
    try {
      const user = await this.findUser(nickname);
      if (!user) {
        return { input: nickname, status: 'not_found', reason: 'nickname_not_found' };
      }

      const stats = await this.fetchUserStats(user.userId, seasonId, matchingMode);
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
        reason: error instanceof Error ? error.message : 'unknown_error',
      };
    }
  }

  private async findUser(nickname: string) {
    const cacheKey = `bser:nickname:${this.cacheKeyPart(nickname)}`;
    const cached = await this.redis.getOrSet<LookupCache>(cacheKey, NICKNAME_CACHE_TTL_SEC, async () => {
      const user = await this.bserApi.findUserByNickname(nickname);
      return user ? { status: 'found', user } : { status: 'not_found' };
    });

    if (cached.status === 'not_found') {
      await this.redis.set(cacheKey, cached, NOT_FOUND_CACHE_TTL_SEC);
      return null;
    }

    return cached.user;
  }

  private async fetchUserStats(userId: string, seasonId: number, matchingMode: number) {
    const cacheKey = `bser:user-stats:${this.cacheKeyPart(userId)}:${seasonId}:${matchingMode}`;
    const cached = await this.redis.getOrSet<StatsCache>(cacheKey, USER_STATS_CACHE_TTL_SEC, async () => {
      const stats = await this.bserApi.fetchUserStats(userId, seasonId, matchingMode);
      return stats ? { status: 'found', stats } : { status: 'not_found' };
    });

    return cached.status === 'found' ? cached.stats : null;
  }

  private toPlayerSearchResult(
    input: string,
    user: BSERUserByNickname,
    stats: BSERUserSeasonStats,
  ): PlayerSearchResult {
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
