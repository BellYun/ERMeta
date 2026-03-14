import { SupabaseService } from '../../common/database/supabase.service';
export declare class MetaService {
    private readonly supabase;
    constructor(supabase: SupabaseService);
    getHoneyPicks(patchVersion: string, requestedTier: string): Promise<{
        picks: never[];
        patchVersion: string;
        previousPatch: null;
        tier: string;
    } | {
        picks: {
            characterNum: number;
            bestWeapon: number;
            pickRate: number;
            winRate: number;
            averageRP: number;
            pickRateDelta: number;
            winRateDelta: number;
            averageRPDelta: number;
            honeyScore: number;
        }[];
        patchVersion: string;
        previousPatch: string;
        tier: string;
    }>;
}
