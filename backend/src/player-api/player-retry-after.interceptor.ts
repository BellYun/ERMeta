import { CallHandler, ExecutionContext, HttpException, Injectable, NestInterceptor } from '@nestjs/common';
import { Response } from 'express';
import { Observable, catchError, throwError } from 'rxjs';

@Injectable()
export class PlayerRetryAfterInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const response = context.switchToHttp().getResponse<Response>();
    return next.handle().pipe(catchError((error: unknown) => {
      if (error instanceof HttpException && error.getStatus() === 429) {
        const body = error.getResponse();
        const retryAfter = typeof body === 'object' && body !== null && 'retryAfter' in body
          ? (body as { retryAfter: unknown }).retryAfter : undefined;
        if (typeof retryAfter === 'number' && Number.isInteger(retryAfter) && retryAfter > 0) {
          response.setHeader('Retry-After', retryAfter);
        }
      }
      return throwError(() => error);
    }));
  }
}
