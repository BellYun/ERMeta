import { PatchesService } from './patches.service';
export declare class PatchesController {
    private readonly patchesService;
    constructor(patchesService: PatchesService);
    getHistory(limit?: number, includeInactive?: boolean): Promise<{
        patches: string[];
    }>;
}
