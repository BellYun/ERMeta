import { Injectable } from '@nestjs/common';
import { SupabaseService } from '../../common/database/supabase.service';

@Injectable()
export class PatchesService {
  constructor(private readonly supabase: SupabaseService) {}

  async getPatchHistory(limit = 50, includeInactive = false): Promise<string[]> {
    const client = this.supabase.getClient();

    let query = client
      .from('PatchVersion')
      .select('version')
      .order('startDate', { ascending: false })
      .limit(limit);

    if (!includeInactive) {
      query = query.eq('isActive', true);
    }

    const { data } = await query;
    return (data ?? []).map((p: { version: string }) => p.version);
  }

  /** 패치 목록 조회 (다른 서비스에서 재사용) */
  async getPatchList(limit = 50): Promise<string[]> {
    const client = this.supabase.getClient();
    const { data } = await client
      .from('PatchVersion')
      .select('version')
      .order('startDate', { ascending: false })
      .limit(limit);
    return (data ?? []).map((p: { version: string }) => p.version);
  }
}
