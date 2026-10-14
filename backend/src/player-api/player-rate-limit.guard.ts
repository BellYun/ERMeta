import { CanActivate, ExecutionContext, HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request, Response } from 'express';
import { isIP } from 'node:net';
import { RATE_LIMIT_KEY } from '../common/guards/rate-limit.guard';

interface Window { count: number; resetAt: number }
interface Limit { maxRequests: number; windowSeconds: number }

@Injectable()
export class PlayerRateLimitGuard implements CanActivate {
  private readonly windows = new Map<string, Window>();

  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const limit = this.reflector.getAllAndOverride<Limit>(RATE_LIMIT_KEY, [
      context.getHandler(), context.getClass(),
    ]) ?? { maxRequests: 100, windowSeconds: 60 };
    const request = context.switchToHttp().getRequest<Request>();
    if (request.path === '/health/live' || request.path === '/health/ready') return true;
    const response = context.switchToHttp().getResponse<Response>();
    const forwarded = request.headers['x-forwarded-for'];
    const candidate = typeof forwarded === 'string' ? forwarded.split(',')[0].trim() : '';
    const client = isIP(candidate) ? candidate : request.ip ?? 'unknown';
    const key = `${request.method}:${request.route?.path ?? request.path}:${client}`;
    const now = Date.now();
    let window = this.windows.get(key);
    if (!window || window.resetAt <= now) {
      if (!window && this.windows.size >= 10_000) {
        for (const [entry, value] of this.windows) {
          if (value.resetAt <= now) this.windows.delete(entry);
        }
        if (this.windows.size >= 10_000) {
          throw new HttpException({ code: 'RATE_LIMITED', message: '요청이 너무 많습니다.' }, HttpStatus.TOO_MANY_REQUESTS);
        }
      }
      window = { count: 0, resetAt: now + limit.windowSeconds * 1000 };
      this.windows.set(key, window);
    }
    window.count += 1;
    response.setHeader('X-RateLimit-Limit', limit.maxRequests);
    response.setHeader('X-RateLimit-Remaining', Math.max(0, limit.maxRequests - window.count));
    response.setHeader('X-RateLimit-Reset', window.resetAt);
    if (window.count > limit.maxRequests) {
      const retryAfter = Math.ceil((window.resetAt - now) / 1000);
      response.setHeader('Retry-After', retryAfter);
      throw new HttpException({ code: 'RATE_LIMITED', message: '요청이 너무 많습니다.', retryAfter }, HttpStatus.TOO_MANY_REQUESTS);
    }
    return true;
  }
}
