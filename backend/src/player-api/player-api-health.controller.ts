import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PlayerHistoryDatabaseService } from '../common/database/player-history-database.service';

@Controller('health')
export class PlayerApiHealthController {
  constructor(
    private readonly database: PlayerHistoryDatabaseService,
    private readonly config: ConfigService,
  ) {}

  @Get('live')
  live(): { status: 'ok' } {
    return { status: 'ok' };
  }

  @Get('ready')
  async ready(): Promise<{ status: 'ok' }> {
    if (!this.config.get<string>('BSER_API_KEY')) {
      throw new ServiceUnavailableException({
        code: 'BSER_API_KEY_NOT_CONFIGURED',
        message: '공식 API 키가 설정되지 않았습니다.',
      });
    }
    try {
      const result = await this.database.getPool().query<{
        lookups: string | null;
        matches: string | null;
        records: string | null;
        stats: string | null;
        match_details: boolean;
      }>(`SELECT
          to_regclass('player_history.player_lookups')::text AS lookups,
          to_regclass('player_history.matches')::text AS matches,
          to_regclass('player_history.player_match_records')::text AS records,
          to_regclass('player_history.player_season_stats')::text AS stats,
          EXISTS (
            SELECT 1 FROM pg_attribute
            WHERE attrelid = to_regclass('player_history.player_match_records')
              AND attname = 'details' AND NOT attisdropped
          ) AS match_details`);
      const schema = result.rows[0];
      if (schema?.lookups && schema.matches && schema.records && schema.stats && schema.match_details) {
        return { status: 'ok' };
      }
    } catch {
      // The readiness response must not expose connection details.
    }
    throw new ServiceUnavailableException({
      code: 'PLAYER_DATABASE_NOT_READY',
      message: '전적 데이터베이스를 사용할 수 없습니다.',
    });
  }
}
