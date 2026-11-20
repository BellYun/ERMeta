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
        stats_absences: string | null;
        stats_refresh_states: string | null;
        match_refresh_leases: string | null;
        match_details: boolean;
      }>(`SELECT
          to_regclass('player_history.player_lookups')::text AS lookups,
          to_regclass('player_history.matches')::text AS matches,
          to_regclass('player_history.player_match_records')::text AS records,
          to_regclass('player_history.player_season_stats')::text AS stats,
          to_regclass('player_history.player_season_stats_absences')::text AS stats_absences,
          to_regclass('player_history.season_stats_refresh_states')::text AS stats_refresh_states,
          to_regclass('player_history.match_refresh_leases')::text AS match_refresh_leases,
          EXISTS (
            SELECT 1 FROM pg_attribute
            WHERE attrelid = to_regclass('player_history.player_match_records')
              AND attname = 'details' AND NOT attisdropped
          ) AS match_details`);
      const schema = result.rows[0];
      if (schema?.lookups && schema.matches && schema.records && schema.stats && schema.stats_absences &&
          schema.stats_refresh_states && schema.match_details && schema.match_refresh_leases) {
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
