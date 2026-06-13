import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface BSERGameResponse {
  code: number;
  userGames: BSERPlayerData[];
}

export interface BSERUserByNickname {
  nickname: string;
  userId: string;
}

export type BSERLookupResult =
  | { status: 'found'; user: BSERUserByNickname }
  | { status: 'not_found' }
  | { status: 'not_configured' }
  | { status: 'unavailable'; statusCode?: number; message?: string };

export interface BSERUserStatsResponse {
  code: number;
  message: string;
  userStats?: BSERUserSeasonStats[];
}

export interface BSERUserSeasonStats {
  seasonId: number;
  matchingMode: number;
  matchingTeamMode: number;
  mmr: number;
  rank: number;
  rankSize: number;
  totalGames: number;
  totalWins: number;
  totalTeamKills: number;
  totalDeaths: number;
  escapeCount: number;
  rankPercent: number;
  averageRank: number;
  averageKills: number;
  averageAssistants: number;
  averageHunts: number;
  top1: number;
  top2: number;
  top3: number;
  top5: number;
  top7: number;
  characterStats?: BSERUserCharacterStats[];
}

export type BSERUserStatsResult =
  | { status: 'found'; stats: BSERUserSeasonStats }
  | { status: 'not_found' }
  | { status: 'not_configured' }
  | { status: 'unavailable'; statusCode?: number; message?: string };

export interface BSERUserCharacterStats {
  characterCode: number;
  totalGames: number;
  usages: number;
  maxKillings: number;
  top3: number;
  wins: number;
  mostUsedSkinCode?: number;
  latestUsedSkinCode?: number;
  top3Rate: number;
  averageRank: number;
}

export interface BSERPlayerData {
  gameId: number;
  teamNumber: number;
  characterNum: number;
  bestWeapon: number;
  gameRank: number;
  playerKill: number;
  playerAssistant: number;
  characterLevel: number;
  equipment: Record<string, number>;
  equipmentGrade: Record<string, number>;
  traitFirstCore: number;
  traitFirstSub: number[];
  traitSecondSub: number[];
  skillOrderInfo: Record<string, number>;
  skillLevelInfo: Record<string, number>;
  routeIdOfStart: number;
  placeOfStart: string;
  mmrBefore: number;
  mmrAfter: number;
  mmrGain: number;
  rankPoint: number;
  victory: number;
  duration: number;
  totalGames: number;
  mmrAvg: number;
  craftLegend: number;
  versionSeason: number;
  versionMajor: number;
  startDtm: string;
}

@Injectable()
export class BserApiService {
  private readonly logger = new Logger(BserApiService.name);
  private readonly apiKey: string;
  private readonly baseUrl = 'https://open-api.bser.io';
  private readonly timeoutMs: number;
  private readonly maxRetries: number;

  constructor(private config: ConfigService) {
    this.apiKey = this.config.get<string>('BSER_API_KEY', '');
    this.timeoutMs = this.config.get<number>('BSER_API_TIMEOUT_MS', 4_000);
    this.maxRetries = this.config.get<number>('BSER_API_RETRIES', 1);
  }

  async fetchGame(gameId: number): Promise<BSERGameResponse | null> {
    if (!this.apiKey) {
      this.logger.warn('BSER_API_KEY 미설정 — 수집 스킵');
      return null;
    }

    try {
      const res = await fetch(`${this.baseUrl}/v1/games/${gameId}`, {
        headers: { 'x-api-key': this.apiKey },
      });

      if (res.status === 404) return null;
      if (!res.ok) {
        this.logger.warn(`BSER API ${res.status}: gameId=${gameId}`);
        return null;
      }

      return (await res.json()) as BSERGameResponse;
    } catch (err) {
      this.logger.error(`BSER API 호출 실패: ${(err as Error).message}`);
      return null;
    }
  }

  async fetchRankTop(
    seasonId: number,
    matchingTeamMode: number,
  ): Promise<number | null> {
    if (!this.apiKey) return null;

    try {
      const res = await fetch(
        `${this.baseUrl}/v1/rank/top/${seasonId}/${matchingTeamMode}`,
        { headers: { 'x-api-key': this.apiKey } },
      );
      if (!res.ok) return null;

      const json = (await res.json()) as { topRanks?: { mmr: number }[] };
      const ranks = json.topRanks ?? [];
      return ranks.length >= 1000 ? ranks[999].mmr : null;
    } catch {
      return null;
    }
  }

  async findUserByNickname(
    nickname: string,
  ): Promise<BSERUserByNickname | null> {
    const result = await this.findUserByNicknameDetailed(nickname);
    return result.status === 'found' ? result.user : null;
  }

  async findUserByNicknameDetailed(
    nickname: string,
  ): Promise<BSERLookupResult> {
    if (!this.apiKey) return { status: 'not_configured' };

    try {
      const url = new URL(`${this.baseUrl}/v1/user/nickname`);
      url.searchParams.set('query', nickname);
      const res = await this.fetchWithRetry(url, {
        headers: { 'x-api-key': this.apiKey },
      });

      if (res.status === 404) return { status: 'not_found' };
      if (!res.ok) {
        return {
          status: 'unavailable',
          statusCode: res.status,
          message: res.statusText,
        };
      }

      const json = (await res.json()) as {
        code?: number;
        user?: BSERUserByNickname;
      };

      if (json.code !== 200 || !json.user?.userId)
        return { status: 'not_found' };
      return { status: 'found', user: json.user };
    } catch (err) {
      this.logger.warn(`BSER nickname 조회 실패: ${(err as Error).message}`);
      return { status: 'unavailable', message: (err as Error).message };
    }
  }

  async fetchUserStats(
    userId: string,
    seasonId: number,
    matchingMode: number,
  ): Promise<BSERUserSeasonStats | null> {
    const result = await this.fetchUserStatsDetailed(
      userId,
      seasonId,
      matchingMode,
    );
    return result.status === 'found' ? result.stats : null;
  }

  async fetchUserStatsDetailed(
    userId: string,
    seasonId: number,
    matchingMode: number,
  ): Promise<BSERUserStatsResult> {
    if (!this.apiKey) return { status: 'not_configured' };

    try {
      const res = await this.fetchWithRetry(
        `${this.baseUrl}/v2/user/stats/uid/${encodeURIComponent(userId)}/${seasonId}/${matchingMode}`,
        { headers: { 'x-api-key': this.apiKey } },
      );

      if (res.status === 404) return { status: 'not_found' };
      if (!res.ok) {
        return {
          status: 'unavailable',
          statusCode: res.status,
          message: res.statusText,
        };
      }

      const json = (await res.json()) as BSERUserStatsResponse;
      if (json.code !== 200) return { status: 'not_found' };
      const stats = json.userStats?.[0];
      return stats ? { status: 'found', stats } : { status: 'not_found' };
    } catch (err) {
      this.logger.warn(`BSER user stats 조회 실패: ${(err as Error).message}`);
      return { status: 'unavailable', message: (err as Error).message };
    }
  }

  private async fetchWithTimeout(
    input: Parameters<typeof fetch>[0],
    init: Parameters<typeof fetch>[1],
  ): Promise<Response> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      return await fetch(input, { ...init, signal: controller.signal });
    } finally {
      clearTimeout(timeout);
    }
  }

  private async fetchWithRetry(
    input: Parameters<typeof fetch>[0],
    init: Parameters<typeof fetch>[1],
  ): Promise<Response> {
    let lastError: unknown;

    for (let attempt = 0; attempt <= this.maxRetries; attempt += 1) {
      try {
        const response = await this.fetchWithTimeout(input, init);
        if (attempt < this.maxRetries && isRetryableStatus(response.status)) {
          await sleep(150 * (attempt + 1));
          continue;
        }
        return response;
      } catch (err) {
        lastError = err;
        if (attempt >= this.maxRetries) break;
        await sleep(150 * (attempt + 1));
      }
    }

    throw lastError;
  }
}

function isRetryableStatus(status: number): boolean {
  return status === 429 || status >= 500;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
