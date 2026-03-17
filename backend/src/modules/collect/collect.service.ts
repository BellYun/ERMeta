import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { SupabaseService } from '../../common/database/supabase.service';
import { BserApiService } from './bser-api.service';
import { ParserService } from './parser.service';

const RATE_LIMIT_MS = 1000; // BSER API 1초 1회 제한
const BUDGET_MS = 60_000; // 수집 시간 예산 60초

@Injectable()
export class CollectService {
  private readonly logger = new Logger(CollectService.name);
  private isRunning = false;

  constructor(
    private readonly supabase: SupabaseService,
    private readonly bserApi: BserApiService,
    private readonly parser: ParserService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  @Cron(CronExpression.EVERY_5_MINUTES)
  async handleCron() {
    if (this.isRunning) {
      this.logger.warn('이전 수집 사이클 진행 중 — 스킵');
      return;
    }

    this.isRunning = true;
    try {
      await this.collectCycle();
    } catch (err) {
      this.logger.error(`수집 사이클 실패: ${(err as Error).message}`);
    } finally {
      this.isRunning = false;
    }
  }

  async collectCycle() {
    const startTime = Date.now();
    let collected = 0;

    // 마지막 수집 gameId 조회
    const nextGameId = await this.getNextGameId();
    if (nextGameId === null) {
      this.logger.warn('다음 gameId를 결정할 수 없음 — 스킵');
      return;
    }

    let currentId = nextGameId;

    // Forward: 신규 게임 수집
    while (Date.now() - startTime < BUDGET_MS) {
      const gameData = await this.bserApi.fetchGame(currentId);

      if (gameData && gameData.userGames?.length > 0) {
        const parsed = this.parser.parseGame(currentId, gameData.userGames);
        if (parsed) {
          await this.saveGameData(parsed);
          collected++;
        }
      }

      currentId++;
      await this.sleep(RATE_LIMIT_MS);
    }

    this.logger.log(`수집 완료: ${collected}건 (${Date.now() - startTime}ms)`);

    // 수집 완료 이벤트 발행 → 캐시 워밍 트리거
    if (collected > 0) {
      this.eventEmitter.emit('collection.completed', {
        collected,
        durationMs: Date.now() - startTime,
      });
    }
  }

  private async getNextGameId(): Promise<number | null> {
    const client = this.supabase.getClient();
    const { data } = await client
      .from('DataCollectionStatus')
      .select('lastGameId')
      .single();

    return data?.lastGameId ?? null;
  }

  private async saveGameData(parsed: ReturnType<ParserService['parseGame']>) {
    if (!parsed) return;

    const client = this.supabase.getClient();

    // process_game_v2 RPC 호출 (DB 측 집계)
    const { error } = await client.rpc('process_game_v2', {
      p_game_id: parsed.gameId,
      p_patch_version: parsed.patchVersion,
      p_players: parsed.players,
      p_teams: parsed.teams,
    });

    if (error) {
      this.logger.warn(`process_game_v2 실패 [${parsed.gameId}]: ${error.message}`);
    }

    // lastGameId 갱신
    await client
      .from('DataCollectionStatus')
      .upsert({ id: 1, lastGameId: parsed.gameId });
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
