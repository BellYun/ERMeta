import { SupabaseService } from '../../common/database/supabase.service';
export declare class HealthController {
    private readonly supabase;
    constructor(supabase: SupabaseService);
    check(): Promise<{
        status: string;
        timestamp: string;
        uptime: number;
        dependencies: {
            supabase: string;
        };
    }>;
}
