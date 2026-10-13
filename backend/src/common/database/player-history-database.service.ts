import { Injectable, Logger, OnModuleDestroy, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Pool } from 'pg';

@Injectable()
export class PlayerHistoryDatabaseService implements OnModuleDestroy {
  private readonly logger = new Logger(PlayerHistoryDatabaseService.name);
  private pool?: Pool;

  constructor(private readonly config: ConfigService) {}

  getPool(): Pool {
    const connectionString = this.config.get<string>('DATABASE_URL');
    if (!connectionString) {
      throw new ServiceUnavailableException({
        code: 'DATABASE_NOT_CONFIGURED',
        message: '전적 데이터베이스가 설정되지 않았습니다.',
      });
    }
    if (!this.pool) {
      this.pool = new Pool({ connectionString, max: 10, connectionTimeoutMillis: 3000 });
      this.pool.on('error', (error) => this.logger.error('유휴 DB 연결 오류', error));
    }
    return this.pool;
  }

  async onModuleDestroy(): Promise<void> {
    await this.pool?.end();
  }
}
