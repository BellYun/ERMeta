import { CanActivate, ExecutionContext, HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { Request, Response } from 'express';

const MAX_REQUESTS = 5;
const WINDOW_MS = 60_000;

@Injectable()
export class PlayerRefreshRateLimitGuard implements CanActivate {
  private readonly counts = new Map<string, { count: number; resetAt: number }>();

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const response = context.switchToHttp().getResponse<Response>();
    // Express only derives request.ip from forwarding headers when a trusted proxy is configured.
    const ip = request.ip ?? 'unknown';
    const now = Date.now();
    const resetAt = (Math.floor(now / WINDOW_MS) + 1) * WINDOW_MS;
    const previous = this.counts.get(ip);
    const count = previous?.resetAt === resetAt ? previous.count + 1 : 1;
    this.counts.delete(ip);
    this.counts.set(ip, { count, resetAt });
    if (this.counts.size > 10_000) {
      const oldest = this.counts.keys().next().value;
      if (oldest) this.counts.delete(oldest);
    }

    response.setHeader('X-RateLimit-Limit', MAX_REQUESTS);
    response.setHeader('X-RateLimit-Remaining', Math.max(0, MAX_REQUESTS - count));
    response.setHeader('X-RateLimit-Reset', resetAt);
    if (count > MAX_REQUESTS) {
      const retryAfter = Math.max(1, Math.ceil((resetAt - now) / 1000));
      response.setHeader('Retry-After', retryAfter);
      throw new HttpException({ code: 'RATE_LIMITED', message: '갱신 요청이 너무 많습니다.', retryAfter }, HttpStatus.TOO_MANY_REQUESTS);
    }
    return true;
  }
}
