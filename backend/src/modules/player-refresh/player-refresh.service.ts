import { BadRequestException, HttpException, HttpStatus, Injectable, Logger } from '@nestjs/common';
import { PlayerMatchesService } from '../player-matches/player-matches.service';
import { PlayerSeasonStatsService } from '../player-season-stats/player-season-stats.service';

type RefreshFailure = { status: 'failed'; code: string };
type MatchesRefresh = { status: 'updated'; lastSyncedAt: string } | RefreshFailure;
type SeasonStatsRefresh = { status: 'updated' | 'no_stats'; fetchedAt: string | null } | RefreshFailure;

export interface PlayerRefreshResponse {
  nickname: string;
  seasonId: number;
  matchingMode: number;
  refreshStatus: 'updated' | 'partial' | 'failed';
  matches: MatchesRefresh;
  seasonStats: SeasonStatsRefresh;
}

@Injectable()
export class PlayerRefreshService {
  private readonly logger = new Logger(PlayerRefreshService.name);

  constructor(
    private readonly matchesService: PlayerMatchesService,
    private readonly seasonStatsService: PlayerSeasonStatsService,
  ) {}

  async refresh(nicknameParam: unknown, body: unknown): Promise<PlayerRefreshResponse> {
    const { nickname, seasonId, matchingMode } = parseRequest(nicknameParam, body);
    const [matchesSettled, statsSettled] = await Promise.allSettled([
      this.matchesService.refreshMatches(nickname),
      this.seasonStatsService.refreshStats(nickname, String(seasonId), String(matchingMode)),
    ]);
    const matches: MatchesRefresh = matchesSettled.status === 'fulfilled'
      ? { status: 'updated', lastSyncedAt: matchesSettled.value.lastSyncedAt }
      : this.failure(matchesSettled.reason, nickname, 'matches');
    const seasonStats: SeasonStatsRefresh = statsSettled.status === 'fulfilled'
      ? { status: statsSettled.value.status, fetchedAt: statsSettled.value.fetchedAt }
      : this.failure(statsSettled.reason, nickname, 'seasonStats');
    const failed = Number(matches.status === 'failed') + Number(seasonStats.status === 'failed');
    const result: PlayerRefreshResponse = {
      nickname: matchesSettled.status === 'fulfilled' ? matchesSettled.value.nickname
        : statsSettled.status === 'fulfilled' ? statsSettled.value.nickname : nickname,
      seasonId,
      matchingMode,
      refreshStatus: failed === 0 ? 'updated' : failed === 2 ? 'failed' : 'partial',
      matches,
      seasonStats,
    };
    if (failed === 0) return result;

    const failures = [matchesSettled, statsSettled]
      .filter((settled): settled is PromiseRejectedResult => settled.status === 'rejected')
      .map((settled) => settled.reason);
    const status = failureHttpStatus(failures, failed === 2);
    throw new HttpException({
      code: failed === 2 ? 'PLAYER_REFRESH_FAILED' : 'PLAYER_REFRESH_PARTIAL',
      message: failed === 2 ? '전적과 시즌 통계를 갱신하지 못했습니다.' : '일부 데이터를 갱신하지 못했습니다.',
      ...result,
    }, status);
  }

  private failure(error: unknown, nickname: string, scope: string): RefreshFailure {
    if (!(error instanceof HttpException)) {
      this.logger.error(`Player ${scope} refresh failed for ${nickname}`, error instanceof Error ? error.stack : String(error));
      return { status: 'failed', code: 'INTERNAL_ERROR' };
    }
    const response = error.getResponse();
    const code = typeof response === 'object' && response !== null && 'code' in response
      ? (response as { code: unknown }).code : undefined;
    return { status: 'failed', code: typeof code === 'string' ? code : 'INTERNAL_ERROR' };
  }
}

function failureHttpStatus(errors: unknown[], allFailed: boolean): number {
  const statuses = errors.map((error) => error instanceof HttpException ? error.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR);
  if (allFailed && statuses.every((status) => status === HttpStatus.NOT_FOUND)) return HttpStatus.NOT_FOUND;
  if (statuses.includes(HttpStatus.TOO_MANY_REQUESTS)) return HttpStatus.TOO_MANY_REQUESTS;
  if (statuses.includes(HttpStatus.INTERNAL_SERVER_ERROR)) return HttpStatus.INTERNAL_SERVER_ERROR;
  if (statuses.includes(HttpStatus.SERVICE_UNAVAILABLE)) return HttpStatus.SERVICE_UNAVAILABLE;
  return HttpStatus.BAD_GATEWAY;
}

function parseRequest(nicknameParam: unknown, body: unknown): { nickname: string; seasonId: number; matchingMode: number } {
  if (typeof nicknameParam !== 'string') {
    throw new BadRequestException({ code: 'INVALID_NICKNAME', message: '닉네임을 입력해주세요.' });
  }
  const nickname = nicknameParam.trim();
  if (nickname.length < 1 || nickname.length > 30 || /[\u0000-\u001f\u007f]/.test(nickname)) {
    throw new BadRequestException({ code: 'INVALID_NICKNAME', message: '닉네임은 1~30자로 입력해주세요.' });
  }
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    throw new BadRequestException({ code: 'INVALID_REFRESH_REQUEST', message: '시즌과 모드를 입력해주세요.' });
  }
  const request = body as Record<string, unknown>;
  if (!Number.isInteger(request.seasonId) || (request.seasonId as number) < 1 || (request.seasonId as number) > 9999) {
    throw new BadRequestException({ code: 'INVALID_SEASON_ID', message: 'seasonId는 1~9999 정수여야 합니다.' });
  }
  if (request.matchingMode !== 2 && request.matchingMode !== 3) {
    throw new BadRequestException({ code: 'INVALID_MATCHING_MODE', message: 'matchingMode는 2(일반) 또는 3(랭크)여야 합니다.' });
  }
  return { nickname, seasonId: request.seasonId as number, matchingMode: request.matchingMode };
}
