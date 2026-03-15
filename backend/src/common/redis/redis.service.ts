import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private client: Redis;
  private readonly logger = new Logger(RedisService.name);

  constructor(private config: ConfigService) {}

  async onModuleInit() {
    const host = this.config.get<string>('REDIS_HOST', 'localhost');
    const port = this.config.get<number>('REDIS_PORT', 6379);
    const password = this.config.get<string>('REDIS_PASSWORD', '');

    this.client = new Redis({
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
    } catch (err) {
      this.logger.warn(`Redis 연결 실패 (${host}:${port}) — 캐시 없이 동작합니다`);
    }
  }

  async onModuleDestroy() {
    await this.client?.quit();
    this.logger.log('Redis 연결 종료');
  }

  /** Redis 연결 상태 확인 */
  isConnected(): boolean {
    return this.client?.status === 'ready';
  }

  /** Redis ping */
  async ping(): Promise<string> {
    if (!this.isConnected()) return 'DISCONNECTED';
    return this.client.ping();
  }

  /** 캐시 조회 */
  async get<T>(key: string): Promise<T | null> {
    if (!this.isConnected()) return null;
    try {
      const data = await this.client.get(key);
      return data ? JSON.parse(data) : null;
    } catch {
      return null;
    }
  }

  /** 캐시 저장 */
  async set(key: string, value: unknown, ttl: number): Promise<void> {
    if (!this.isConnected()) return;
    try {
      await this.client.set(key, JSON.stringify(value), 'EX', ttl);
    } catch (err) {
      this.logger.warn(`Redis SET 실패 [${key}]: ${err.message}`);
    }
  }

  /** 캐시 삭제 */
  async del(...keys: string[]): Promise<void> {
    if (!this.isConnected() || keys.length === 0) return;
    try {
      await this.client.del(...keys);
    } catch (err) {
      this.logger.warn(`Redis DEL 실패: ${err.message}`);
    }
  }

  /** 패턴으로 캐시 삭제 (SCAN 기반, KEYS 안 씀) */
  async invalidatePattern(pattern: string): Promise<number> {
    if (!this.isConnected()) return 0;
    let deleted = 0;
    const stream = this.client.scanStream({ match: pattern, count: 100 });

    return new Promise((resolve) => {
      stream.on('data', async (keys: string[]) => {
        if (keys.length) {
          await this.client.del(...keys);
          deleted += keys.length;
        }
      });
      stream.on('end', () => resolve(deleted));
      stream.on('error', () => resolve(deleted));
    });
  }

  /**
   * 캐시 우선 조회 — 미스 시 factory 실행 후 저장
   * Redis 장애 시에도 factory를 실행하여 정상 응답 보장
   */
  async getOrSet<T>(
    key: string,
    ttl: number,
    factory: () => Promise<T>,
  ): Promise<T> {
    // 1. Redis 히트
    const cached = await this.get<T>(key);
    if (cached !== null) {
      this.logger.debug(`Cache HIT [${key}]`);
      return cached;
    }

    // 2. 미스 → factory 실행
    this.logger.debug(`Cache MISS [${key}]`);
    const result = await factory();

    // 3. 결과 저장 (비동기, 실패해도 무시)
    this.set(key, result, ttl).catch(() => {});

    return result;
  }
}
