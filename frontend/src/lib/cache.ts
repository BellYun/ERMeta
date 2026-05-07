/**
 * 3계층 캐싱 전략 — L2(CDN Edge) + L3(Browser HTTP) Cache-Control 헤더 유틸리티
 *
 * 데이터 분류 → 캐시 프리셋 매핑:
 *   A. 불변 (종료 패치)  → "immutable"
 *   B. 준정적 (패치 목록) → "slow"
 *   C. 준동적 (통계)     → "daily"
 *   D. 고파라미터 (trios) → "frequent"
 *   E. 고파라미터 + 캐시 키 폭발 (trios-weapon) → "stats-long"
 *      24h CDN + 24h SWR. 24h stale 허용 (게임 통계 특성상 메타 변동 느림).
 */

export type CachePreset = "immutable" | "slow" | "daily" | "frequent" | "stats-long";

const CACHE_CONTROL: Record<CachePreset, string> = {
  immutable: "public, max-age=86400, s-maxage=604800, stale-while-revalidate=86400",
  slow: "public, max-age=300, s-maxage=3600, stale-while-revalidate=600",
  daily: "public, max-age=300, s-maxage=1800, stale-while-revalidate=300",
  frequent: "public, max-age=120, s-maxage=300, stale-while-revalidate=3600",
  "stats-long": "public, max-age=600, s-maxage=86400, stale-while-revalidate=86400",
};

export function getCacheHeaders(preset: CachePreset): HeadersInit {
  return { "Cache-Control": CACHE_CONTROL[preset] };
}

export const NO_CACHE_HEADERS: HeadersInit = {
  "Cache-Control": "no-store",
};
