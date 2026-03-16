import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface BSERGameResponse {
  code: number;
  userGames: BSERPlayerData[];
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
}
