# 메인 페이지 DB 호출 정리

메인 페이지(`/`)에서 발생하는 데이터 조회를 API 기준으로 추적해, 실제 DB 접근 대상과 조건을 정리한 문서입니다.  
현 프로젝트는 Prisma(PostgreSQL)를 사용하며, 이전/이관 프로젝트에서 `supabase-js`로 옮길 때 참고할 수 있게 대응 예시를 함께 적었습니다.

## 1) 메인 페이지 호출 API 요약

| UI 위치 | 호출 API | 목적 | 실제 DB 테이블 |
|--------|----------|------|----------------|
| `page.tsx` | `/api/meta/trending` | 현재/이전 패치 메타 상승·하락 캐릭터 계산 | `CharacterStats` |
| `CharacterTierList` | `/api/character/mithril-rp-ranking` | 티어별 캐릭터 RP 순위 | `CharacterStats` |
| `GlobalStatsFilterBar` | `/api/patches/history` | 패치 선택 옵션 로드 | `PatchVersion` (fallback: `CharacterStats`) |

## 2) API별 DB 접근 상세

### A. `/api/meta/trending`

- 요청 파라미터:
  - `currentPatch` (default: `10.3`)
  - `previousPatch` (default: `10.2`)
  - `tier` (default: `DIAMOND`)
  - `limit` (default: `5`)
- DB 조회:
  - `getMetaStatsForPatch(prisma, currentPatch, tier)`
  - `getMetaStatsForPatch(prisma, previousPatch, tier)`
- 내부 쿼리 테이블: `CharacterStats`
- where 조건:
  - `patchVersion = currentPatch/previousPatch`
  - `tier = 요청 tier`
- select 컬럼:
  - `characterNum`, `bestWeapon`, `totalGames`, `totalWins`, `totalRP`, `totalTop3`, `averageRank`
- 후처리:
  - 같은 캐릭터(`characterNum`)를 무기 단위 행(`bestWeapon`)에서 캐릭터 단위로 합산
  - 승률/픽률/평균RP 계산 후 current vs previous delta 계산
  - `trendScore` 기준으로 상승/하락 상위 `limit` 리턴

### B. `/api/character/mithril-rp-ranking`

- 요청 파라미터:
  - `patchVersion` (없으면 `10.3`)
  - `tier` (default: `DIAMOND`)
- DB 조회 1 (사용 가능한 패치 탐색):
  - `getAvailablePatchVersionsForRanking(prisma, tier, characterCodesList)`
  - `CharacterStats`에서 `patchVersion` distinct 조회
- DB 조회 2 (실제 랭킹 데이터):
  - `getRankingStatsForPatch(prisma, patchVersion, tier, characterCodesList)`
  - `CharacterStats`에서 캐릭터 통계 조회
- where 조건:
  - `patchVersion = 선택 patchVersion`
  - `tier = 선택 tier`
  - `characterNum in 전체 캐릭터 코드`
- select 컬럼:
  - `characterNum`, `bestWeapon`, `totalGames`, `totalWins`, `totalRP`, `totalTop3`, `averageRank`
- 후처리:
  - 캐릭터 단위 합산 후 `averageRP` 내림차순 정렬
  - 요청 티어 데이터가 없으면 다른 티어(`DIAMOND → METEORITE → MITHRIL → IN1000`)로 폴백

### C. `/api/patches/history`

- 요청 파라미터:
  - `limit` (default: `10`)
  - `includeInactive` (default: `false`)
  - `startDate`, `endDate` (선택)
- 1차 DB 조회:
  - 테이블: `PatchVersion`
  - where:
    - 기본: `isActive = true`
    - `includeInactive=true`이면 active/inactive 전체
    - 필요 시 `startDate` 범위 필터(gte/lte)
  - order/take:
    - `startDate desc`, `take = limit`
- 2차 fallback 조회(1차 결과가 비어있을 때):
  - 테이블: `CharacterStats`
  - `patchVersion` distinct로 버전 목록 생성

## 3) 메인 페이지 관점 핵심 테이블

### `CharacterStats` (주 테이블)

- 메인 페이지에서 가장 많이 조회되는 테이블
- 핵심 필드:
  - 키/필터: `characterNum`, `tier`, `patchVersion`, `bestWeapon`
  - 합계값: `totalGames`, `totalWins`, `totalTop3`, `totalRP`
  - 평균값: `averageRank`, `averageRP`
  - 비율값: `winRate`, `pickRate`, `top3Rate` (일부 API는 재계산)

### `PatchVersion` (패치 목록 테이블)

- 패치 선택 dropdown 데이터 소스
- 핵심 필드:
  - `version`, `startDate`, `endDate`, `isActive`

## 4) supabase-js 전환 시 대응 가이드

현재 Prisma 쿼리는 대부분 단순 `findMany + 앱 레벨 집계` 구조라, `supabase-js`로도 동일한 흐름으로 이관 가능합니다.

### A. `CharacterStats` 패치/티어별 조회

```ts
const { data, error } = await supabase
  .from('CharacterStats')
  .select('characterNum,bestWeapon,totalGames,totalWins,totalRP,totalTop3,averageRank')
  .eq('patchVersion', patchVersion)
  .eq('tier', tier);
```

### B. `CharacterStats` distinct patchVersion 조회

```ts
const { data, error } = await supabase
  .from('CharacterStats')
  .select('patchVersion')
  .eq('tier', tier)
  .in('characterNum', characterCodesList);

const patchVersions = [...new Set((data ?? []).map((row) => row.patchVersion))];
```

### C. `PatchVersion` 목록 조회

```ts
const query = supabase
  .from('PatchVersion')
  .select('version,startDate,endDate,isActive')
  .order('startDate', { ascending: false })
  .limit(limit);

if (!includeInactive) {
  query.eq('isActive', true);
}
if (startDate) {
  query.gte('startDate', startDate);
}
if (endDate) {
  query.lte('startDate', endDate);
}

const { data, error } = await query;
```

## 5) 참고 소스 파일

- `frontend/src/app/page.tsx`
- `frontend/src/components/character/CharacterTierList.tsx`
- `frontend/src/components/filters/GlobalStatsFilterBar.tsx`
- `frontend/src/app/api/meta/trending/route.ts`
- `frontend/src/app/api/character/mithril-rp-ranking/route.ts`
- `frontend/src/app/api/patches/history/route.ts`
- `frontend/src/lib/stats-source.ts`
- `frontend/prisma/schema.prisma`
