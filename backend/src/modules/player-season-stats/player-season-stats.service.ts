import { BadRequestException, HttpException, HttpStatus, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { setTimeout as delay } from 'node:timers/promises';
import { BserApiService, BSERUserSeasonStats } from '../collect/bser-api.service';
import {
  OfficialSeasonStats, PlayerSeasonStatsRepository, SeasonStatsRefreshLeaseLostError,
  SeasonStatsScope, StoredSeasonResult,
} from './player-season-stats.repository';

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

interface RefreshResult extends StoredSeasonResult {
  nickname: string;
  reused: boolean;
}

class UpstreamFailure extends Error {
  constructor(readonly statusCode?: number, readonly retryAfter?: number) {
    super('BSER API unavailable or returned invalid stats');
  }
}

class SeasonStatsRefreshBusyError extends HttpException {
  constructor() {
    super({
      code: 'RATE_LIMITED', reason: 'refresh_busy',
      message: '다른 요청에서 시즌 통계를 갱신 중입니다.', retryAfter: 1,
    }, HttpStatus.TOO_MANY_REQUESTS);
  }
}

@Injectable()
export class PlayerSeasonStatsService {
  private readonly logger = new Logger(PlayerSeasonStatsService.name);
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
    // 닉네임만 받는 AI 컨텍스트는 캐시만 읽고 BSER API 갱신을 유발하지 않습니다.
    if (seasonParam === undefined && modeParam === undefined) {
      const lookup = await this.repository.findByNicknameKey(nicknameKey);
      const snapshot = lookup ? await this.repository.findLatestRankedSnapshot(lookup.id) : null;
      if (!snapshot) {
        throw new NotFoundException({ code: 'PLAYER_STATS_NOT_FOUND', message: '저장된 랭크 전적이 없습니다.' });
      }
      return response(lookup!.nickname, snapshot.stats.seasonId, snapshot.stats.matchingMode, snapshot,
        Date.now() - snapshot.fetchedAt.getTime() >= this.ttlMs);
    }
    const seasonId = parseSeasonId(seasonParam);
    const matchingMode = parseMatchingMode(modeParam);
    const lookup = await this.repository.findByNicknameKey(nicknameKey);
    const snapshot = lookup ? await this.repository.findSnapshot(lookup.id, seasonId, matchingMode) : null;

    if (snapshot && Date.now() - snapshot.fetchedAt.getTime() < this.ttlMs) {
      return response(lookup!.nickname, seasonId, matchingMode, snapshot, false);
    }

    try {
      const refreshed = await this.refreshShared(nickname, { nicknameKey, seasonId, matchingMode }, snapshot);
      return response(refreshed.nickname, seasonId, matchingMode, refreshed, false);
    } catch (error) {
      if (!(error instanceof UpstreamFailure || error instanceof SeasonStatsRefreshBusyError)) throw error;
      if (snapshot?.stats) return response(lookup!.nickname, seasonId, matchingMode, snapshot, true);
      throw error instanceof UpstreamFailure ? this.upstreamException(error) : error;
    }
  }

  async refreshStats(nicknameParam: string, seasonParam?: string, modeParam?: string): Promise<PlayerSeasonStatsRefreshResult> {
    const nickname = parseNickname(nicknameParam);
    const nicknameKey = nickname.toLocaleLowerCase('ko-KR');
    const seasonId = parseSeasonId(seasonParam);
    const matchingMode = parseMatchingMode(modeParam);
    try {
      const refreshed = await this.refreshShared(nickname, { nicknameKey, seasonId, matchingMode });
      return {
        nickname: refreshed.nickname,
        status: refreshed.stats === null ? 'no_stats' : 'updated',
        fetchedAt: refreshed.stats ? refreshed.fetchedAt.toISOString() : null,
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
      ...(limited ? { retryAfter: error.retryAfter ?? 1 } : {}),
    }, limited ? HttpStatus.TOO_MANY_REQUESTS : HttpStatus.BAD_GATEWAY);
  }

  private async refreshShared(
    nickname: string,
    scope: SeasonStatsScope,
    previous?: StoredSeasonResult | null,
  ): Promise<RefreshResult> {
    const key = `${scope.nicknameKey}:${scope.seasonId}:${scope.matchingMode}`;
    let pending = this.inFlight.get(key);
    if (!pending) {
      pending = this.refreshWithLease(nickname, scope, previous).finally(() => this.inFlight.delete(key));
      this.inFlight.set(key, pending);
    }
    const result = await pending;
    if (previous === undefined && result.reused) throw new SeasonStatsRefreshBusyError();
    return result;
  }

  private async refreshWithLease(
    nickname: string,
    scope: SeasonStatsScope,
    previous?: StoredSeasonResult | null,
  ): Promise<RefreshResult> {
    const claim = await this.repository.claimRefresh(scope);
    if (claim.status === 'backoff') {
      throw new UpstreamFailure(claim.failure === 'rate_limited' ? 429 : 502, claim.retryAfter);
    }
    if (claim.status === 'busy') {
      if (previous !== undefined && !previous?.stats) {
        for (let attempt = 0; attempt < 3; attempt += 1) {
          await delay(200);
          const result = await this.readNewerSnapshot(scope, previous);
          if (result) return result;
        }
      }
      throw new SeasonStatsRefreshBusyError();
    }

    let finished = false;
    try {
      // A different instance may have committed a result before this claim succeeded.
      if (previous !== undefined) {
        const result = await this.readNewerSnapshot(scope, previous);
        if (result) return result;
      }
      const result = await this.refresh(nickname, scope, claim.token);
      finished = true;
      return result;
    } catch (error) {
      if (error instanceof SeasonStatsRefreshLeaseLostError) throw new SeasonStatsRefreshBusyError();
      if (error instanceof UpstreamFailure) {
        const limited = error.statusCode === 429;
        const retryAfter = await this.repository.recordRefreshFailure(
          scope, claim.token, limited ? 'rate_limited' : 'unavailable', error.retryAfter,
        ).catch(() => {
          this.logger.warn('시즌 통계 갱신 실패 대기 저장 실패');
          return null;
        });
        finished = retryAfter !== null;
        if (limited && retryAfter !== null) throw new UpstreamFailure(429, retryAfter);
      }
      throw error;
    } finally {
      if (!finished) {
        await this.repository.releaseRefresh(scope, claim.token).catch(() => {
          this.logger.warn('시즌 통계 갱신 실행권 해제 실패');
        });
      }
    }
  }

  private async readNewerSnapshot(scope: SeasonStatsScope, previous: StoredSeasonResult | null): Promise<RefreshResult | null> {
    const lookup = await this.repository.findByNicknameKey(scope.nicknameKey);
    if (!lookup) return null;
    const snapshot = await this.repository.findSnapshot(lookup.id, scope.seasonId, scope.matchingMode);
    if (!snapshot || (previous && snapshot.fetchedAt <= previous.fetchedAt)) return null;
    return { nickname: lookup.nickname, ...snapshot, reused: true };
  }

  private async refresh(nickname: string, scope: SeasonStatsScope, lease: string): Promise<RefreshResult> {
    const { nicknameKey, seasonId, matchingMode } = scope;
    const userResult = await this.bserApi.findUserByNicknameDetailed(nickname);
    if (userResult.status === 'not_found') {
      throw new NotFoundException({ code: 'PLAYER_NOT_FOUND', message: '플레이어를 찾을 수 없습니다.' });
    }
    if (userResult.status !== 'found') {
      throw new UpstreamFailure(
        userResult.status === 'unavailable' ? userResult.statusCode : undefined,
        userResult.status === 'unavailable' ? userResult.retryAfter : undefined,
      );
    }

    const statsResult = await this.bserApi.fetchUserStatsDetailed(userResult.user.userId, seasonId, matchingMode);
    if (statsResult.status === 'unavailable' || statsResult.status === 'not_configured') {
      throw new UpstreamFailure(
        statsResult.status === 'unavailable' ? statsResult.statusCode : undefined,
        statsResult.status === 'unavailable' ? statsResult.retryAfter : undefined,
      );
    }
    const stats = statsResult.status === 'found'
      ? normalizeStats(statsResult.stats, seasonId, matchingMode)
      : null;
    const fetchedAt = new Date();
    await this.repository.saveResult(
      userResult.user.nickname,
      nicknameKey,
      seasonId,
      matchingMode,
      stats,
      fetchedAt,
      lease,
    );
    return { nickname: userResult.user.nickname, stats, fetchedAt, reused: false };
  }
}

function response(
  nickname: string,
  seasonId: number,
  matchingMode: number,
  snapshot: StoredSeasonResult,
  isStale: boolean,
): PlayerSeasonStatsResponse {
  return {
    nickname, seasonId, matchingMode, source: 'bser_official',
    stats: snapshot.stats, fetchedAt: snapshot.stats ? snapshot.fetchedAt.toISOString() : null, isStale,
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
