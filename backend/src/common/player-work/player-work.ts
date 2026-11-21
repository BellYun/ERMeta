import { HttpException, HttpStatus } from '@nestjs/common';
import { AsyncLocalStorage } from 'node:async_hooks';
import { setTimeout as delay } from 'node:timers/promises';

interface PlayerWorkContext {
  signal: AbortSignal;
  deadline: number;
  timeoutMs?: number;
}

export const playerWork = new AsyncLocalStorage<PlayerWorkContext>();

export class PlayerRequestTimeoutError extends HttpException {
  constructor() {
    super({
      code: 'PLAYER_REQUEST_TIMEOUT',
      message: '전적검색 처리 시간이 초과되었습니다.',
    }, HttpStatus.GATEWAY_TIMEOUT);
  }
}

export function checkPlayerWork(): void {
  const work = playerWork.getStore();
  if (work && (work.signal.aborted || performance.now() >= work.deadline)) {
    throw new PlayerRequestTimeoutError();
  }
}

export async function playerDelay(ms: number): Promise<void> {
  checkPlayerWork();
  try {
    await delay(ms, undefined, { signal: playerWork.getStore()?.signal });
  } catch (error) {
    checkPlayerWork();
    throw error;
  }
  checkPlayerWork();
}

interface Flight<T> {
  controller: AbortController;
  promise: Promise<T>;
  waiters: number;
}

export class SharedPlayerWork<T> {
  private readonly flights = new Map<string, Flight<T>>();

  async run(key: string, task: () => Promise<T>): Promise<T> {
    checkPlayerWork();
    const caller = playerWork.getStore();
    let flight = this.flights.get(key);
    if (!flight) {
      const controller = new AbortController();
      const timeoutMs = caller?.timeoutMs;
      const deadline = timeoutMs === undefined ? Infinity : performance.now() + timeoutMs;
      const timer = timeoutMs === undefined ? undefined : setTimeout(() => controller.abort(), timeoutMs);
      // The work can outlive any single waiter, but ends when the last waiter leaves.
      const promise = playerWork.run({ signal: controller.signal, deadline, timeoutMs }, async () => {
        const result = await task();
        checkPlayerWork();
        return result;
      }).finally(() => {
        clearTimeout(timer);
        this.flights.delete(key);
      });
      flight = { controller, promise, waiters: 0 };
      this.flights.set(key, flight);
    }

    flight.waiters += 1;
    const signal = caller?.signal;
    let onAbort: (() => void) | undefined;
    try {
      if (!signal) return await flight.promise;
      checkPlayerWork();
      const aborted = new Promise<never>((_, reject) => {
        onAbort = () => reject(new PlayerRequestTimeoutError());
        signal.addEventListener('abort', onAbort, { once: true });
      });
      const result = await Promise.race([flight.promise, aborted]);
      checkPlayerWork();
      return result;
    } finally {
      if (onAbort) signal?.removeEventListener('abort', onAbort);
      flight.waiters -= 1;
      if (flight.waiters === 0) {
        flight.controller.abort();
        await flight.promise.catch(() => undefined);
      }
    }
  }
}
