# ERMeta 캐싱 전략 (서비스 특성 기반)

> 이 문서는 ERMeta 서비스의 데이터 특성과 접근 패턴을 분석하고,
> **Phase 1 (현재 구조)** 와 **Phase 2 (서버 고도화)** 시나리오로 나눠 최적 캐싱 전략을 정의한다.

---

## 1. 서비스 특성 분석

### 1-1. 데이터 갱신 주기

이터널리턴은 **패치 기반 게임**이다. 데이터 변경 주기는 크게 두 레이어로 나뉜다.

```
게임 패치 사이클 (~2주)
└── 패치 내 통계 누적 (매일 또는 주기적 집계)
    └── 유저 세션 동안 UI 상태 (실시간 없음, 새로고침 기준)
```

| 데이터 종류 | 변경 주기 | 변경 트리거 |
|------------|---------|------------|
| L10n 텍스트, 특성 이름 | 패치 출시 시 (2~4주) | BSER API 업데이트 |
| 패치 목록 | 새 패치 출시 시 | DB `PatchVersion` 행 추가 |
| **종료된 패치** 캐릭터 통계 | **영원히 불변** | 없음 |
| **현재 패치** 캐릭터 통계 | 매일 (집계 파이프라인) | Supabase `CharacterStats` 업데이트 |
| 트렌딩 분석 | 현재 패치 통계 갱신 시 | 위와 동일 |
| 트리오 조합 통계 | 매일 | 위와 동일 |
| 특성 빌드 통계 | 매일 | 위와 동일 |

### 1-2. 트래픽 패턴

- **완전 공개 데이터**: 사용자별로 다른 데이터 없음 → 캐시 공유율 극대화 가능
- **Read-heavy**: 모든 요청은 조회만, 쓰기는 없음 (집계 파이프라인은 별도)
- **핫 스팟 존재**: `patchVersion=현재패치&tier=DIAMOND` 조합이 전체 트래픽의 대부분
- **패치 전환 시 트래픽 급증**: 새 패치 출시 후 다수 유저가 동시에 새 메타 확인

### 1-3. 현재 구조의 문제점

```
현재 상황                          문제
─────────────────────────────      ──────────────────────────────────────────
모든 통계 API: force-dynamic    →  매 요청마다 Supabase 쿼리 발생
cache: "no-store"               →  Next.js fetch 캐시 미활용
클라이언트: 매번 fresh fetch    →  동일 필터 변경 시 중복 요청
트리오 API: 5000행 fetch 후      →  서버→클라이언트 전송 과다
  클라이언트 집계
전체 패치 병렬 fetch             →  패치 수 증가 시 부하 선형 증가
```

---

## 2. 데이터 분류 (캐싱 전략 기반)

```
A. 불변 (Immutable)
   ├── 종료된 패치의 캐릭터/빌드/트리오 통계
   ├── L10n 텍스트 (언어별)
   └── 특성 이름

B. 준정적 (Slow-changing: 2주에 1회)
   ├── 패치 목록 (PatchVersion)
   └── 현재 패치 확정 랭킹 (다음날 갱신)

C. 준동적 (Daily-changing: 매일 갱신)
   ├── 현재 패치 캐릭터 티어 랭킹
   ├── 트렌딩 분석 (상승/하강)
   ├── 특성 빌드 통계
   └── 트리오 조합 통계

D. 유저 파생 (세션 내 파생)
   └── 티어 배지 (assignTier): 클라이언트 계산, 캐싱 불필요
```

---

## 3. Phase 1 — 현재 구조 (Next.js + Supabase만 사용)

### 3-1. 적용 전략 개요

```
┌─────────────────────────────────────────────────────────────┐
│  Browser (클라이언트 캐시)                                   │
│  SWR / React Query: staleTime + dedupe                      │
└────────────────────────┬────────────────────────────────────┘
                         │ HTTP
┌────────────────────────▼────────────────────────────────────┐
│  Next.js API Routes                                         │
│  Cache-Control 헤더 + Next.js fetch() revalidate            │
└────────────────────────┬────────────────────────────────────┘
                         │ Supabase SDK
┌────────────────────────▼────────────────────────────────────┐
│  Supabase (PostgreSQL)                                      │
│  Connection Pooling (pgBouncer)                             │
└─────────────────────────────────────────────────────────────┘
```

### 3-2. API Route별 Cache-Control 설정

#### A. 불변 데이터

```typescript
// /api/bser/l10n/[language]/route.ts
// /api/traits/names/route.ts
export const revalidate = 86400; // 24시간 (현재 3600 → 상향 가능)

return NextResponse.json(data, {
  headers: {
    "Cache-Control": "public, max-age=86400, stale-while-revalidate=3600",
  },
});
```

**종료된 패치 통계** (character/stats, builds/traits, stats/trios):
- URL에 `patchVersion` 파라미터가 현재 패치가 아닌 경우 불변 처리

```typescript
// route.ts에서 패치 상태 판별 후 분기
const isCurrentPatch = patchVersion === latestPatch;
const maxAge = isCurrentPatch ? 1800 : 604800; // 30분 vs 7일

return NextResponse.json(data, {
  headers: {
    "Cache-Control": `public, max-age=${maxAge}, stale-while-revalidate=300`,
  },
});
```

#### B. 준정적 데이터 (2주 주기)

```typescript
// /api/patches/history/route.ts
// force-dynamic 제거, revalidate 추가
export const revalidate = 3600; // 1시간

return NextResponse.json(data, {
  headers: {
    "Cache-Control": "public, max-age=3600, stale-while-revalidate=300",
  },
});
```

#### C. 준동적 데이터 (매일 갱신)

통계 집계가 하루 1~2회 실행된다면, TTL을 집계 주기에 맞춘다.

```typescript
// /api/character/mithril-rp-ranking/route.ts
// /api/meta/trending/route.ts
// /api/builds/traits/main/route.ts, /options/route.ts
// /api/stats/trios/route.ts

export const revalidate = 1800; // 30분 (집계 주기 대비 보수적)

return NextResponse.json(data, {
  headers: {
    // s-maxage: CDN/프록시 캐시 / max-age: 브라우저 캐시
    "Cache-Control": "public, s-maxage=1800, max-age=300, stale-while-revalidate=300",
  },
});
```

> **stale-while-revalidate**: 캐시 만료 후에도 낡은 데이터를 즉시 반환하면서 백그라운드에서 갱신.
> 사용자는 대기 없이 응답 받고, 다음 요청부터 새 데이터 제공.

### 3-3. 클라이언트 캐싱 (SWR 도입)

현재 Client Component들은 `useEffect + fetch`를 직접 사용. 탭 전환, 뒤로가기 시 재요청 발생.

**SWR 적용 패턴:**

```typescript
// GlobalFilter, TierRankingTable 등에서
import useSWR from "swr";

const fetcher = (url: string) => fetch(url).then(r => r.json());

// 패치 목록: 세션 내 불변 → 재검증 없음
const { data: patchData } = useSWR("/api/patches/history?limit=10", fetcher, {
  revalidateOnFocus: false,
  revalidateOnReconnect: false,
  dedupingInterval: 3600_000, // 1시간 내 중복 요청 방지
});

// 랭킹 데이터: 30분 stale
const { data: rankingData } = useSWR(
  patch && tier ? `/api/character/mithril-rp-ranking?patchVersion=${patch}&tier=${tier}` : null,
  fetcher,
  {
    revalidateOnFocus: false,
    dedupingInterval: 1800_000, // 30분 내 중복 요청 방지
  }
);
```

**효과:**
- 같은 URL에 대한 중복 요청 자동 차단 (dedupe)
- 탭 전환 시 캐시 데이터 즉시 표시 (빠른 UX)
- GlobalFilter에서 같은 패치/티어로 재선택 시 네트워크 요청 없음

### 3-4. Next.js Server Component ISR

```typescript
// TrendingSection.tsx
async function fetchTrending(currentPatch: string, previousPatch: string, tier: string) {
  const res = await fetch(`${baseUrl}/api/meta/trending?...`, {
    // cache: "no-store" 제거 → next.revalidate 사용
    next: { revalidate: 1800 }, // 30분 ISR
  });
  return res.json();
}
```

### 3-5. 종료된 패치 TS 스냅샷 (선택적 최적화)

**CharacterAnalysisClient**는 `Promise.all(patches.map(...))` 으로 전체 패치를 병렬 fetch.
패치 수가 늘수록 요청이 증가하므로 종료된 패치는 빌드타임 정적 파일로 전환 가능.

```
현재: 패치 10개 × API 요청 = Supabase 쿼리 10회
최적: 종료된 패치 9개 = import { stats_10_1 } from "@/data/snapshots/10.1"
      현재 패치 1개 = API 요청 1회
```

스크립트: `scripts/export-patch-stats.ts` (패치 종료 시 1회 실행, 참고: API_CACHING_STRATEGY.md)

### 3-6. Phase 1 적용 우선순위

```
우선순위 1 (즉시 적용, 코드 변경 최소):
  → API route에 Cache-Control 헤더 추가
  → force-dynamic → revalidate = N 변경
  → TrendingSection fetch에서 cache:"no-store" 제거

우선순위 2 (컴포넌트 리팩터 필요):
  → SWR 설치 및 useEffect+fetch → useSWR 전환

우선순위 3 (선택적, 운영 편의 고려):
  → 종료된 패치 TS 스냅샷 생성 스크립트 + 자동화
```

---

## 4. Phase 2 — 서버 고도화 (Redis + CDN + 배경 작업)

### 4-1. 아키텍처 개요

```
┌───────────────────────────────────────────────────────────────┐
│  CDN Edge (Cloudflare / Vercel Edge Network)                  │
│  정적/준정적 응답을 엣지에서 직접 서빙                          │
│  Cache-Control: s-maxage + stale-while-revalidate             │
└──────────────────────┬────────────────────────────────────────┘
                       │ MISS만 원서버 도달
┌──────────────────────▼────────────────────────────────────────┐
│  Next.js App Server                                           │
│                                                               │
│  ┌──────────────┐    ┌──────────────────────────────────┐    │
│  │ API Routes   │───▶│ Redis (캐시 레이어)               │    │
│  │              │    │  - 집계 결과 캐시                  │    │
│  │              │◀───│  - 패치별 캐시 키 네임스페이스     │    │
│  └──────────────┘    └──────────────┬───────────────────┘    │
└─────────────────────────────────────│─────────────────────────┘
                                      │ MISS만 쿼리
┌─────────────────────────────────────▼─────────────────────────┐
│  Supabase (PostgreSQL)                                        │
│  ┌──────────────────────────────────────────────────────────┐ │
│  │ Materialized Views (pre-aggregated)                      │ │
│  │  - mv_character_ranking_{patch}_{tier}                   │ │
│  │  - mv_trending_{current}_{previous}_{tier}               │ │
│  └──────────────────────────────────────────────────────────┘ │
└───────────────────────────────────────────────────────────────┘
                       ↑
┌──────────────────────┴────────────────────────────────────────┐
│  Background Jobs (Cron)                                       │
│  - 매일 통계 집계 파이프라인                                     │
│  - Materialized View REFRESH                                  │
│  - Redis 캐시 예열 (cache warming)                            │
│  - 패치 종료 시 TS 스냅샷 자동 생성                             │
└───────────────────────────────────────────────────────────────┘
```

### 4-2. Redis 캐싱 레이어

#### 캐시 키 설계

```
ermeta:ranking:{patchVersion}:{tier}           TTL: 1800s
ermeta:trending:{currentPatch}:{prevPatch}:{tier}  TTL: 1800s
ermeta:stats:{characterCode}:{patchVersion}:{tier}  TTL: 현재패치 1800s / 종료 ∞
ermeta:builds:main:{characterCode}:{patchVersion}:{tier}:{weapon?}  TTL: 1800s
ermeta:trios:{char1?}:{char2?}:{sortBy}        TTL: 3600s
ermeta:patches:history                          TTL: 3600s
ermeta:l10n:{language}                         TTL: 86400s
ermeta:traits:names                            TTL: 86400s
```

#### API Route 캐시 래퍼 패턴

```typescript
// lib/cache.ts
import { Redis } from "@upstash/redis"; // Upstash Redis (서버리스 친화적)

const redis = Redis.fromEnv();

export async function withCache<T>(
  key: string,
  ttl: number,
  fetcher: () => Promise<T>
): Promise<T> {
  const cached = await redis.get<T>(key);
  if (cached !== null) return cached;

  const fresh = await fetcher();
  await redis.set(key, fresh, { ex: ttl });
  return fresh;
}

// /api/character/mithril-rp-ranking/route.ts 적용 예
export async function GET(request: Request) {
  const { patchVersion, tier } = parseParams(request);
  const key = `ermeta:ranking:${patchVersion}:${tier}`;
  const ttl = isCurrentPatch(patchVersion) ? 1800 : 0; // 종료 패치 = 무기한

  const data = await withCache(key, ttl, () =>
    fetchRankingFromSupabase(patchVersion, tier)
  );

  return NextResponse.json(data, {
    headers: { "Cache-Control": "public, s-maxage=1800, stale-while-revalidate=300" },
  });
}
```

### 4-3. DB 레이어 최적화: Materialized View

현재 모든 집계(averageRP, pickRate, winRate)가 API 서버에서 수행됨.
DB에서 미리 집계해두면 쿼리 부하 대폭 감소.

```sql
-- 캐릭터 랭킹 사전 집계
CREATE MATERIALIZED VIEW mv_character_ranking AS
SELECT
  patchVersion,
  tier,
  characterNum,
  bestWeapon,
  SUM(totalGames) AS totalGames,
  SUM(totalWins)::FLOAT / NULLIF(SUM(totalGames), 0) * 100 AS winRate,
  SUM(totalRP)::FLOAT / NULLIF(SUM(totalGames), 0) AS averageRP,
  SUM(totalTop3)::FLOAT / NULLIF(SUM(totalGames), 0) * 100 AS top3Rate
FROM "CharacterStats"
GROUP BY patchVersion, tier, characterNum, bestWeapon;

CREATE UNIQUE INDEX ON mv_character_ranking (patchVersion, tier, characterNum, bestWeapon);

-- 집계 파이프라인 완료 후 갱신
REFRESH MATERIALIZED VIEW CONCURRENTLY mv_character_ranking;
```

**효과**: 5000행 full-scan 후 클라이언트 집계 → DB에서 수십 행 반환

### 4-4. 배경 작업 (Background Jobs)

```typescript
// app/api/cron/refresh-cache/route.ts
// Vercel Cron / GitHub Actions 등으로 매일 새벽 실행

export async function POST(req: Request) {
  // 1. 인증
  if (req.headers.get("Authorization") !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response("Unauthorized", { status: 401 });
  }

  const latestPatch = await getLatestPatch();

  // 2. Materialized View 갱신 요청 (Supabase RPC)
  await supabase.rpc("refresh_ranking_views");

  // 3. Redis 핫 키 예열 (cache warming)
  const tiers = ["DIAMOND", "METEORITE", "MITHRIL", "IN1000"];
  await Promise.all(
    tiers.map(async (tier) => {
      // 기존 캐시 삭제
      await redis.del(`ermeta:ranking:${latestPatch}:${tier}`);
      // 새 데이터로 채우기
      const data = await fetchRankingFromSupabase(latestPatch, tier);
      await redis.set(`ermeta:ranking:${latestPatch}:${tier}`, data, { ex: 1800 });
    })
  );

  return NextResponse.json({ ok: true, refreshed: latestPatch });
}
```

**cron schedule (vercel.json):**
```json
{
  "crons": [
    {
      "path": "/api/cron/refresh-cache",
      "schedule": "0 4 * * *"
    }
  ]
}
```

### 4-5. 패치 전환 시 캐시 무효화

새 패치 출시 시 기존 캐시가 낡은 데이터를 반환하지 않도록 명시적 무효화.

```typescript
// app/api/cron/new-patch/route.ts
// 새 패치 DB 삽입 후 호출

export async function POST(req: Request) {
  const { newPatch } = await req.json();

  // 패치 목록 캐시 무효화
  await redis.del("ermeta:patches:history");

  // 기존 현재 패치의 TTL을 무기한으로 전환 (종료 패치 처리)
  const previousPatch = await getPreviousPatch();
  const rankingKeys = await redis.keys(`ermeta:ranking:${previousPatch}:*`);
  // 종료 패치는 TTL 제거 (영구 캐시)
  await Promise.all(rankingKeys.map(key => redis.persist(key)));

  // On-demand Revalidation (Next.js ISR 강제 갱신)
  await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/revalidate`, {
    method: "POST",
    headers: { "x-revalidate-secret": process.env.REVALIDATE_SECRET! },
    body: JSON.stringify({ tags: ["ranking", "trending"] }),
  });

  return NextResponse.json({ ok: true });
}
```

### 4-6. CDN 엣지 캐싱 전략

Vercel Edge Network 또는 Cloudflare를 사용할 경우, API 응답의 `Cache-Control` 헤더가 CDN에서 직접 처리됨.

```typescript
// 등급별 Cache-Control 헤더
const cacheHeaders = {
  immutable: "public, max-age=31536000, immutable",                          // 1년: 종료 패치
  slowChanging: "public, s-maxage=3600, max-age=300, stale-while-revalidate=300",  // 1시간: l10n, 패치 목록
  dailyChanging: "public, s-maxage=1800, max-age=60, stale-while-revalidate=300",  // 30분: 통계
  realtime: "public, s-maxage=300, max-age=0, stale-while-revalidate=60",         // 5분: 트렌딩
};
```

> `s-maxage`: CDN 캐시 TTL
> `max-age`: 브라우저 캐시 TTL
> `stale-while-revalidate`: CDN이 백그라운드 갱신하는 동안 낡은 데이터 서빙 허용 시간

---

## 5. 전략 비교 요약

### 5-1. Phase별 적용 범위

| 캐싱 레이어 | Phase 1 | Phase 2 |
|------------|--------|--------|
| **브라우저** | `Cache-Control` 헤더 | `Cache-Control` 헤더 |
| **클라이언트 상태** | SWR dedupingInterval | SWR + React Query |
| **CDN/엣지** | Vercel Edge 기본 동작 | Cloudflare 명시적 룰 |
| **Next.js ISR** | `revalidate = N` | On-demand Revalidation |
| **서버 메모리** | — | Redis (Upstash) |
| **DB 집계** | API 서버에서 계산 | Materialized View |
| **캐시 예열** | — | Cron Job |
| **캐시 무효화** | TTL 만료 | 패치 전환 webhook |

### 5-2. API별 최종 TTL 전략

| API | 현재 패치 | 종료된 패치 | Phase 2 추가 |
|-----|---------|-----------|------------|
| `patches/history` | 3600s | — | Redis + 패치 전환 시 즉시 무효화 |
| `character/stats/[code]` | 1800s | 불변 (7일+) | Redis 영구 캐시 (종료 패치) |
| `character/mithril-rp-ranking` | 1800s | 불변 (7일+) | Cron 예열 + Mat.View |
| `meta/trending` | 1800s | — | Cron 예열 + Mat.View |
| `builds/traits/main` | 1800s | 불변 (7일+) | Redis |
| `builds/traits/options` | 1800s | 불변 (7일+) | Redis |
| `stats/trios` | 3600s | 불변 (7일+) | Redis |
| `bser/l10n/[lang]` | 86400s | — | CDN immutable |
| `traits/names` | 86400s | — | CDN immutable |

### 5-3. 예상 성능 개선

| 지표 | 현재 | Phase 1 | Phase 2 |
|-----|-----|--------|--------|
| 메인 페이지 Supabase 쿼리/분 | 높음 | ~70% 감소 | ~95% 감소 |
| 캐릭터 분석 로딩 시간 | 기준 | ~30% 감소 | ~60% 감소 |
| 패치 전환 시 DB 부하 | 스파이크 | 스파이크 | Cron 분산 |
| 종료 패치 재조회 비용 | 매 요청 | TTL 이후 1회 | 거의 0 |

---

## 6. 구현 권장 순서

```
Phase 1 (즉시 적용):
  1. API Route: force-dynamic 제거 + Cache-Control 헤더 추가 + revalidate 값 설정
  2. TrendingSection: cache:"no-store" → next: { revalidate: 1800 }
  3. SWR 설치 후 GlobalFilter, TierRankingTable의 useEffect+fetch 교체
  4. 종료 패치 판별 로직 추가 (isCurrentPatch 유틸)

Phase 2 (선택적, 트래픽 증가 시):
  1. Upstash Redis 연결 + withCache 유틸 구현
  2. 주요 API(ranking, trending)에 Redis 레이어 적용
  3. Supabase Materialized View 생성 + REFRESH 스케줄
  4. Cron Job으로 캐시 예열 + 패치 전환 webhook 구현
```

---

## 참고 문서

- [API_CACHING_STRATEGY.md](./API_CACHING_STRATEGY.md) — API별 Cache-Control vs TS 스냅샷 판단 기준
- [Next.js Caching Docs](https://nextjs.org/docs/app/building-your-application/caching)
- [Upstash Redis for Next.js](https://upstash.com/docs/redis/quickstarts/nextjs)
- [SWR 공식 문서](https://swr.vercel.app/)
