"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var RedisService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.RedisService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const ioredis_1 = __importDefault(require("ioredis"));
let RedisService = RedisService_1 = class RedisService {
    constructor(config) {
        this.config = config;
        this.logger = new common_1.Logger(RedisService_1.name);
    }
    async onModuleInit() {
        const host = this.config.get('REDIS_HOST', 'localhost');
        const port = this.config.get('REDIS_PORT', 6379);
        const password = this.config.get('REDIS_PASSWORD', '');
        this.client = new ioredis_1.default({
            host,
            port,
            password: password || undefined,
            retryStrategy: (times) => {
                if (times > 3) {
                    this.logger.error('Redis 연결 실패 — 재시도 중단');
                    return null;
                }
                return Math.min(times * 500, 2000);
            },
            lazyConnect: true,
        });
        this.client.on('error', (err) => {
            this.logger.error(`Redis 에러: ${err.message}`);
        });
        try {
            await this.client.connect();
            const pong = await this.client.ping();
            this.logger.log(`Redis 연결 성공 (${host}:${port}) — ${pong}`);
        }
        catch (err) {
            this.logger.warn(`Redis 연결 실패 (${host}:${port}) — 캐시 없이 동작합니다`);
        }
    }
    async onModuleDestroy() {
        await this.client?.quit();
        this.logger.log('Redis 연결 종료');
    }
    isConnected() {
        return this.client?.status === 'ready';
    }
    async ping() {
        if (!this.isConnected())
            return 'DISCONNECTED';
        return this.client.ping();
    }
    async get(key) {
        if (!this.isConnected())
            return null;
        try {
            const data = await this.client.get(key);
            return data ? JSON.parse(data) : null;
        }
        catch {
            return null;
        }
    }
    async set(key, value, ttl) {
        if (!this.isConnected())
            return;
        try {
            await this.client.set(key, JSON.stringify(value), 'EX', ttl);
        }
        catch (err) {
            this.logger.warn(`Redis SET 실패 [${key}]: ${err.message}`);
        }
    }
    async del(...keys) {
        if (!this.isConnected() || keys.length === 0)
            return;
        try {
            await this.client.del(...keys);
        }
        catch (err) {
            this.logger.warn(`Redis DEL 실패: ${err.message}`);
        }
    }
    async invalidatePattern(pattern) {
        if (!this.isConnected())
            return 0;
        let deleted = 0;
        const stream = this.client.scanStream({ match: pattern, count: 100 });
        return new Promise((resolve) => {
            stream.on('data', async (keys) => {
                if (keys.length) {
                    await this.client.del(...keys);
                    deleted += keys.length;
                }
            });
            stream.on('end', () => resolve(deleted));
            stream.on('error', () => resolve(deleted));
        });
    }
    async getOrSet(key, ttl, factory) {
        const cached = await this.get(key);
        if (cached !== null) {
            this.logger.debug(`Cache HIT [${key}]`);
            return cached;
        }
        this.logger.debug(`Cache MISS [${key}]`);
        const result = await factory();
        this.set(key, result, ttl).catch(() => { });
        return result;
    }
};
exports.RedisService = RedisService;
exports.RedisService = RedisService = RedisService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], RedisService);
//# sourceMappingURL=redis.service.js.map