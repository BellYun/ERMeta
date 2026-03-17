import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { RedisService } from '../../common/redis/redis.service';
import { CharacterService } from '../character/character.service';
import { StatsService } from '../stats/stats.service';
import { MetaService } from '../meta/meta.service';
import { SupabaseService } from '../../common/database/supabase.service';

const TIERS = ['DIAMOND', 'METEORITE', 'MITHRIL', 'IN1000'] as const;
const SORT_OPTIONS = ['recommended', 'averageRP', 'winRate'] as const;

@Injectable()
export class CacheWarmingService {
  private readonly logger = new Logger(CacheWarmingService.name);

  constructor(
    private readonly redis: RedisService,
    private readonly characterService: CharacterService,
    private readonly statsService: StatsService,
    private readonly metaService: MetaService,
    private readonly supabase: SupabaseService,
  ) {}

  @OnEvent('collection.completed')
  async handleCollectionCompleted(payload: { collected: number; durationMs: number }) {
    this.logger.log(`캐시 워밍 시작 (수집 ${payload.collected}건)`);

    const startTime = Date.now();

    try {
      // 현재 활성 패치 조회
      const patchVersion = await this.getActivePatch();
      if (!patchVersion) {
        this.logger.warn('활성 패치 없음 — 워밍 스킵');
        return;
      }

      // 기존 캐시 무효화 (L1 + 관련 Redis 키)
      this.redis.clearLocal();

      // 병렬 워밍
      const tasks: Promise<void>[] = [];

      // Rankings + Honey Picks (4 tiers each = 8 tasks)
      for (const tier of TIERS) {
        tasks.push(this.warmSafely(`ranking:${patchVersion}:${tier}`, () =>
          this.characterService.fetchRankingData(patchVersion, tier),
        ));
        tasks.push(this.warmSafely(`honey:${patchVersion}:${tier}`, () =>
          this.metaService.getHoneyPicks(patchVersion, tier),
        ));
      }

      // Trios (3 sort options = 3 tasks)
      for (const sortBy of SORT_OPTIONS) {
        tasks.push(this.warmSafely(`trios:${sortBy}:100:all:all`, () =>
          this.statsService.getTrios(sortBy, 100, null, null),
        ));
      }

      await Promise.allSettled(tasks);

      this.logger.log(
        `캐시 워밍 완료: ${tasks.length}건 (${Date.now() - startTime}ms)`,
      );
    } catch (err) {
      this.logger.error(`캐시 워밍 실패: ${(err as Error).message}`);
    }
  }

  private async warmSafely(key: string, fn: () => Promise<unknown>): Promise<void> {
    try {
      await fn();
    } catch (err) {
      this.logger.warn(`워밍 실패 [${key}]: ${(err as Error).message}`);
    }
  }

  private async getActivePatch(): Promise<string | null> {
    const client = this.supabase.getClient();
    const { data } = await client
      .from('PatchVersion')
      .select('version')
      .eq('isActive', true)
      .order('startDate', { ascending: false })
      .limit(1)
      .single();

    return data?.version ?? null;
  }
}
