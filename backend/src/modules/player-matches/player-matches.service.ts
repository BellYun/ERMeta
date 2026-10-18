import { BadRequestException, HttpException, HttpStatus, Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BserApiService, BSERPlayerData, BSERUserMatchesResult } from '../collect/bser-api.service';
import { MatchCursor, MatchSnapshot, PlayerLookup, PlayerMatchesRepository, StoredMatch } from './player-matches.repository';

export interface PlayerMatchesResponse {
  nickname: string;
  matches: Array<Omit<StoredMatch, 'startedAt'> & { startedAt: string }>;
  nextCursor: string | null;
  lastSyncedAt: string;
  isStale: boolean;
}

export interface PlayerMatchesRefreshResult {
  nickname: string;
  lastSyncedAt: string;
}

export interface PlayerMatchStatsResponse {
  nickname: string;
  seasonId: number;
  matchingMode: number;
  source: 'stored_matches';
  sampleSize: number;
  period: { from: string; to: string } | null;
  stats: {
    totalGames: number;
    wins: number;
    top3: number;
    winRate: number;
    top3Rate: number;
    averageRank: number | null;
    averageKills: number | null;
    averageAssists: number | null;
  };
  lastSyncedAt: string;
  isStale: boolean;
}

class UpstreamFailure extends Error {
  constructor(readonly statusCode?: number) {
    super('BSER API unavailable');
  }
}

type SyncedPlayerLookup = PlayerLookup & { matchesSyncedAt: Date };

@Injectable()
export class PlayerMatchesService {
  private readonly inFlight = new Map<string, Promise<void>>();
  private readonly ttlMs: number;
  private readonly timeOffset: string;

  constructor(
    private readonly repository: PlayerMatchesRepository,
    private readonly bserApi: BserApiService,
    config: ConfigService,
  ) {
    const ttlSeconds = Number(config.get('PLAYER_MATCH_TTL_SECONDS') ?? 300);
    this.ttlMs = Number.isFinite(ttlSeconds) && ttlSeconds >= 0 ? ttlSeconds * 1000 : 300_000;
    this.timeOffset = config.get<string>('BSER_MATCH_TIME_OFFSET') || '+09:00';
    if (!/^(Z|[+-](?:0\d|1\d|2[0-3]):[0-5]\d)$/.test(this.timeOffset)) {
      throw new Error('BSER_MATCH_TIME_OFFSET must be Z or ±HH:MM');
    }
  }

  async getMatches(nicknameParam: string, limitParam?: string, cursorParam?: string): Promise<PlayerMatchesResponse> {
    const nickname = this.parseNickname(nicknameParam);
    const limit = this.parseLimit(limitParam);
    const cursor = this.parseCursor(cursorParam);
    const { lookup, isStale } = await this.ensureFreshMatches(nickname);
    if (cursor && cursor.playerId !== lookup.id) {
      throw new BadRequestException({ code: 'INVALID_CURSOR', message: '다른 플레이어의 커서입니다.' });
    }
    const page = await this.repository.listMatches(lookup.id, limit, cursor);
    const last = page.matches.at(-1);
    return {
      nickname: lookup.nickname,
      matches: page.matches.map((match) => ({ ...match, startedAt: match.startedAt.toISOString() })),
      nextCursor: page.hasMore && last ? this.encodeCursor(lookup.id, last) : null,
      lastSyncedAt: lookup.matchesSyncedAt.toISOString(),
      isStale,
    };
  }

  async getMatchStats(nicknameParam: string, seasonParam?: string, modeParam?: string): Promise<PlayerMatchStatsResponse> {
    const nickname = this.parseNickname(nicknameParam);
    const seasonId = this.parseSeasonId(seasonParam);
    const matchingMode = this.parseMatchingMode(modeParam);
    const { lookup, isStale } = await this.ensureFreshMatches(nickname);
    const aggregate = await this.repository.aggregateMatches(lookup.id, seasonId, matchingMode);
    const { sampleSize, wins, top3 } = aggregate;
    const round = (value: number | null): number | null => value === null ? null : Math.round(value * 100) / 100;
    return {
      nickname: lookup.nickname,
      seasonId,
      matchingMode,
      source: 'stored_matches',
      sampleSize,
      period: aggregate.periodStart && aggregate.periodEnd
        ? { from: aggregate.periodStart.toISOString(), to: aggregate.periodEnd.toISOString() }
        : null,
      stats: {
        totalGames: sampleSize,
        wins,
        top3,
        winRate: sampleSize ? Math.round(wins / sampleSize * 10000) / 100 : 0,
        top3Rate: sampleSize ? Math.round(top3 / sampleSize * 10000) / 10000 : 0,
        averageRank: round(aggregate.averageRank),
        averageKills: round(aggregate.averageKills),
        averageAssists: round(aggregate.averageAssists),
      },
      lastSyncedAt: lookup.matchesSyncedAt.toISOString(),
      isStale,
    };
  }

  async refreshMatches(nicknameParam: string): Promise<PlayerMatchesRefreshResult> {
    const nickname = this.parseNickname(nicknameParam);
    const nicknameKey = nickname.toLocaleLowerCase('ko-KR');
    try {
      await this.refreshShared(nickname, nicknameKey);
    } catch (error) {
      if (error instanceof UpstreamFailure) throw this.upstreamException(error);
      throw error;
    }
    const lookup = await this.repository.findByNicknameKey(nicknameKey);
    if (!lookup?.matchesSyncedAt) {
      throw new HttpException({ code: 'MATCHES_NOT_READY', message: '전적을 아직 조회할 수 없습니다.' }, HttpStatus.BAD_GATEWAY);
    }
    return { nickname: lookup.nickname, lastSyncedAt: lookup.matchesSyncedAt.toISOString() };
  }

  private async ensureFreshMatches(nickname: string): Promise<{ lookup: SyncedPlayerLookup; isStale: boolean }> {
    const nicknameKey = nickname.toLocaleLowerCase('ko-KR');
    let lookup = await this.repository.findByNicknameKey(nicknameKey);
    let isStale = false;

    if (!lookup?.matchesSyncedAt || Date.now() - lookup.matchesSyncedAt.getTime() >= this.ttlMs) {
      try {
        await this.refreshShared(nickname, nicknameKey);
        lookup = await this.repository.findByNicknameKey(nicknameKey);
      } catch (error) {
        if (!(error instanceof UpstreamFailure)) throw error;
        if (!lookup?.matchesSyncedAt) {
          throw this.upstreamException(error);
        }
        isStale = true;
      }
    }

    if (!lookup?.matchesSyncedAt) {
      throw new HttpException({ code: 'MATCHES_NOT_READY', message: '전적을 아직 조회할 수 없습니다.' }, HttpStatus.BAD_GATEWAY);
    }
    return { lookup: { ...lookup, matchesSyncedAt: lookup.matchesSyncedAt }, isStale };
  }

  private upstreamException(error: UpstreamFailure): HttpException {
    const limited = error.statusCode === 429;
    return new HttpException({
      code: limited ? 'BSER_RATE_LIMITED' : 'BSER_UNAVAILABLE',
      message: limited ? '공식 API 요청 제한에 도달했습니다.' : '공식 API에서 전적을 가져오지 못했습니다.',
    }, limited ? HttpStatus.TOO_MANY_REQUESTS : HttpStatus.BAD_GATEWAY);
  }

  private async refreshShared(nickname: string, nicknameKey: string): Promise<void> {
    const existing = this.inFlight.get(nicknameKey);
    if (existing) return existing;
    const pending = this.refresh(nickname, nicknameKey);
    this.inFlight.set(nicknameKey, pending);
    try {
      await pending;
    } finally {
      this.inFlight.delete(nicknameKey);
    }
  }

  private async refresh(nickname: string, nicknameKey: string): Promise<void> {
    const userResult = await this.bserApi.findUserByNicknameDetailed(nickname);
    if (userResult.status === 'not_found') {
      throw new NotFoundException({ code: 'PLAYER_NOT_FOUND', message: '플레이어를 찾을 수 없습니다.' });
    }
    if (userResult.status !== 'found') {
      throw new UpstreamFailure(userResult.status === 'unavailable' ? userResult.statusCode : undefined);
    }

    const matchResult: BSERUserMatchesResult = await this.bserApi.fetchUserMatchesDetailed(userResult.user.userId);
    if (matchResult.status === 'unavailable' || matchResult.status === 'not_configured') {
      throw new UpstreamFailure(matchResult.status === 'unavailable' ? matchResult.statusCode : undefined);
    }
    // A resolved player with no user-games resource has an empty recent history.
    const rawGames = matchResult.status === 'found' ? matchResult.games : [];
    let games: MatchSnapshot[];
    try {
      const unique = new Map<number, MatchSnapshot>();
      for (const game of rawGames) {
        const parsed = this.parseGame(game);
        unique.set(parsed.gameId, parsed);
      }
      games = [...unique.values()]
        .sort((a, b) => b.startedAt.getTime() - a.startedAt.getTime() || b.gameId - a.gameId)
        .slice(0, 300);
    } catch {
      throw new UpstreamFailure();
    }
    await this.repository.saveSnapshot(
      userResult.user.nickname,
      nicknameKey,
      games,
      new Date(),
    );
  }

  private parseGame(game: BSERPlayerData): MatchSnapshot {
    const integer = (value: unknown, min: number): number => {
      if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < min) {
        throw new Error('Invalid game field');
      }
      return value;
    };
    if (typeof game.startDtm !== 'string') throw new Error('Invalid match time');
    const rawTime = game.startDtm.trim();
    const hasOffset = /(Z|[+-]\d{2}:?\d{2})$/i.test(rawTime);
    const normalizedTime = rawTime.replace(/([+-]\d{2})(\d{2})$/, '$1:$2');
    const withOffset = hasOffset ? normalizedTime : `${rawTime}${this.timeOffset}`;
    const startedAt = new Date(withOffset);
    if (!Number.isFinite(startedAt.getTime())) throw new Error('Invalid match time');
    return {
      gameId: integer(game.gameId, 1),
      seasonId: integer(game.seasonId, 0),
      matchingMode: integer(game.matchingMode, 0),
      matchingTeamMode: integer(game.matchingTeamMode, 0),
      startedAt,
      characterCode: integer(game.characterNum, 0),
      weaponCode: integer(game.bestWeapon, 0),
      rank: integer(game.gameRank, 1),
      kills: integer(game.playerKill, 0),
      assists: integer(game.playerAssistant, 0),
    };
  }

  private parseNickname(value: unknown): string {
    if (typeof value !== 'string') {
      throw new BadRequestException({ code: 'INVALID_NICKNAME', message: '닉네임을 입력해주세요.' });
    }
    const nickname = value.trim();
    if (nickname.length < 1 || nickname.length > 30 || /[\u0000-\u001f\u007f]/.test(nickname)) {
      throw new BadRequestException({ code: 'INVALID_NICKNAME', message: '닉네임은 1~30자로 입력해주세요.' });
    }
    return nickname;
  }

  private parseLimit(value?: string): number {
    if (value === undefined) return 20;
    if (typeof value !== 'string' || !/^[1-9]\d*$/.test(value)) {
      throw new BadRequestException({ code: 'INVALID_LIMIT', message: 'limit은 1~50의 정수여야 합니다.' });
    }
    const limit = Number(value);
    if (limit > 50) {
      throw new BadRequestException({ code: 'INVALID_LIMIT', message: 'limit은 1~50의 정수여야 합니다.' });
    }
    return limit;
  }

  private parseSeasonId(value?: string): number {
    if (typeof value !== 'string' || !/^[1-9]\d*$/.test(value)) {
      throw new BadRequestException({ code: 'INVALID_SEASON_ID', message: 'seasonId는 양의 정수여야 합니다.' });
    }
    const seasonId = Number(value);
    if (!Number.isSafeInteger(seasonId) || seasonId > 9999) {
      throw new BadRequestException({ code: 'INVALID_SEASON_ID', message: 'seasonId는 1~9999여야 합니다.' });
    }
    return seasonId;
  }

  private parseMatchingMode(value?: string): number {
    if (value !== '2' && value !== '3') {
      throw new BadRequestException({ code: 'INVALID_MATCHING_MODE', message: 'matchingMode는 2(일반) 또는 3(랭크)여야 합니다.' });
    }
    return Number(value);
  }

  private parseCursor(value?: string): (MatchCursor & { playerId: string }) | null {
    if (value === undefined) return null;
    if (typeof value !== 'string' || value.length > 256 || !/^[A-Za-z0-9_-]+$/.test(value)) {
      throw new BadRequestException({ code: 'INVALID_CURSOR', message: '커서 형식이 올바르지 않습니다.' });
    }
    try {
      const parsed = JSON.parse(Buffer.from(value, 'base64url').toString('utf8')) as Record<string, unknown>;
      if (typeof parsed.playerId !== 'string' || !/^\d+$/.test(parsed.playerId) ||
          typeof parsed.gameId !== 'string' || !/^\d+$/.test(parsed.gameId) ||
          typeof parsed.startedAt !== 'string' || !/^\d{4}-\d{2}-\d{2}T/.test(parsed.startedAt)) {
        throw new Error('Invalid cursor');
      }
      const startedAt = new Date(parsed.startedAt);
      if (!Number.isFinite(startedAt.getTime())) throw new Error('Invalid cursor');
      return { playerId: parsed.playerId, gameId: parsed.gameId, startedAt };
    } catch {
      throw new BadRequestException({ code: 'INVALID_CURSOR', message: '커서 형식이 올바르지 않습니다.' });
    }
  }

  private encodeCursor(playerId: string, match: StoredMatch): string {
    return Buffer.from(JSON.stringify({
      playerId,
      gameId: match.gameId,
      startedAt: match.startedAt.toISOString(),
    })).toString('base64url');
  }
}
