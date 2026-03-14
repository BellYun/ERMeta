import { SupabaseService } from '../../common/database/supabase.service';
export interface CharacterRankingData {
    rank: number;
    characterNum: number;
    bestWeapon: number;
    totalGames: number;
    pickRate: number;
    winRate: number;
    averageRP: number;
    top3Rate: number;
}
export declare class CharacterService {
    private readonly supabase;
    constructor(supabase: SupabaseService);
    fetchRankingData(patchVersion: string, requestedTier: string): Promise<{
        rankings: CharacterRankingData[];
        previousRankings: CharacterRankingData[];
        patchVersion: string;
        previousPatch: string | null;
        tier: string;
    }>;
    getCharacterStats(characterCode: number, patchVersion: string, tier: string): Promise<{
        characterNum: number;
        patchVersion: string;
        tier: string;
        totalGames: number;
        pickRate: number;
        winRate: number;
        averageRank: number;
        averageRP: number;
        top3Rate: number;
        weapons: {
            bestWeapon: number;
            totalGames: number;
            pickRate: number;
            winRate: number;
            averageRank: number;
            averageRP: number;
        }[];
    }>;
}
