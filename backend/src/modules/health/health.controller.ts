import { Controller, Get } from '@nestjs/common';
import { SupabaseService } from '../../common/database/supabase.service';
import { RedisService } from '../../common/redis/redis.service';

@Controller('health')
export class HealthController {
  constructor(
    private readonly supabase: SupabaseService,
    private readonly redis: RedisService,
  ) {}

  @Get()
  async check() {
    // Supabase 연결 확인
    let dbStatus = 'up';
    try {
      const { error } = await this.supabase
        .getClient()
        .from('PatchVersion')
        .select('version')
        .limit(1);
      if (error) dbStatus = 'down';
    } catch {
      dbStatus = 'down';
    }

    const redisStatus = this.redis.isConnected() ? 'up' : 'down';

    return {
      status: dbStatus === 'up' ? 'ok' : 'degraded',
      timestamp: new Date().toISOString(),
      uptime: Math.floor(process.uptime()),
      dependencies: {
        supabase: dbStatus,
        redis: redisStatus,
      },
    };
  }
}
