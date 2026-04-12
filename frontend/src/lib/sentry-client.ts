/**
 * 경량 Sentry 클라이언트 헬퍼.
 * CDN 로더 스크립트가 window.Sentry를 노출하므로 번들에 SDK를 포함하지 않는다.
 */

declare global {
  interface Window {
    Sentry?: SentryLike;
  }
}

interface SentryLike {
  captureException(error: unknown, hint?: { tags?: Record<string, string>; extra?: Record<string, unknown> }): void
}

function getSentry(): SentryLike | null {
  if (typeof window !== "undefined" && window.Sentry) {
    return window.Sentry
  }
  return null
}

export function captureException(
  error: unknown,
  options?: { tags?: Record<string, string>; extra?: Record<string, unknown> },
) {
  getSentry()?.captureException(error, options)
}
