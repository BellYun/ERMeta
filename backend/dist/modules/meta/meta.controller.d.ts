import { MetaService } from './meta.service';
export declare class HoneyPicksQueryDto {
    patchVersion?: string;
    tier?: string;
}
export declare class MetaController {
    private readonly metaService;
    constructor(metaService: MetaService);
    getHoneyPicks(query: HoneyPicksQueryDto): Promise<{
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
