import { Logger } from '@nestjs/common';

/**
 * Circuit Breaker 상태 머신
 * CLOSED → OPEN (연속 실패 임계값 도달) → HALF_OPEN (복구 시간 경과) → CLOSED
 *
 * OPEN 상태에서는 factory 호출을 차단하고 stale 캐시를 반환한다.
 * HALF_OPEN 상태에서 1회 시도 후 성공하면 CLOSED, 실패하면 다시 OPEN.
 */

export enum CircuitState {
  CLOSED = 'CLOSED',
  OPEN = 'OPEN',
  HALF_OPEN = 'HALF_OPEN',
}

export interface CircuitBreakerOptions {
  /** 연속 실패 임계값 (기본 5) */
  failureThreshold?: number;
  /** OPEN → HALF_OPEN 전환까지 대기 시간 ms (기본 30초) */
  recoveryTimeMs?: number;
}

export class CircuitBreaker {
  private state = CircuitState.CLOSED;
  private failureCount = 0;
  private lastFailureTime = 0;
  private readonly logger = new Logger('CircuitBreaker');

  private readonly failureThreshold: number;
  private readonly recoveryTimeMs: number;

  constructor(options: CircuitBreakerOptions = {}) {
    this.failureThreshold = options.failureThreshold ?? 5;
    this.recoveryTimeMs = options.recoveryTimeMs ?? 30_000;
  }

  getState(): CircuitState {
    if (this.state === CircuitState.OPEN) {
      // 복구 시간이 지났으면 HALF_OPEN으로 전환
      if (Date.now() - this.lastFailureTime >= this.recoveryTimeMs) {
        this.state = CircuitState.HALF_OPEN;
        this.logger.log('Circuit: OPEN → HALF_OPEN');
      }
    }
    return this.state;
  }

  /** factory 실행 가능 여부 */
  canExecute(): boolean {
    const state = this.getState();
    return state === CircuitState.CLOSED || state === CircuitState.HALF_OPEN;
  }

  /** factory 성공 시 호출 */
  onSuccess(): void {
    if (this.state !== CircuitState.CLOSED) {
      this.logger.log(`Circuit: ${this.state} → CLOSED`);
    }
    this.failureCount = 0;
    this.state = CircuitState.CLOSED;
  }

  /** factory 실패 시 호출 */
  onFailure(): void {
    this.failureCount++;
    this.lastFailureTime = Date.now();

    if (this.failureCount >= this.failureThreshold) {
      if (this.state !== CircuitState.OPEN) {
        this.logger.warn(
          `Circuit: ${this.state} → OPEN (연속 ${this.failureCount}회 실패)`,
        );
      }
      this.state = CircuitState.OPEN;
    }
  }
}
