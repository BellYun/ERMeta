import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable, tap } from 'rxjs';

export type CachePreset = 'immutable' | 'slow' | 'daily' | 'frequent';

const CACHE_CONTROL: Record<CachePreset, string> = {
  immutable:
    'public, max-age=86400, s-maxage=604800, stale-while-revalidate=86400',
  slow: 'public, max-age=300, s-maxage=3600, stale-while-revalidate=600',
  daily: 'public, max-age=300, s-maxage=1800, stale-while-revalidate=300',
  frequent:
    'public, max-age=120, s-maxage=300, stale-while-revalidate=3600',
};

export function CacheControlInterceptor(preset: CachePreset) {
  @Injectable()
  class CacheInterceptor implements NestInterceptor {
    intercept(
      context: ExecutionContext,
      next: CallHandler,
    ): Observable<unknown> {
      return next.handle().pipe(
        tap(() => {
          const response = context.switchToHttp().getResponse();
          response.setHeader('Cache-Control', CACHE_CONTROL[preset]);
        }),
      );
    }
  }
  return CacheInterceptor;
}
