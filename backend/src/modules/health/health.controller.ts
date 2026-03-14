import { Controller, Get } from '@nestjs/common';
import { SupabaseService } from '../../common/database/supabase.service';

@Controller('health')
export class HealthController {
  constructor(private readonly supabase: SupabaseService) {}

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

    return {
      status: dbStatus === 'up' ? 'ok' : 'degraded',
      timestamp: new Date().toISOString(),
      uptime: Math.floor(process.uptime()),
      dependencies: {
        supabase: dbStatus,
      },
    };
  }
}
