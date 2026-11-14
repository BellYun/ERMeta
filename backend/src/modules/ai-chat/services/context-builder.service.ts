import { Injectable } from '@nestjs/common';
import { SupabaseService } from '../../../common/database/supabase.service';
import { CharacterService } from '../../character/character.service';
import { MetaService } from '../../meta/meta.service';

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

  async buildContext(userId?: string): Promise<string> {
    const [memory, honey] = await Promise.all([
      this.getUserMemory(userId),
      this.meta.getHoneyPicks(undefined, META_TIER).catch(() => null),
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
