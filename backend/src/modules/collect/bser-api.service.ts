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

  constructor(private config: ConfigService) {
    this.apiKey = this.config.get<string>('BSER_API_KEY', '');
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

  async fetchRankTop(seasonId: number, matchingTeamMode: number): Promise<number | null> {
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

  async findUserByNickname(nickname: string): Promise<BSERUserByNickname | null> {
    if (!this.apiKey) return null;

    try {
      const url = new URL(`${this.baseUrl}/v1/user/nickname`);
      url.searchParams.set('query', nickname);
      const res = await fetch(url, {
        headers: { 'x-api-key': this.apiKey },
      });

      if (!res.ok) return null;

      const json = (await res.json()) as {
        code?: number;
        user?: BSERUserByNickname;
      };

      if (json.code !== 200 || !json.user?.userId) return null;
      return json.user;
    } catch (err) {
      this.logger.warn(`BSER nickname 조회 실패: ${(err as Error).message}`);
      return null;
    }
  }

  async fetchUserStats(
    userId: string,
    seasonId: number,
    matchingMode: number,
  ): Promise<BSERUserSeasonStats | null> {
    if (!this.apiKey) return null;

    try {
      const res = await fetch(
        `${this.baseUrl}/v2/user/stats/uid/${encodeURIComponent(userId)}/${seasonId}/${matchingMode}`,
        { headers: { 'x-api-key': this.apiKey } },
      );

      if (!res.ok) return null;

      const json = (await res.json()) as BSERUserStatsResponse;
      if (json.code !== 200) return null;
      return json.userStats?.[0] ?? null;
    } catch (err) {
      this.logger.warn(`BSER user stats 조회 실패: ${(err as Error).message}`);
      return null;
    }
  }
}
