import { SupabaseService } from '../../common/database/supabase.service';
export declare class PatchesService {
    private readonly supabase;
    constructor(supabase: SupabaseService);
    getPatchHistory(limit?: number, includeInactive?: boolean): Promise<string[]>;
    getPatchList(limit?: number): Promise<string[]>;
}
