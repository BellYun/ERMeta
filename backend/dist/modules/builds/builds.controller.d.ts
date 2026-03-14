import { BuildsService } from './builds.service';
import { EquipmentQueryDto, TraitsMainQueryDto, TraitsOptionsQueryDto } from './dto/builds-query.dto';
export declare class BuildsController {
    private readonly buildsService;
    constructor(buildsService: BuildsService);
    getEquipment(query: EquipmentQueryDto): Promise<{
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
    getTraitsMain(query: TraitsMainQueryDto): Promise<{
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
    getTraitsOptions(query: TraitsOptionsQueryDto): Promise<{
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
