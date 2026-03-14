import { ConfigService } from '@nestjs/config';
export declare class ItemsService {
    private configService;
    private readonly bserApiKey;
    private l10nCache;
    constructor(configService: ConfigService);
    private fetchL10n;
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
