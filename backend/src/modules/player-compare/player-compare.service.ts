import { BadRequestException, HttpException, Injectable, Logger } from '@nestjs/common';
import { PlayerSeasonStatsResponse, PlayerSeasonStatsService } from '../player-season-stats/player-season-stats.service';

type FailureCode = 'PLAYER_NOT_FOUND' | 'BSER_RATE_LIMITED' | 'BSER_UNAVAILABLE' | 'SERVICE_UNAVAILABLE' | 'INTERNAL_ERROR';

export type PlayerCompareResult =
  | ({ input: string; status: 'ok' | 'no_stats' } & PlayerSeasonStatsResponse)
  | { input: string; status: 'not_found' | 'error'; code: FailureCode; retryAfter?: number };

export interface PlayerCompareResponse {
  seasonId: number;
  matchingMode: number;
  results: PlayerCompareResult[];
  summary: { requested: number; ok: number; failed: number };
}

@Injectable()
export class PlayerCompareService {
  private readonly logger = new Logger(PlayerCompareService.name);

  constructor(private readonly seasonStats: PlayerSeasonStatsService) {}

  async compare(body: unknown): Promise<PlayerCompareResponse> {
    const { nicknames, seasonId, matchingMode } = parseRequest(body);
    const results = await Promise.all(nicknames.map((input) => this.compareOne(input, seasonId, matchingMode)));
    const ok = results.filter((result) => result.status === 'ok').length;
    return {
      seasonId,
      matchingMode,
      results,
      summary: { requested: nicknames.length, ok, failed: results.length - ok },
    };
  }

  private async compareOne(input: string, seasonId: number, matchingMode: number): Promise<PlayerCompareResult> {
    try {
      const result = await this.seasonStats.getStats(input, String(seasonId), String(matchingMode));
      return { input, status: result.stats === null ? 'no_stats' : 'ok', ...result };
    } catch (error) {
      if (error instanceof HttpException) {
        const code = errorCode(error);
        const response = error.getResponse();
        const retryAfter = typeof response === 'object' && response !== null && 'retryAfter' in response
          ? (response as { retryAfter: unknown }).retryAfter : undefined;
        return {
          input, status: code === 'PLAYER_NOT_FOUND' ? 'not_found' : 'error', code,
          ...(code === 'BSER_RATE_LIMITED' && typeof retryAfter === 'number' && retryAfter > 0 ? { retryAfter } : {}),
        };
      }
      this.logger.error(`Player comparison failed for ${input}`, error instanceof Error ? error.stack : String(error));
      return { input, status: 'error', code: 'INTERNAL_ERROR' };
    }
  }
}

function parseRequest(body: unknown): { nicknames: string[]; seasonId: number; matchingMode: number } {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    throw invalid('INVALID_NICKNAMES', '닉네임을 1~3개 입력해주세요.');
  }
  const request = body as Record<string, unknown>;
  if (!Array.isArray(request.nicknames) || request.nicknames.length < 1 || request.nicknames.length > 3) {
    throw invalid('INVALID_NICKNAMES', '닉네임을 1~3개 입력해주세요.');
  }
  const seen = new Set<string>();
  const nicknames: string[] = [];
  for (const value of request.nicknames) {
    if (typeof value !== 'string') throw invalid('INVALID_NICKNAME', '닉네임은 1~30자로 입력해주세요.');
    const nickname = value.trim();
    if (nickname.length < 1 || nickname.length > 30 || /[\u0000-\u001f\u007f]/.test(nickname)) {
      throw invalid('INVALID_NICKNAME', '닉네임은 1~30자로 입력해주세요.');
    }
    const key = nickname.toLocaleLowerCase('ko-KR');
    if (seen.has(key)) continue;
    seen.add(key);
    nicknames.push(nickname);
  }
  if (!Number.isInteger(request.seasonId) || (request.seasonId as number) < 1 || (request.seasonId as number) > 9999) {
    throw invalid('INVALID_SEASON_ID', 'seasonId는 1~9999 정수여야 합니다.');
  }
  if (request.matchingMode !== 2 && request.matchingMode !== 3) {
    throw invalid('INVALID_MATCHING_MODE', 'matchingMode는 2(일반) 또는 3(랭크)여야 합니다.');
  }
  return { nicknames, seasonId: request.seasonId as number, matchingMode: request.matchingMode };
}

function invalid(code: string, message: string): BadRequestException {
  return new BadRequestException({ code, message });
}

function errorCode(error: HttpException): FailureCode {
  const response = error.getResponse();
  const code = typeof response === 'object' && response !== null && 'code' in response
    ? (response as { code: unknown }).code
    : undefined;
  if (code === 'PLAYER_NOT_FOUND' || code === 'BSER_RATE_LIMITED' || code === 'BSER_UNAVAILABLE') return code;
  if (error.getStatus() === 503) return 'SERVICE_UNAVAILABLE';
  return 'INTERNAL_ERROR';
}
