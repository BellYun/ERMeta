import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { CircuitBreaker } from './circuit-breaker';

interface L1Entry<T = unknown> {
  data: T;
  expiresAt: number;
}

const L1_TTL_MS = 30_000; // 30초

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private client: Redis;
  private readonly logger = new Logger(RedisService.name);

  /** L1: In-Memory 캐시 (프로세스 내 30초 TTL) */
  private readonly local = new Map<string, L1Entry>();

  /** Singleflight: 동일 키 동시 요청 병합 */
  private readonly inflight = new Map<string, Promise<unknown>>();

  /** Circuit Breaker: Supabase 연속 실패 시 stale 캐시 폴백 */
  private readonly circuitBreaker = new CircuitBreaker({
    failureThreshold: 5,
    recoveryTimeMs: 30_000,
  });

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
   * 3계층 캐시 조회: L1(In-Memory) → L2(Redis) → Singleflight → factory
   * - L1: 프로세스 내 30초 TTL, 네트워크 왕복 0
   * - L2: Redis TTL (파라미터), 프로세스 간 공유
   * - Singleflight: 동일 키 동시 요청 시 factory 1회만 실행
   * - Redis 장애 시에도 factory를 실행하여 정상 응답 보장
   */
  async getOrSet<T>(
    key: string,
    ttl: number,
    factory: () => Promise<T>,
  ): Promise<T> {
    // 1. L1 히트 (In-Memory, 0ms)
    const l1 = this.local.get(key);
    if (l1 && Date.now() < l1.expiresAt) {
      this.logger.debug(`L1 HIT [${key}]`);
      return l1.data as T;
    }

    // 2. L2 히트 (Redis)
    const cached = await this.get<T>(key);
    if (cached !== null) {
      this.logger.debug(`L2 HIT [${key}]`);
      this.local.set(key, { data: cached, expiresAt: Date.now() + L1_TTL_MS });
      return cached;
    }

    // 3. Circuit Breaker OPEN → stale 캐시 반환
    if (!this.circuitBreaker.canExecute()) {
      this.logger.warn(`Circuit OPEN [${key}] → stale 캐시 시도`);
      const stale = await this.get<T>(`stale:${key}`);
      if (stale !== null) return stale;
      // stale도 없으면 강제 시도 (아래로 진행)
    }

    // 4. Singleflight — 동일 키 요청이 이미 진행 중이면 그 Promise를 공유
    const existing = this.inflight.get(key);
    if (existing) {
      this.logger.debug(`Singleflight JOIN [${key}]`);
      return existing as Promise<T>;
    }

    // 5. factory 실행 (1회만)
    this.logger.debug(`Cache MISS [${key}] → factory`);
    const promise = factory()
      .then((result) => {
        this.circuitBreaker.onSuccess();
        // L1 + L2 + stale 백업 저장
        this.local.set(key, { data: result, expiresAt: Date.now() + L1_TTL_MS });
        this.set(key, result, ttl).catch(() => {});
        this.set(`stale:${key}`, result, ttl * 2).catch(() => {}); // stale은 TTL 2배
        return result;
      })
      .catch(async (err) => {
        this.circuitBreaker.onFailure();
        this.logger.warn(`Factory 실패 [${key}]: ${(err as Error).message}`);
        // stale 캐시 폴백
        const stale = await this.get<T>(`stale:${key}`);
        if (stale !== null) {
          this.logger.warn(`Stale 폴백 [${key}]`);
          return stale;
        }
        throw err;
      })
      .finally(() => {
        this.inflight.delete(key);
      });

    this.inflight.set(key, promise);
    return promise;
  }

  /** L1 캐시 수동 초기화 (테스트/워밍 용도) */
  clearLocal(): void {
    this.local.clear();
  }
}
