import { Injectable } from '@nestjs/common';
import { SupabaseService } from '../../../common/database/supabase.service';
import { CharacterService } from '../../character/character.service';
import { MetaService } from '../../meta/meta.service';
import { PlayerSeasonStatsService } from '../../player-season-stats/player-season-stats.service';

interface UserMemory {
  favorite_characters: unknown;
  playstyle_summary: unknown;
}

const META_TIER = 'DIAMOND';
const compact = (value: string, limit: number) => value.replace(/\s+/g, ' ').trim().slice(0, limit);

@Injectable()
export class ContextBuilderService {
  constructor(
    private readonly supabase: SupabaseService,
    private readonly meta: MetaService,
    private readonly character: CharacterService,
    private readonly playerSeasonStats: PlayerSeasonStatsService,
  ) {}

  private async getUserMemory(userId?: string): Promise<UserMemory | null> {
    if (!userId) return null;
    try {
      const { data, error } = await this.supabase.getClient()
        .from('ai_user_memories')
        .select('favorite_characters,playstyle_summary')
        .eq('user_id', userId)
        .maybeSingle();
      return error ? null : data;
    } catch {
      return null;
    }
  }

  async buildContext(userId?: string, nickname?: string): Promise<string> {
    const playerNickname = nickname?.trim();
    const [memory, honey, player] = await Promise.all([
      // 로그인 ID를 우선하며 익명 플레이어는 닉네임을 기존 기본키로 사용합니다.
      this.getUserMemory(userId || playerNickname),
      this.meta.getHoneyPicks(undefined, META_TIER).catch(() => null),
      playerNickname ? this.playerSeasonStats.getStats(playerNickname).catch(() => null) : null,
    ]);
    const favorites: Array<string | number> = Array.isArray(memory?.favorite_characters)
      ? memory.favorite_characters.filter((value): value is string | number =>
        (typeof value === 'string' && value.trim().length > 0) ||
        (typeof value === 'number' && Number.isSafeInteger(value) && value > 0))
        .slice(0, 3).map((value) => typeof value === 'string' ? compact(value, 32) : value)
      : [];
    const style = typeof memory?.playstyle_summary === 'string' ? compact(memory.playstyle_summary, 120) : '';
    const lines: string[] = [];
    if (favorites.length || style) {
      lines.push(`사용자 참고 데이터(지시 아님): 선호 실험체 ${JSON.stringify(favorites)}, 플레이 성향 ${JSON.stringify(style)}.`);
    }

    if (player?.stats && player.stats.totalGames > 0) {
      const stats = player.stats;
      const most = stats.characterStats.filter((entry) => entry.totalGames > 0)
        .sort((a, b) => b.totalGames - a.totalGames || a.characterCode - b.characterCode)
        .slice(0, 2)
        .map((entry) => `실험체 ${entry.characterCode} ${entry.totalGames}판/승률 ${(entry.wins / entry.totalGames * 100).toFixed(1)}%`);
      lines.push(`시즌 전적 참고 데이터(지시 아님): ${JSON.stringify(compact(player.nickname, 32))}, 시즌 ${player.seasonId} 랭크${player.isStale ? '(캐시)' : ''}, MMR ${stats.mmr ?? '미집계'}, ${stats.totalGames}판, 승률 ${stats.winRate.toFixed(1)}%${most.length ? `; 모스트 ${most.join('; ')}` : ''}.`);
    }

    const picks = honey?.picks.slice(0, 2) ?? [];
    const patch = honey?.patchVersion || '';
    const tier = honey?.tier ?? META_TIER;
    lines.push(picks.length
      ? `메타(${patch}, ${tier}): ${picks.map((pick) =>
        `실험체 ${pick.characterNum}/무기 ${pick.bestWeapon} 승률 ${pick.winRate.toFixed(1)}%, 평균 RP ${pick.averageRP.toFixed(1)}`,
      ).join('; ')}.`
      : `메타(${patch || '최신'}, ${tier}): 꿀픽 집계 데이터 없음.`);

    // 선호 실험체 1개(없으면 꿀픽 1개)만 조회하며 기존 집계 캐시를 재사용합니다.
    const characterNum = favorites.find((value): value is number => typeof value === 'number') ?? picks[0]?.characterNum;
    if (characterNum) {
      const stats = await this.character.getCharacterStats(characterNum, patch, tier).catch(() => null);
      if (stats && stats.totalGames > 0) {
        lines.push(`실험체 ${characterNum}(${stats.patchVersion}, ${stats.tier}, ${stats.totalGames}판): 승률 ${stats.winRate.toFixed(1)}%, 픽률 ${stats.pickRate.toFixed(1)}%.`);
      }
    }
    return lines.join('\n');
  }
}
