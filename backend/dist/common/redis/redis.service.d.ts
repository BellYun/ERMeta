import { OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
export declare class RedisService implements OnModuleInit, OnModuleDestroy {
    private config;
    private client;
    private readonly logger;
    constructor(config: ConfigService);
    onModuleInit(): Promise<void>;
    onModuleDestroy(): Promise<void>;
    isConnected(): boolean;
    ping(): Promise<string>;
    get<T>(key: string): Promise<T | null>;
    set(key: string, value: unknown, ttl: number): Promise<void>;
    del(...keys: string[]): Promise<void>;
    invalidatePattern(pattern: string): Promise<number>;
    getOrSet<T>(key: string, ttl: number, factory: () => Promise<T>): Promise<T>;
}
