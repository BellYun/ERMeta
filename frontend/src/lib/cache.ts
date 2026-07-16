/**
 * 3계층 캐싱 전략 — L2(CDN Edge) + L3(Browser HTTP) Cache-Control 헤더 유틸리티
 *
 * 데이터 분류 → 캐시 프리셋 매핑:
 *   A. 불변 (종료 패치)  → "immutable"
 *   B. 준정적 (패치 목록) → "slow"
 *   C. 준동적 (통계)     → "daily"
 *   C-1. 패치 단위 캐릭터 상세 통계 → "character-stats"
 *   D. 고카디널리티 사전집계 (trios)        → "frequent"
 *   E. 고카디널리티 사전집계 + 키 폭발 (trios-weapon) → "stats-long"
 *
 * D/E 는 source 가 사전 집계 테이블 (v2_CharacterTrio*) + tag-based invalidation
 * (revalidateTag) 으로 즉시 갱신되므로 TTL/SWR 을 길게 잡아 hit rate 극대화.
 * Stale window 는 invalidation 실패 시의 safety net.
 */

export type CachePreset =
  | "immutable"
  | "slow"
  | "daily"
  | "character-stats"
  | "frequent"
  | "stats-long";

const CACHE_CONTROL: Record<CachePreset, string> = {
  immutable: "public, max-age=86400, s-maxage=604800, stale-while-revalidate=86400",
  slow: "public, max-age=300, s-maxage=3600, stale-while-revalidate=600",
  daily: "public, max-age=300, s-maxage=1800, stale-while-revalidate=300",
  "character-stats": "public, max-age=300, s-maxage=43200, stale-while-revalidate=3600",
  // frequent (trios): L3 5m / L2 1h / SWR 7d — tag invalidation 의존, stale 7d 안전망
  frequent: "public, max-age=300, s-maxage=3600, stale-while-revalidate=604800",
  // stats-long (trios-weapon): L3 10m / L2 7d / SWR 7d — 최고 카디널리티, 가장 길게
  "stats-long": "public, max-age=600, s-maxage=604800, stale-while-revalidate=604800",
};

export function getCacheHeaders(preset: CachePreset): Record<string, string> {
  return { "Cache-Control": CACHE_CONTROL[preset] };
}

export const NO_CACHE_HEADERS: Record<string, string> = {
  "Cache-Control": "no-store",
};

/**
 * 5xx 응답 헤더 — 캐시 금지 + Retry-After 힌트.
 * 클라이언트 fetchWithRetry 가 이 힌트를 존중해 backoff 한다.
 */
export const SERVER_ERROR_HEADERS: Record<string, string> = {
  "Cache-Control": "no-store",
  "Retry-After": "5",
};

/**
 * L1(unstable_cache) hit/miss 추적용 latency 임계값.
 * DB 호출은 최소 수백 ms 이므로 50ms 미만이면 L1 hit 으로 간주.
 */
const CACHE_HIT_LATENCY_THRESHOLD_MS = 50;

export type CacheStatus = "HIT" | "MISS";

export function classifyCacheStatus(latencyMs: number): CacheStatus {
  return latencyMs < CACHE_HIT_LATENCY_THRESHOLD_MS ? "HIT" : "MISS";
}

export function withCacheObservability(
  baseHeaders: Record<string, string>,
  latencyMs: number
): Record<string, string> {
  return {
    ...baseHeaders,
    "X-Cache-Status": classifyCacheStatus(latencyMs),
    "X-Cache-Latency-Ms": String(Math.round(latencyMs)),
  };
}
