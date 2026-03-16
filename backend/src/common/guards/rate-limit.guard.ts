import {
  Injectable,
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  SetMetadata,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RedisService } from '../redis/redis.service';
import { Request, Response } from 'express';

/**
 * Rate Limit 설정 데코레이터
 * @param maxRequests 윈도우 내 최대 요청 수
 * @param windowSeconds 윈도우 크기 (초)
 */
export const RATE_LIMIT_KEY = 'rate_limit';
export const RateLimit = (maxRequests: number, windowSeconds: number) =>
  SetMetadata(RATE_LIMIT_KEY, { maxRequests, windowSeconds });

interface RateLimitConfig {
  maxRequests: number;
  windowSeconds: number;
}

const DEFAULT_CONFIG: RateLimitConfig = {
  maxRequests: 100,
  windowSeconds: 60,
};

@Injectable()
export class RateLimitGuard implements CanActivate {
  constructor(
    private readonly redis: RedisService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const config = this.reflector.getAllAndOverride<RateLimitConfig>(
      RATE_LIMIT_KEY,
      [context.getHandler(), context.getClass()],
    ) ?? DEFAULT_CONFIG;

    const request = context.switchToHttp().getRequest<Request>();
    const response = context.switchToHttp().getResponse<Response>();
    const ip = this.getClientIp(request);
    const endpoint = `${request.method}:${request.route?.path ?? request.path}`;

    const result = await this.checkRateLimit(ip, endpoint, config);

    // 응답 헤더에 rate limit 정보 포함
    response.setHeader('X-RateLimit-Limit', config.maxRequests);
    response.setHeader('X-RateLimit-Remaining', result.remaining);
    response.setHeader('X-RateLimit-Reset', result.resetAt);

    if (!result.allowed) {
      response.setHeader('Retry-After', Math.ceil((result.resetAt - Date.now()) / 1000));
      throw new HttpException(
        {
          statusCode: HttpStatus.TOO_MANY_REQUESTS,
          message: '요청이 너무 많습니다. 잠시 후 다시 시도해 주세요.',
          retryAfter: Math.ceil((result.resetAt - Date.now()) / 1000),
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    return true;
  }

  private async checkRateLimit(
    ip: string,
    endpoint: string,
    config: RateLimitConfig,
  ): Promise<{ allowed: boolean; remaining: number; resetAt: number }> {
    // Redis 미연결 시 rate limit 비활성화 (서비스 우선)
    if (!this.redis.isConnected()) {
      return { allowed: true, remaining: config.maxRequests, resetAt: Date.now() };
    }

    const key = `rl:${endpoint}:${ip}`;
    const now = Date.now();
    const windowStart = now - config.windowSeconds * 1000;

    try {
      // Sliding window: sorted set에 타임스탬프를 score로 저장
      const pipeline = (this.redis as any).client;
      // RedisService에서 client를 직접 노출하지 않으므로 getOrSet 대신
      // 간단한 인메모리 폴백 사용
      return await this.checkWithRedis(key, now, windowStart, config);
    } catch {
      // Redis 실패 시 허용
      return { allowed: true, remaining: config.maxRequests, resetAt: now };
    }
  }

  private async checkWithRedis(
    key: string,
    now: number,
    windowStart: number,
    config: RateLimitConfig,
  ): Promise<{ allowed: boolean; remaining: number; resetAt: number }> {
    // RedisService의 기존 메서드로는 sorted set 연산이 어려우므로
    // 간단한 카운터 기반 rate limiting 구현 (fixed window)
    const countKey = `${key}:${Math.floor(now / (config.windowSeconds * 1000))}`;
    const current = await this.redis.get<number>(countKey);
    const count = (current ?? 0) + 1;

    await this.redis.set(countKey, count, config.windowSeconds);

    const resetAt = (Math.floor(now / (config.windowSeconds * 1000)) + 1) * config.windowSeconds * 1000;

    return {
      allowed: count <= config.maxRequests,
      remaining: Math.max(0, config.maxRequests - count),
      resetAt,
    };
  }

  private getClientIp(request: Request): string {
    const forwarded = request.headers['x-forwarded-for'];
    if (typeof forwarded === 'string') return forwarded.split(',')[0].trim();
    return request.ip ?? 'unknown';
  }
}
