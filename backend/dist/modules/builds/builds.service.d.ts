import { SupabaseService } from '../../common/database/supabase.service';
export declare class BuildsService {
    private readonly supabase;
    constructor(supabase: SupabaseService);
    getEquipmentBuilds(characterCode: number, tier: string, patchVersion: string, mainCoreParam?: string, bestWeaponParam?: string): Promise<{
        topBuilds: never[];
        slotPopularity: {
            weapon: never[];
            chest: never[];
            head: never[];
            arm: never[];
            leg: never[];
        };
        coreItems: never[];
    } | {
        topBuilds: {
            mainCore: number | null;
            weapon: number | null;
            chest: number | null;
            head: number | null;
            arm: number | null;
            leg: number | null;
            totalGames: number;
            pickRate: number;
            winRate: number;
            averageRank: number;
            averageRP: number;
        }[];
        slotPopularity: Record<string, unknown[]>;
        coreItems: {
            code: number;
            totalGames: number;
            pickRate: number;
            winRate: number;
        }[];
    }>;
    getTraitsMain(characterCode: number, tier: string, patchVersion: string, bestWeapon?: string): Promise<{
        builds: {
            mainCore: number | null;
            totalGames: number;
            groupPickRate: number;
            groupWinRate: number;
            sub1Options: {
                code: number | null;
                totalGames: number;
                pickRate: number;
                winRate: number;
            }[];
            sub2Options: {
                code: number | null;
                totalGames: number;
                pickRate: number;
                winRate: number;
            }[];
            sub3Options: {
                code: number | null;
                totalGames: number;
                pickRate: number;
                winRate: number;
            }[];
            sub4Options: {
                code: number | null;
                totalGames: number;
                pickRate: number;
                winRate: number;
            }[];
        }[];
    }>;
    getTraitsOptions(characterCode: number, tier: string, patchVersion: string, bestWeapon?: string, mainCore?: string): Promise<{
        options: never[];
    } | {
        options: {
            sub1: {
                code: number | null;
                totalGames: number;
                pickRate: number;
                winRate: number;
            }[];
            sub2: {
                code: number | null;
                totalGames: number;
                pickRate: number;
                winRate: number;
            }[];
            sub3: {
                code: number | null;
                totalGames: number;
                pickRate: number;
                winRate: number;
            }[];
            sub4: {
                code: number | null;
                totalGames: number;
                pickRate: number;
                winRate: number;
            }[];
        };
    }>;
}
