# Supabase 저장 방식 효율 문제점 및 개선안

> 작성일: 2026-03-05
> 대상: ERMeta (프론트엔드 API) + ERmangho (수집 백엔드)
> PM_ANALYSIS.md의 P0/P1 이슈를 DB → API 레이어까지 연결해서 분석

---

## 1. 문제점 전체 요약

| # | 문제 | 위치 | 심각도 |
|---|------|------|--------|
| 1 | N+1 쿼리 - pickRate용 grandTotal 별도 조회 | `character/stats/[characterCode]/route.ts` | 높음 |
| 2 | Trio - `updatedAt` 필터 없이 5000 row 풀 스캔 | `stats/trios/route.ts` | 높음 |
| 3 | 티어 fallback 최대 4회 순차 DB 쿼리 | `mithril-rp-ranking/route.ts` | 중간 |
| 4 | `force-dynamic` 전면 사용 - 캐싱 전략 없음 | 모든 API route | 중간 |
| 5 | DB의 계산 필드를 무시하고 프론트에서 재계산 | `mithril-rp-ranking`, `trending` | 중간 |
| 6 | patches/history fallback - 전체 row 스캔 후 JS distinct | `patches/history/route.ts` | 중간 |
| 7 | CharacterTrio/TrioByWeapon에 `lastUpdated` 인덱스 없음 | `schema.prisma` | 중간 |
| 8 | Supabase 클라이언트 요청마다 재생성 | `lib/supabase.ts` | 낮음 |
| 9 | Trio JS 레이어 집계 (DB에서 처리 가능) | `stats/trios/route.ts` | 낮음 |

---

## 2. 문제 상세 분석

---

### [P0-A] N+1 쿼리: pickRate 계산용 grandTotal 별도 조회

**파일**: `frontend/src/app/api/character/stats/[characterCode]/route.ts`

**현재 코드**:
```typescript
// 1차 쿼리: 특정 캐릭터 행만
const { data, error } = await supabase
  .from("CharacterStats")
  .select("characterNum,bestWeapon,totalGames,totalWins,totalRP,totalTop3,averageRank")
  .eq("characterNum", characterCode)
  .eq("patchVersion", patchVersion)
  .eq("tier", tier)

// 2차 쿼리: pickRate 계산을 위해 패치+티어 전체 row 재조회
const { data: allRows } = await supabase
  .from("CharacterStats")
  .select("totalGames")       // ← 전체 캐릭터 수(최대 ~86개) 재조회
  .eq("patchVersion", patchVersion)
  .eq("tier", tier)

const grandTotal = (allRows ?? []).reduce((sum, r) => sum + r.totalGames, 0)
```

**문제**:
- 캐릭터 1개 조회에 DB 왕복이 2번 발생
- `patchVersion + tier` 조합당 최대 86 × 무기수 row를 매 요청마다 풀 스캔
- `pickRate`는 이미 `CharacterStats` 스키마에 DB 저장 필드로 존재 (`pickRate Float @default(0)`) → 그런데 수집 시 계산해서 저장 안 하고 있음 (PM_ANALYSIS P0 "pickRate 항상 0" 이슈와 연결됨)

**개선안**:

**옵션 A (단기 - 구조 변경 없음)**: 단일 쿼리로 병합
```typescript
// 1번 쿼리로 해당 패치+티어 전체를 가져온 뒤 JS에서 필터
const { data, error } = await supabase
  .from("CharacterStats")
  .select("characterNum,bestWeapon,totalGames,totalWins,totalRP,totalTop3,averageRank")
  .eq("patchVersion", patchVersion)
  .eq("tier", tier)

const grandTotal = (data ?? []).reduce((sum, r) => sum + r.totalGames, 0)
const rows = (data ?? []).filter(r => r.characterNum === characterCode)
// 이후 기존 로직 동일
```

**옵션 B (권장 - 근본 해결)**: ERmangho 수집 시 `pickRate` 정확히 계산해서 저장
```typescript
// collect-helpers.ts flushBatchAccumulators() 내부
// 배치 flush 시점에 동일 patchVersion+tier 전체 totalGames 합산 후
// 각 캐릭터의 pickRate = characterGames / grandTotal * 100 계산 후 upsert
```
→ 프론트 API에서는 DB의 `pickRate` 필드를 직접 사용. 추가 쿼리 제거.

---

### [P0-B] CharacterTrio - TTL 없는 5000 row 풀 스캔

**파일**: `frontend/src/app/api/stats/trios/route.ts`

**현재 코드**:
```typescript
let query = supabase
  .from("CharacterTrio")
  .select("character1,character2,character3,winRate,averageRP,totalGames,averageRank")
  .in("tier", DIAMOND_PLUS_TIERS)  // 4개 티어
  .limit(5000)                      // 필터 없이 최대 5000 row 수집

// JS 레이어에서 집계
const aggregated = aggregateByTrio(filteredRows)
aggregated.sort(...)
return aggregated.slice(0, limit)
```

**문제**:
1. `updatedAt` 필터 없음 → 6개월 전 오래된 데이터 포함 (PM_ANALYSIS P0 "Trio 데이터 오염")
2. 5000 row를 네트워크로 전송 후 JS에서 집계 → DB에서 처리했어야 할 작업
3. `CharacterTrio` 스키마에 `lastUpdated` 인덱스 없음 → 추가해도 풀 스캔

**스키마 현황** (`schema.prisma`):
```prisma
model CharacterTrio {
  // ...
  lastUpdated DateTime @default(now()) @updatedAt

  @@unique([character1, character2, character3, tier])
  // lastUpdated 인덱스 없음! ← 핵심 누락
}
```

**개선안**:

**Step 1**: 스키마에 인덱스 추가 (ERmangho)
```prisma
model CharacterTrio {
  // ...
  @@index([lastUpdated])  // 추가
  @@index([tier, lastUpdated])  // 복합 인덱스 추가
}

model CharacterTrioByWeapon {
  // ...
  @@index([lastUpdated])  // 추가
  @@index([tier, lastUpdated])  // 추가
}
```

**Step 2**: API에서 2주 TTL 필터 적용 (ERMeta)
```typescript
const TWO_WEEKS_AGO = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString()

let query = supabase
  .from("CharacterTrio")
  .select("character1,character2,character3,winRate,averageRP,totalGames,averageRank")
  .in("tier", DIAMOND_PLUS_TIERS)
  .gte("lastUpdated", TWO_WEEKS_AGO)  // ← TTL 필터 적용
  .limit(5000)
```

**Step 3 (장기)**: DB 레벨 집계로 이동
- Supabase RPC(PostgreSQL 함수)로 집계 + 정렬을 DB에서 처리
- 응답 row 수를 `limit` 개수로만 제한해서 전송

```sql
-- supabase/migrations/get_trio_stats.sql
CREATE OR REPLACE FUNCTION get_trio_stats(
  p_char1 INT,
  p_char2 INT,
  p_tiers TEXT[],
  p_limit INT,
  p_sort_by TEXT,
  p_ttl_days INT DEFAULT 14
)
RETURNS TABLE(...) AS $$
  SELECT
    character1, character2, character3,
    SUM(totalGames) AS totalGames,
    SUM("totalWins"::FLOAT / NULLIF("totalGames", 0) * "totalGames") / NULLIF(SUM("totalGames"), 0) AS "winRate",
    SUM("averageRP" * "totalGames") / NULLIF(SUM("totalGames"), 0) AS "averageRP"
  FROM "CharacterTrio"
  WHERE tier = ANY(p_tiers)
    AND "lastUpdated" >= NOW() - (p_ttl_days || ' days')::INTERVAL
    AND (p_char1 IS NULL OR character1 = p_char1 OR character2 = p_char1 OR character3 = p_char1)
    AND (p_char2 IS NULL OR character1 = p_char2 OR character2 = p_char2 OR character3 = p_char2)
  GROUP BY character1, character2, character3
  ORDER BY (CASE p_sort_by WHEN 'averageRP' THEN ... END) DESC
  LIMIT p_limit
$$ LANGUAGE SQL STABLE;
```

---

### [P1-A] 티어 Fallback - 최대 4회 순차 DB 쿼리

**파일**: `frontend/src/app/api/character/mithril-rp-ranking/route.ts`

**현재 코드**:
```typescript
const tierOrder = [requestedTier, ...TIER_FALLBACK_ORDER.filter(t => t !== requestedTier)]

for (const tier of tierOrder) {
  const rows = await fetchRankingStats(supabase, patchVersion, tier)  // 순차 await
  if (rows.length > 0) {
    rankings = buildRankings(rows)
    break
  }
  // 데이터 없으면 다음 티어 시도 → 최대 4번 DB 왕복
}
```

**문제**:
- 일반적으로 DIAMOND 티어에 데이터가 있으면 1회지만, 신규 패치 초기 또는 특수 케이스에서 최대 4회 순차 쿼리
- 각 쿼리가 완료되어야 다음 쿼리가 시작됨 (병렬 없음)

**개선안**:

```typescript
// 방법 1: 단일 쿼리로 모든 티어를 한 번에 조회 후 JS에서 선택
const { data, error } = await supabase
  .from("CharacterStats")
  .select("characterNum,bestWeapon,totalGames,totalWins,totalRP,totalTop3,averageRank,tier")
  .eq("patchVersion", patchVersion)
  .in("tier", TIER_FALLBACK_ORDER)

if (error || !data) return NextResponse.json({ rankings: [], patchVersion, tier: requestedTier })

// 우선순위 순으로 첫 번째 데이터 있는 티어 선택
const tierOrder = [requestedTier, ...TIER_FALLBACK_ORDER.filter(t => t !== requestedTier)]
let usedTier = requestedTier
let rows: StatRow[] = []

for (const tier of tierOrder) {
  const tierRows = data.filter(r => r.tier === tier)
  if (tierRows.length > 0) {
    rows = tierRows
    usedTier = tier
    break
  }
}

const rankings = buildRankings(rows)
```

→ DB 쿼리 4회 → 1회로 감소. 데이터 크기는 크지 않음 (최대 86캐릭터 × 무기수 × 4티어).

---

### [P1-B] force-dynamic 전면 사용 - 캐싱 전략 없음

**파일**: 모든 API route

**현재**:
```typescript
export const dynamic = "force-dynamic"  // 모든 route에 동일하게 적용
```

**문제**: 5분 주기로 수집되는 데이터인데 매 요청마다 DB 조회. Vercel의 Edge Cache, ISR, `revalidate` 전략이 전혀 활용되지 않음.

**개선안**: 데이터 변경 주기에 맞게 캐시 전략 차별화

```typescript
// patches/history/route.ts - 패치는 수주에 한 번 변경
export const revalidate = 3600 // 1시간 캐시

// mithril-rp-ranking/route.ts - 5분 주기 수집
export const revalidate = 300 // 5분 캐시

// meta/trending/route.ts - 5분 주기 수집
export const revalidate = 300 // 5분 캐시

// stats/trios/route.ts - 5분 주기 수집
export const revalidate = 300 // 5분 캐시

// character/stats/[characterCode]/route.ts - 5분 주기 수집
export const revalidate = 300 // 5분 캐시
```

**주의사항**:
- `revalidate` 사용 시 `searchParams` 기반 쿼리 파라미터가 캐시 키에 포함되어야 함
- Vercel에서 `?patchVersion=10.3&tier=DIAMOND` 등 각 파라미터 조합이 별도 캐시 항목
- ERmangho의 수집 완료 시 `revalidateTag` or `revalidatePath`를 호출해서 즉시 갱신하는 방식도 고려

```typescript
// ERmangho 수집 완료 후 ERMeta 캐시 무효화
// ERmangho collect API 내부
await fetch(`${process.env.ERMETA_URL}/api/revalidate`, {
  method: 'POST',
  headers: { 'x-revalidate-secret': process.env.REVALIDATE_SECRET },
  body: JSON.stringify({ tags: ['character-stats', 'trio-stats'] })
})
```

---

### [P1-C] DB 계산 필드를 무시하고 API에서 재계산

**파일**: `mithril-rp-ranking/route.ts`, `trending/route.ts`

**현재**: DB에 `winRate`, `averageRP`, `pickRate` 필드가 존재하지만, API에서 `totalGames`, `totalWins`, `totalRP`를 가져와서 직접 나눗셈으로 재계산.

```typescript
// DB 필드 선택
.select("characterNum,bestWeapon,totalGames,totalWins,totalRP,totalTop3,averageRank")

// API에서 재계산
winRate: r.totalGames > 0 ? ((r.totalWins ?? 0) / r.totalGames) * 100 : 0,
averageRP: r.totalGames > 0 ? (r.totalRP ?? 0) / r.totalGames : 0,
```

**문제**:
- 네트워크로 전송하는 payload가 불필요하게 큼 (raw sum 필드 + 계산에 안 쓰이는 필드)
- ERmangho에서 이미 정확히 계산해서 저장하는데 신뢰하지 않음
- pickRate만 DB 저장값이 0이라 신뢰 못하는 것인데, 나머지 필드도 덩달아 재계산

**개선안**:

```typescript
// pickRate 수집 버그 수정 후 (옵션 B 적용 후)
const { data, error } = await supabase
  .from("CharacterStats")
  .select("characterNum,bestWeapon,totalGames,winRate,pickRate,averageRP,top3Rate,averageRank")
  .eq("patchVersion", patchVersion)
  .eq("tier", tier)

// DB 저장값을 직접 사용
const rankings = data.map((r, i) => ({
  rank: i + 1,
  characterNum: r.characterNum,
  bestWeapon: r.bestWeapon,
  totalGames: r.totalGames,
  pickRate: r.pickRate,    // DB 저장값 직접 사용
  winRate: r.winRate,      // DB 저장값 직접 사용
  averageRP: r.averageRP,  // DB 저장값 직접 사용
  top3Rate: r.top3Rate,    // DB 저장값 직접 사용
}))
```

→ `totalWins`, `totalRP`, `totalTop3` 등 raw 합계 필드 전송 불필요 → payload 크기 감소.

---

### [P2-A] patches/history fallback - 전체 row 스캔 후 JS distinct

**파일**: `frontend/src/app/api/patches/history/route.ts`

**현재 fallback 코드**:
```typescript
// PatchVersion 테이블에 데이터 없으면 CharacterStats에서 추출
const { data: statsData } = await supabase
  .from("CharacterStats")
  .select("patchVersion")  // ← DISTINCT 없이 전체 row 조회 (수만 row)

const patches = [...new Set((statsData ?? []).map(r => r.patchVersion))]
  .filter(Boolean)
  .sort(...)
```

**문제**:
- `CharacterStats`는 캐릭터 수 × 티어 수 × 패치 수 × 무기 수 = 수천~수만 row
- 전체를 네트워크로 전송 후 JS `Set`으로 중복 제거
- `PatchVersion` 테이블이 제대로 관리되면 발생하지 않는 fallback이지만 실제로 자주 hit됨

**개선안**:
```typescript
// Supabase는 네이티브 DISTINCT 지원
// supabase-js에서는 .select('patchVersion') + group by가 직접 안 되므로 RPC 사용

// 방법 1: ERmangho에서 PatchVersion 테이블 관리 강화 (근본 해결)
// 수집 시작 시점에 현재 패치를 PatchVersion에 upsert하도록 보장

// 방법 2: Supabase RPC 활용
const { data } = await supabase.rpc('get_distinct_patch_versions', { p_limit: limit })

// 방법 3: 임시 - 최소한 인덱스 활용
// patchVersion 인덱스가 있으므로 index-only scan 가능하지만
// supabase-js에서 distinct 없이는 전체 row 반환
```

**권장**: ERmangho에서 배치 수집 시 `PatchVersion` 테이블 upsert를 보장하면 fallback 자체가 불필요해짐.

---

### [P3] Supabase 클라이언트 요청마다 재생성

**파일**: `frontend/src/lib/supabase.ts`

**현재**:
```typescript
export function createServerClient() {
  // 매 요청마다 새 인스턴스 생성 - 연결 풀 없음
  return createClient(url, key, { auth: { persistSession: false } })
}
```

**비교**: ERmangho는 `pg.Pool`로 연결 풀링 구현됨.

**문제**: Vercel Serverless에서 콜드 스타트 시 매번 새 TCP 연결. 웜 인스턴스에서는 재사용되지만 명시적 보장 없음.

**개선안**:
```typescript
// lib/supabase.ts
import { createClient, SupabaseClient } from "@supabase/supabase-js"

const globalForSupabase = globalThis as unknown as { supabase: SupabaseClient | undefined }

export function createServerClient(): SupabaseClient {
  if (globalForSupabase.supabase) return globalForSupabase.supabase

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!url || !key) throw new Error("Supabase environment variables are missing")

  const client = createClient(url, key, { auth: { persistSession: false } })

  if (process.env.NODE_ENV !== "production") globalForSupabase.supabase = client

  return client
}
```

---

## 3. 데이터 흐름 요약 (현재 vs 개선 후)

### 현재 `GET /api/character/stats/[characterCode]` 흐름

```
Client Request
    ↓
Next.js API Route (force-dynamic, 캐시 없음)
    ↓
Supabase Query 1: CharacterStats WHERE characterNum=X AND patchVersion=Y AND tier=Z
    ↓ (결과 대기)
Supabase Query 2: CharacterStats WHERE patchVersion=Y AND tier=Z (grandTotal 계산)
    ↓ (결과 대기)
JS: grandTotal 합산, 비율 재계산
    ↓
Response
```
**왕복**: DB × 2 + 불필요한 payload

### 개선 후 흐름

```
Client Request
    ↓
Next.js API Route (revalidate=300)
    ↓ [캐시 HIT → DB 쿼리 없음]
Supabase Query 1: CharacterStats WHERE patchVersion=Y AND tier=Z
    ↓
JS: 필터(characterNum=X), 이미 계산된 pickRate/winRate/averageRP 직접 사용
    ↓
Response (캐시 저장)
```
**왕복**: DB × 1 (또는 0 if 캐시 hit) + payload 경량화

---

### 현재 `GET /api/stats/trios` 흐름

```
Client Request
    ↓
Next.js API Route (force-dynamic)
    ↓
Supabase Query: CharacterTrio WHERE tier IN (4개) LIMIT 5000
    ↓ (5000 row 네트워크 전송)
JS: 필터(excluded characters), aggregateByTrio(), sort(), slice()
    ↓
Response (실제 필요한 건 100 row)
```

### 개선 후 흐름

```
Client Request
    ↓
Next.js API Route (revalidate=300)
    ↓ [캐시 HIT → DB 쿼리 없음]
Supabase RPC: get_trio_stats(char1, char2, tiers, limit, sortBy, ttl=14)
    ↓ (필요한 100 row만 전송)
Response
```

---

## 4. 우선순위 및 구현 순서

### 즉시 (공수 S - 코드 변경만)

| 작업 | 파일 | 예상 효과 |
|------|------|----------|
| character/stats - 2회 쿼리 → 1회로 통합 | `character/stats/[characterCode]/route.ts` | DB 왕복 50% 감소 |
| mithril-rp-ranking - 순차 fallback → 단일 쿼리 | `mithril-rp-ranking/route.ts` | 최악 케이스 4회 → 1회 |
| trios - `lastUpdated >= 2주` 필터 추가 | `stats/trios/route.ts` | 데이터 오염 즉시 해결 |
| force-dynamic → revalidate 설정 | 모든 route | 캐시 hit율 향상 |

### 단기 (공수 M - 스키마 + 코드 변경)

| 작업 | 위치 | 예상 효과 |
|------|------|----------|
| CharacterTrio/TrioByWeapon - `lastUpdated` 인덱스 추가 | ERmangho `schema.prisma` + migration | TTL 필터 성능 보장 |
| ERmangho에서 pickRate 올바르게 계산 저장 | `collect-helpers.ts` flush 로직 | API N+1 근본 해결 |
| ERmangho 수집 완료 시 ERMeta revalidate 호출 | ERmangho collect route | 캐시 정확도 향상 |
| Supabase 클라이언트 싱글톤화 | `lib/supabase.ts` | 연결 재사용 |

### 중기 (공수 L - DB 함수 + 구조 변경)

| 작업 | 위치 | 예상 효과 |
|------|------|----------|
| Trio 집계 Supabase RPC로 이동 | DB migration + route 변경 | 5000 row 전송 → limit row만 전송 |
| patches/history fallback 제거 (PatchVersion 관리 강화) | ERmangho collect 로직 | fallback 쿼리 제거 |

---

## 5. pickRate 수집 버그 수정 방법 (PM_ANALYSIS P0 연결)

`collect-helpers.ts`의 `flushBatchAccumulators` 함수에서 CharacterStats upsert 시:

```typescript
// 현재: pickRate를 계산하지 않고 0 또는 기존값 유지

// 개선: flush 시점에 동일 patchVersion+tier의 grandTotal 계산 후 업데이트
// Phase 1 - flush 완료 후 별도 UPDATE 쿼리
async function recalculatePickRates(patchVersion: string, tier: TierGroup) {
  await prisma.$executeRaw`
    UPDATE "CharacterStats" cs
    SET "pickRate" =
      CASE grand.total
        WHEN 0 THEN 0
        ELSE cs."totalGames"::FLOAT / grand.total * 100
      END
    FROM (
      SELECT SUM("totalGames") AS total
      FROM "CharacterStats"
      WHERE "patchVersion" = ${patchVersion}
        AND "tier" = ${tier}::\"TierGroup\"
    ) grand
    WHERE cs."patchVersion" = ${patchVersion}
      AND cs."tier" = ${tier}::\"TierGroup\"
  `
}
```

이렇게 하면 PM_ANALYSIS P0 "pickRate 항상 0" 이슈와 API N+1 쿼리 이슈가 동시에 해결됨.

---

## 6. 결론

현재 가장 긴급한 개선은 다음 3가지:

1. **CharacterTrio TTL 필터** - 코드 한 줄 추가로 데이터 오염 즉시 차단
2. **character/stats N+1 → 단일 쿼리** - 캐릭터 분석 페이지 응답 속도 개선
3. **revalidate 설정** - 5분 수집 주기와 동기화된 캐싱으로 DB 부하 대폭 감소

pickRate 수집 버그는 ERmangho 수정이 필요하지만, 수정 완료 전까지는 API 레이어에서 grandTotal을 1회 쿼리로 통합하는 임시 조치로 N+1은 해소 가능하다.
