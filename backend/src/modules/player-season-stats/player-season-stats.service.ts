import { BadRequestException, HttpException, HttpStatus, Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BserApiService, BSERUserSeasonStats } from '../collect/bser-api.service';
import { OfficialSeasonStats, PlayerSeasonStatsRepository, StoredSeasonStats } from './player-season-stats.repository';

export interface PlayerSeasonStatsResponse {
  nickname: string;
  seasonId: number;
  matchingMode: number;
  source: 'bser_official';
  stats: OfficialSeasonStats | null;
  fetchedAt: string | null;
  isStale: boolean;
}

export interface PlayerSeasonStatsRefreshResult {
  nickname: string;
  status: 'updated' | 'no_stats';
  fetchedAt: string | null;
}

interface RefreshResult {
  nickname: string;
  stats: OfficialSeasonStats | null;
  fetchedAt: Date | null;
}

class UpstreamFailure extends Error {
  constructor(readonly statusCode?: number) {
    super('BSER API unavailable or returned invalid stats');
  }
}

@Injectable()
export class PlayerSeasonStatsService {
  private readonly inFlight = new Map<string, Promise<RefreshResult>>();
  private readonly ttlMs: number;

  constructor(
    private readonly repository: PlayerSeasonStatsRepository,
    private readonly bserApi: BserApiService,
    config: ConfigService,
  ) {
    const ttlSeconds = Number(config.get('PLAYER_STATS_TTL_SECONDS') ?? 600);
    this.ttlMs = Number.isFinite(ttlSeconds) && ttlSeconds >= 0 ? ttlSeconds * 1000 : 600_000;
  }

  async getStats(nicknameParam: string, seasonParam?: string, modeParam?: string): Promise<PlayerSeasonStatsResponse> {
    const nickname = parseNickname(nicknameParam);
    const nicknameKey = nickname.toLocaleLowerCase('ko-KR');
    const seasonId = parseSeasonId(seasonParam);
    const matchingMode = parseMatchingMode(modeParam);
    const lookup = await this.repository.findByNicknameKey(nicknameKey);
    const snapshot = lookup ? await this.repository.findSnapshot(lookup.id, seasonId, matchingMode) : null;

    if (snapshot && Date.now() - snapshot.fetchedAt.getTime() < this.ttlMs) {
      return response(lookup!.nickname, seasonId, matchingMode, snapshot, false);
    }

    try {
      const refreshed = await this.refreshShared(nickname, nicknameKey, seasonId, matchingMode);
      return {
        nickname: refreshed.nickname,
        seasonId,
        matchingMode,
        source: 'bser_official',
        stats: refreshed.stats,
        fetchedAt: refreshed.fetchedAt?.toISOString() ?? null,
        isStale: false,
      };
    } catch (error) {
      if (!(error instanceof UpstreamFailure)) throw error;
      if (snapshot) return response(lookup!.nickname, seasonId, matchingMode, snapshot, true);
      throw this.upstreamException(error);
    }
  }

  async refreshStats(nicknameParam: string, seasonParam?: string, modeParam?: string): Promise<PlayerSeasonStatsRefreshResult> {
    const nickname = parseNickname(nicknameParam);
    const nicknameKey = nickname.toLocaleLowerCase('ko-KR');
    const seasonId = parseSeasonId(seasonParam);
    const matchingMode = parseMatchingMode(modeParam);
    try {
      const refreshed = await this.refreshShared(nickname, nicknameKey, seasonId, matchingMode);
      return {
        nickname: refreshed.nickname,
        status: refreshed.stats === null ? 'no_stats' : 'updated',
        fetchedAt: refreshed.fetchedAt?.toISOString() ?? null,
      };
    } catch (error) {
      if (error instanceof UpstreamFailure) throw this.upstreamException(error);
      throw error;
    }
  }

  private upstreamException(error: UpstreamFailure): HttpException {
    const limited = error.statusCode === 429;
    return new HttpException({
      code: limited ? 'BSER_RATE_LIMITED' : 'BSER_UNAVAILABLE',
      message: limited ? '공식 API 요청 제한에 도달했습니다.' : '공식 API에서 통계를 가져오지 못했습니다.',
    }, limited ? HttpStatus.TOO_MANY_REQUESTS : HttpStatus.BAD_GATEWAY);
  }

  private async refreshShared(
    nickname: string,
    nicknameKey: string,
    seasonId: number,
    matchingMode: number,
  ): Promise<RefreshResult> {
    const key = `${nicknameKey}:${seasonId}:${matchingMode}`;
    const existing = this.inFlight.get(key);
    if (existing) return existing;
    const pending = this.refresh(nickname, nicknameKey, seasonId, matchingMode);
    this.inFlight.set(key, pending);
    try {
      return await pending;
    } finally {
      this.inFlight.delete(key);
    }
  }

  private async refresh(
    nickname: string,
    nicknameKey: string,
    seasonId: number,
    matchingMode: number,
  ): Promise<RefreshResult> {
    const userResult = await this.bserApi.findUserByNicknameDetailed(nickname);
    if (userResult.status === 'not_found') {
      throw new NotFoundException({ code: 'PLAYER_NOT_FOUND', message: '플레이어를 찾을 수 없습니다.' });
    }
    if (userResult.status !== 'found') {
      throw new UpstreamFailure(userResult.status === 'unavailable' ? userResult.statusCode : undefined);
    }

    const statsResult = await this.bserApi.fetchUserStatsDetailed(userResult.user.userId, seasonId, matchingMode);
    if (statsResult.status === 'unavailable' || statsResult.status === 'not_configured') {
      throw new UpstreamFailure(statsResult.status === 'unavailable' ? statsResult.statusCode : undefined);
    }
    const stats = statsResult.status === 'found'
      ? normalizeStats(statsResult.stats, seasonId, matchingMode)
      : null;
    const fetchedAt = new Date();
    await this.repository.saveResult(
      userResult.user.nickname,
      nicknameKey,
      userResult.user.userId,
      seasonId,
      matchingMode,
      stats,
      fetchedAt,
    );
    return { nickname: userResult.user.nickname, stats, fetchedAt: stats ? fetchedAt : null };
  }
}

function response(
  nickname: string,
  seasonId: number,
  matchingMode: number,
  snapshot: StoredSeasonStats,
  isStale: boolean,
): PlayerSeasonStatsResponse {
  return {
    nickname, seasonId, matchingMode, source: 'bser_official',
    stats: snapshot.stats, fetchedAt: snapshot.fetchedAt.toISOString(), isStale,
  };
}

function parseNickname(value: unknown): string {
  if (typeof value !== 'string') {
    throw new BadRequestException({ code: 'INVALID_NICKNAME', message: '닉네임을 입력해주세요.' });
  }
  const nickname = value.trim();
  if (nickname.length < 1 || nickname.length > 30 || /[\u0000-\u001f\u007f]/.test(nickname)) {
    throw new BadRequestException({ code: 'INVALID_NICKNAME', message: '닉네임은 1~30자로 입력해주세요.' });
  }
  return nickname;
}

function parseSeasonId(value: unknown): number {
  if (typeof value !== 'string' || !/^[1-9]\d*$/.test(value)) {
    throw new BadRequestException({ code: 'INVALID_SEASON_ID', message: 'seasonId는 양의 정수여야 합니다.' });
  }
  const seasonId = Number(value);
  if (!Number.isSafeInteger(seasonId) || seasonId > 9999) {
    throw new BadRequestException({ code: 'INVALID_SEASON_ID', message: 'seasonId는 1~9999여야 합니다.' });
  }
  return seasonId;
}

function parseMatchingMode(value: unknown): number {
  if (value !== '2' && value !== '3') {
    throw new BadRequestException({ code: 'INVALID_MATCHING_MODE', message: 'matchingMode는 2(일반) 또는 3(랭크)여야 합니다.' });
  }
  return Number(value);
}

function normalizeStats(raw: BSERUserSeasonStats, seasonId: number, matchingMode: number): OfficialSeasonStats {
  const stats = raw as unknown as Record<string, unknown>;
  const actualSeason = requiredInteger(stats.seasonId, 1);
  const actualMode = requiredInteger(stats.matchingMode, 2);
  if (actualSeason !== seasonId || actualMode !== matchingMode) throw new UpstreamFailure();
  const totalGames = requiredInteger(stats.totalGames, 0);
  const totalWins = requiredInteger(stats.totalWins, 0);
  if (totalWins > totalGames) throw new UpstreamFailure();
  const rawCharacters = stats.characterStats;
  if (rawCharacters != null && !Array.isArray(rawCharacters)) throw new UpstreamFailure();
  return {
    seasonId,
    matchingMode,
    matchingTeamMode: requiredInteger(stats.matchingTeamMode, 1),
    totalGames,
    totalWins,
    winRate: totalGames === 0 ? 0 : Math.round(totalWins / totalGames * 10000) / 100,
    averageRank: requiredNumber(stats.averageRank, 0),
    mmr: optionalInteger(stats.mmr, 0),
    rank: optionalInteger(stats.rank, 0),
    rankSize: optionalInteger(stats.rankSize, 0),
    rankPercent: optionalNumber(stats.rankPercent, 0, 1),
    top3Rate: optionalNumber(stats.top3, 0, 1),
    averageKills: optionalNumber(stats.averageKills, 0),
    averageAssistants: optionalNumber(stats.averageAssistants, 0),
    characterStats: (rawCharacters ?? []).map((entry) => {
      if (!entry || typeof entry !== 'object') throw new UpstreamFailure();
      const character = entry as Record<string, unknown>;
      const games = requiredInteger(character.totalGames, 0);
      const wins = requiredInteger(character.wins, 0);
      if (wins > games) throw new UpstreamFailure();
      return {
        characterCode: requiredInteger(character.characterCode, 1),
        totalGames: games,
        wins,
        top3Rate: requiredNumber(character.top3Rate, 0, 1),
        averageRank: requiredNumber(character.averageRank, 0),
      };
    }),
  };
}

function requiredInteger(value: unknown, min: number): number {
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < min) throw new UpstreamFailure();
  return value;
}

function optionalInteger(value: unknown, min: number): number | null {
  return value == null ? null : requiredInteger(value, min);
}

function requiredNumber(value: unknown, min: number, max = Number.POSITIVE_INFINITY): number {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < min || value > max) throw new UpstreamFailure();
  return value;
}

function optionalNumber(value: unknown, min: number, max = Number.POSITIVE_INFINITY): number | null {
  return value == null ? null : requiredNumber(value, min, max);
}
