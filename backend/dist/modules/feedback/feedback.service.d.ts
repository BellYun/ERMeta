import { OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
export declare class FeedbackService implements OnModuleInit, OnModuleDestroy {
    private configService;
    private cleanupInterval;
    constructor(configService: ConfigService);
    onModuleInit(): void;
    onModuleDestroy(): void;
    submit(body: {
        category?: string;
        message?: string;
        contact?: string;
    }, ip: string, userAgent: string): Promise<{
        success: boolean;
    }>;
}
