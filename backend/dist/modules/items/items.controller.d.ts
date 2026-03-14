import { ItemsService } from './items.service';
export declare class ItemsController {
    private readonly itemsService;
    constructor(itemsService: ItemsService);
    getItemNames(): Promise<{
        error: string;
        items?: undefined;
    } | {
        items: Record<string, string>;
        error?: undefined;
    }>;
    getTraitNames(): Promise<{
        error: string;
        traits?: undefined;
    } | {
        traits: Record<string, string>;
        error?: undefined;
    }>;
}
