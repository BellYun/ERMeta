import { CharacterService } from './character.service';
import { RankingQueryDto, CharacterStatsQueryDto } from './dto/ranking-query.dto';
export declare class CharacterController {
    private readonly characterService;
    constructor(characterService: CharacterService);
    getRanking(query: RankingQueryDto): Promise<{
        rankings: import("./character.service").CharacterRankingData[];
        previousRankings: import("./character.service").CharacterRankingData[];
        patchVersion: string;
        previousPatch: string | null;
        tier: string;
    }>;
    getStats(characterCode: string, query: CharacterStatsQueryDto): Promise<{
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
