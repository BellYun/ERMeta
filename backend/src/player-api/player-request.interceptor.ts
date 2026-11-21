import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request, Response } from 'express';
import { Observable } from 'rxjs';
import { PlayerRequestTimeoutError, playerWork } from '../common/player-work/player-work';

const DEFAULT_TIMEOUT_MS = 10_000;

@Injectable()
export class PlayerRequestInterceptor implements NestInterceptor {
  private readonly timeoutMs: number;

  constructor(config: ConfigService) {
    const timeout = Number(config.get('PLAYER_REQUEST_TIMEOUT_MS') ?? DEFAULT_TIMEOUT_MS);
    this.timeoutMs = Number.isInteger(timeout) && timeout >= 1 && timeout <= 2_147_483_647
      ? timeout : DEFAULT_TIMEOUT_MS;
  }

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<Request>();
    if (!request.path.toLowerCase().startsWith('/v1/players/')) return next.handle();
    const response = context.switchToHttp().getResponse<Response>();

    return new Observable((subscriber) => {
      if (response.destroyed) {
        subscriber.error(new PlayerRequestTimeoutError());
        return;
      }
      const controller = new AbortController();
      const work = { signal: controller.signal, deadline: performance.now() + this.timeoutMs, timeoutMs: this.timeoutMs };
      const timer = setTimeout(() => controller.abort(), this.timeoutMs);
      const onAbort = () => subscriber.error(new PlayerRequestTimeoutError());
      const onClose = () => { if (!response.writableFinished) controller.abort(); };
      controller.signal.addEventListener('abort', onAbort, { once: true });
      response.once('close', onClose);

      const subscription = playerWork.run(work, () => next.handle().subscribe({
        next: (value) => {
          if (performance.now() >= work.deadline) controller.abort();
          else subscriber.next(value);
        },
        error: (error) => subscriber.error(error),
        complete: () => subscriber.complete(),
      }));
      return () => {
        clearTimeout(timer);
        response.removeListener('close', onClose);
        controller.signal.removeEventListener('abort', onAbort);
        controller.abort();
        subscription.unsubscribe();
      };
    });
  }
}
