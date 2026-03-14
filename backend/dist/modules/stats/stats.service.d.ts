import { SupabaseService } from '../../common/database/supabase.service';
export interface AggregatedTrio {
    character1: number;
    character2: number;
    character3: number;
    totalGames: number;
    winRate: number;
    averageRP: number;
    averageRank: number;
}
export declare class StatsService {
    private readonly supabase;
    constructor(supabase: SupabaseService);
    getTrios(sortBy: 'averageRP' | 'winRate' | 'totalGames' | 'recommended', limit: number, char1: number | null, char2: number | null): Promise<{
        results: AggregatedTrio[];
    }>;
}
