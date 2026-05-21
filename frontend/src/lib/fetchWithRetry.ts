/**
 * 재시도 정책이 적용된 fetch 헬퍼.
 *
 * - 5xx(500/502/503/504), 408/425/429, 네트워크 오류, per-attempt timeout 만 재시도
 * - 4xx, AbortError 는 즉시 실패
 * - Exponential backoff + jitter (1s → 2s → 4s, ±50% jitter, 상한 15s)
 * - 서버 Retry-After 헤더가 있으면 그것을 우선
 * - 외부 AbortSignal 은 재시도 대기 중에도 즉시 중단
 */

export class FetchHttpError extends Error {
  constructor(
    public readonly status: number,
    public readonly body: unknown,
    public readonly retryAfterMs: number | null
  ) {
    super(`HTTP ${status}`);
    this.name = "FetchHttpError";
  }
}

export class FetchRetriesExhaustedError extends Error {
  constructor(
    public readonly lastError: unknown,
    public readonly attempts: number
  ) {
    super(`Retries exhausted after ${attempts} attempts`);
    this.name = "FetchRetriesExhaustedError";
  }
}

export interface FetchWithRetryOptions extends Omit<RequestInit, "signal"> {
  /** 재시도 최대 횟수 (기본 2 → 총 3회 시도) */
  maxRetries?: number;
  /** 최초 backoff(ms); 이후 exponential (기본 1000) */
  baseDelayMs?: number;
  /** 한 시도당 timeout(ms) (기본 10_000) */
  timeoutMs?: number;
  /** 외부 abort signal — unmount/deps 변경 시 즉시 중단 */
  signal?: AbortSignal;
}

const RETRYABLE_STATUS = new Set([408, 425, 429, 500, 502, 503, 504]);
const BACKOFF_CAP_MS = 15_000;

function parseRetryAfterHeader(value: string | null): number | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  const seconds = Number(trimmed);
  if (Number.isFinite(seconds) && seconds >= 0) return seconds * 1000;
  const dateMs = Date.parse(trimmed);
  if (!Number.isNaN(dateMs)) {
    const delta = dateMs - Date.now();
    return delta > 0 ? delta : 0;
  }
  return null;
}

function shouldRetry(err: unknown): boolean {
  if (err instanceof FetchHttpError) return RETRYABLE_STATUS.has(err.status);
  if (err instanceof DOMException) {
    if (err.name === "AbortError") return false;
    if (err.name === "TimeoutError") return true;
  }
  if (err instanceof TypeError) return true;
  return false;
}

function computeBackoff(attempt: number, baseMs: number, retryAfterMs: number | null): number {
  if (retryAfterMs != null) return Math.min(retryAfterMs, BACKOFF_CAP_MS);
  const exp = baseMs * Math.pow(2, attempt);
  const jitter = exp * (0.5 + Math.random() * 0.5);
  return Math.min(jitter, BACKOFF_CAP_MS);
}

function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new DOMException("Aborted", "AbortError"));
      return;
    }
    const id = setTimeout(() => {
      signal?.removeEventListener("abort", onAbort);
      resolve();
    }, ms);
    const onAbort = () => {
      clearTimeout(id);
      reject(new DOMException("Aborted", "AbortError"));
    };
    signal?.addEventListener("abort", onAbort, { once: true });
  });
}

export async function fetchWithRetry<T = unknown>(
  url: string,
  options: FetchWithRetryOptions = {}
): Promise<T> {
  const {
    maxRetries = 2,
    baseDelayMs = 1000,
    timeoutMs = 10_000,
    signal: externalSignal,
    ...init
  } = options;

  let lastError: unknown;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    if (externalSignal?.aborted) {
      throw new DOMException("Aborted", "AbortError");
    }

    const timeoutSignal = AbortSignal.timeout(timeoutMs);
    const signal = externalSignal
      ? AbortSignal.any([externalSignal, timeoutSignal])
      : timeoutSignal;

    let retryAfterMs: number | null = null;

    try {
      const res = await fetch(url, { ...init, signal });

      if (res.ok) {
        return (await res.json()) as T;
      }

      retryAfterMs = parseRetryAfterHeader(res.headers.get("Retry-After"));
      let body: unknown = null;
      try {
        body = await res.json();
      } catch {
        // 비-JSON body 는 무시
      }
      throw new FetchHttpError(res.status, body, retryAfterMs);
    } catch (err) {
      lastError = err;

      if (externalSignal?.aborted) throw err;

      const retryable = shouldRetry(err);
      const isLastAttempt = attempt === maxRetries;

      if (!retryable) throw err;
      if (isLastAttempt) {
        throw new FetchRetriesExhaustedError(err, attempt + 1);
      }

      const errRetryAfter = err instanceof FetchHttpError ? err.retryAfterMs : null;
      const delay = computeBackoff(attempt, baseDelayMs, errRetryAfter);
      await sleep(delay, externalSignal);
    }
  }

  throw lastError;
}
