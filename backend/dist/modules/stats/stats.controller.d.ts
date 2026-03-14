import { StatsService } from './stats.service';
export declare class TriosQueryDto {
    sortBy?: string;
    limit?: string;
    character1?: string;
    character2?: string;
}
export declare class StatsController {
    private readonly statsService;
    constructor(statsService: StatsService);
    getTrios(query: TriosQueryDto): Promise<{
        results: import("./stats.service").AggregatedTrio[];
    }>;
}
