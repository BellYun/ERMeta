import { Injectable } from '@nestjs/common';
import { BSERPlayerData } from './bser-api.service';

const IN1000_DEFAULT_MMR = 8199;

export interface ParsedGame {
  gameId: number;
  patchVersion: string;
  players: ParsedPlayer[];
  teams: ParsedTeam[];
}

export interface ParsedPlayer {
  gameId: number;
  teamNumber: number;
  characterNum: number;
  bestWeapon: number;
  gameRank: number;
  playerKill: number;
  playerAssistant: number;
  equipment: number[];
  traitFirstCore: number | null;
  traitFirstSub: number[];
  traitSecondSub: number[];
  skillOrder: Record<string, number> | null;
  routeIdOfStart: number | null;
  placeOfStart: string | null;
  mmrBefore: number;
  mmrAfter: number;
  rankPoint: number;
  victory: number;
  duration: number;
  patchVersion: string;
  matchTier: string;
  startedAt: string;
  craftLegend: number;
  equipmentGrade: Record<string, number>;
}

export interface ParsedTeam {
  teamNumber: number;
  gameRank: number;
  members: { characterNum: number; bestWeapon: number; traitFirstCore: number | null }[];
}

@Injectable()
export class ParserService {
  private in1000Mmr = IN1000_DEFAULT_MMR;

  setIn1000Mmr(mmr: number) {
    this.in1000Mmr = mmr;
  }

  parseGame(gameId: number, players: BSERPlayerData[]): ParsedGame | null {
    if (!players || players.length === 0) return null;

    const first = players[0];
    const patchVersion = `${first.versionSeason}.${first.versionMajor}`;
    const mmrAvg = first.mmrAvg;
    const matchTier = this.mmrToTier(mmrAvg);

    const parsedPlayers: ParsedPlayer[] = players.map((p) => ({
      gameId: p.gameId,
      teamNumber: p.teamNumber,
      characterNum: p.characterNum,
      bestWeapon: p.bestWeapon,
      gameRank: p.gameRank,
      playerKill: p.playerKill,
      playerAssistant: p.playerAssistant,
      equipment: this.normalizeEquipment(p.equipment),
      traitFirstCore: p.traitFirstCore ?? null,
      traitFirstSub: p.traitFirstSub ?? [],
      traitSecondSub: p.traitSecondSub ?? [],
      skillOrder: p.skillOrderInfo ?? null,
      routeIdOfStart: p.routeIdOfStart ?? null,
      placeOfStart: p.placeOfStart ?? null,
      mmrBefore: p.mmrBefore,
      mmrAfter: p.mmrAfter,
      rankPoint: p.rankPoint,
      victory: p.victory,
      duration: p.duration,
      patchVersion,
      matchTier,
      startedAt: p.startDtm,
      craftLegend: p.craftLegend ?? 0,
      equipmentGrade: p.equipmentGrade ?? {},
    }));

    // 팀 그룹핑
    const teamMap = new Map<number, ParsedTeam>();
    for (const p of parsedPlayers) {
      const existing = teamMap.get(p.teamNumber);
      const member = {
        characterNum: p.characterNum,
        bestWeapon: p.bestWeapon,
        traitFirstCore: p.traitFirstCore,
      };
      if (existing) {
        existing.members.push(member);
      } else {
        teamMap.set(p.teamNumber, {
          teamNumber: p.teamNumber,
          gameRank: p.gameRank,
          members: [member],
        });
      }
    }

    return {
      gameId,
      patchVersion,
      players: parsedPlayers,
      teams: [...teamMap.values()],
    };
  }

  private mmrToTier(mmr: number): string {
    if (mmr >= this.in1000Mmr) return 'IN1000';
    if (mmr >= 6800) return 'MITHRIL';
    if (mmr >= 5600) return 'METEORITE';
    return 'DIAMOND';
  }

  private normalizeEquipment(equipment: Record<string, number> | number[] | null): number[] {
    if (!equipment) return [];
    if (Array.isArray(equipment)) return equipment;
    return [
      equipment['0'] ?? 0,
      equipment['1'] ?? 0,
      equipment['2'] ?? 0,
      equipment['3'] ?? 0,
      equipment['4'] ?? 0,
    ];
  }
}
