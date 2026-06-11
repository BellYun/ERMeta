import { Injectable } from '@nestjs/common';
import { SupabaseService } from '../../common/database/supabase.service';

export interface PatchHistoryResult {
  patches: string[];
  latestStartDate?: string | null;
}

@Injectable()
export class PatchesService {
  constructor(private readonly supabase: SupabaseService) {}

  async getPatchHistory(
    limit = 10,
    includeInactive = false,
  ): Promise<PatchHistoryResult> {
    const client = this.supabase.getClient();
    const safeLimit = Math.min(Number.isFinite(limit) ? limit : 10, 50);

    let query = client
      .from('PatchVersion')
      .select('version,startDate,isActive')
      .order('startDate', { ascending: false })
      .limit(safeLimit);

    if (!includeInactive) {
      query = query.eq('isActive', true);
    }

    const { data, error } = await query;

    if (!error && data && data.length > 0) {
      return {
        patches: data.map((p: { version: string }) => p.version),
        latestStartDate:
          (data[0] as { startDate?: string }).startDate ?? null,
      };
    }

    const { data: statsData, error: statsError } = await client
      .from('v2_CharacterStats')
      .select('patchVersion');

    if (statsError) return { patches: [] };

    const patches = [
      ...new Set(
        (statsData ?? []).map((r: { patchVersion?: string }) => r.patchVersion),
      ),
    ]
      .filter((version): version is string => Boolean(version))
      .sort((a, b) => b.localeCompare(a, undefined, { numeric: true }))
      .slice(0, safeLimit);

    return { patches };
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
