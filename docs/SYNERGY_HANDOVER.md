# 캐릭터 조합 페이지(`/synergy`) 인수인계서

이 문서는 `/synergy` 페이지 유지보수/이관용 문서입니다.  
핵심은 **어떤 API를 호출하는지**와 **응답을 화면에서 어떻게 소비하는지**입니다.

## 1. 페이지 개요

- 라우트: `/synergy`
- 엔트리 파일: `frontend/src/app/synergy/page.tsx`
- 역할:
  - 캐릭터 1명 선택: 나머지 2명 조합 추천
  - 캐릭터 2명 선택: 3번째 캐릭터 추천
  - 티어/정렬 기준 변경 가능

## 2. 실제 호출 API 목록

### 2.1 직접 호출 (페이지 본체)

- `GET /api/stats/trios`
- 호출 위치: `frontend/src/app/synergy/page.tsx`의 `fetchRecommendations()`

### 2.2 간접 호출 (캐릭터명 l10n)

- `GET /api/bser/l10n/Korean`
- 호출 경로:
  - `RootLayout`에서 `L10nProvider` 전역 마운트
  - `L10nProvider -> fetchAndParseL10n('Korean')`
  - 내부적으로 `/api/bser/l10n/Korean` 호출
- `/synergy`는 `getCharacterName(l10n, code)`로 이 데이터를 사용해 이름 표시

## 3. `/api/stats/trios` 호출 방식

### 3.1 호출 트리거

- `selectedCharacters.length === 1` 또는 `2`일 때 호출
- 아래 값이 바뀌면 재호출:
  - `selectedCharacters`
  - `selectedTier`
  - `sortBy`

### 3.2 요청 쿼리 파라미터

공통:
- `tier`: `DIAMOND | METEORITE | MITHRIL | IN1000`
- `sortBy`: 페이지 상태값 (`averageRP | winRate | totalGames`)
- `limit`: 항상 `'100'`

선택 캐릭터 수별:
- 1명 선택: `character1`만 전달
- 2명 선택: `character1`, `character2` 전달

예시:

```http
GET /api/stats/trios?tier=DIAMOND&sortBy=averageRP&limit=100&character1=1
GET /api/stats/trios?tier=DIAMOND&sortBy=winRate&limit=100&character1=1&character2=2
```

### 3.3 응답 계약

성공:

```json
{
  "results": [
    {
      "character1": 1,
      "character2": 2,
      "character3": 3,
      "winRate": 22.1,
      "averageRP": 54.7,
      "totalGames": 1234,
      "averageRank": 3.42
    }
  ]
}
```

실패:
- `400`: 잘못된 파라미터(예: `character2`만 전달, 동일 캐릭터 2개 전달, tier 누락)
- `500`: 서버 내부 오류

## 4. `/api/stats/trios` 서버 로직 요약

파일: `frontend/src/app/api/stats/trios/route.ts`

- `tier`는 필수. `parseTierGroup`으로 검증
- `limit`은 `1~200`으로 보정 (기본 `50`)
- `character2`만 단독 전달 금지
- `character1 === character2` 금지
- 두 캐릭터가 들어오면 서버에서 오름차순 정렬 후 조회 (`char1<char2`)
- 쿼리:
  - 1명 선택: `OR(character1|character2|character3)`로 포함 조합 전체 조회
  - 2명 선택: `(character1=char1, character2=char2)` 고정 조회
- 반환: `prisma.characterTrio.findMany({ where, orderBy, take })`

## 5. 응답을 화면에서 쓰는 방식

파일: `frontend/src/app/synergy/page.tsx`

- 원본 응답은 `trioRecommendations` 상태에 저장
- 2명 선택 시:
  - `character3` 기준으로 중복 제거
  - 같은 `character3`가 여러 건이면 현재 정렬 기준에서 더 좋은 1건만 유지
- 1명 선택 시:
  - 선택한 캐릭터를 제외한 나머지 두 캐릭터 쌍을 키(`min-max`)로 중복 제거
  - 더 좋은 지표 1건만 유지
- 최종 렌더는 `recommendations.slice(0, 20)`로 상위 20개만 노출

## 6. 데이터 소스(테이블)와 의미

- 조회 테이블: `CharacterTrio` (`frontend/prisma/schema.prisma`)
- 키 제약: `@@unique([character1, character2, character3, tier])`
- 저장 규칙:
  - 항상 `character1 < character2 < character3`로 정렬 저장
  - 패치 버전 구분 없이 누적 통계

집계 의미(수집 로직 기준):
- 같은 팀 3인만 집계
- `winRate`: 3명 중 1명이라도 1등이면 승리로 계산
- `averageRP`: 3명 RP gain 합의 평균
- `averageRank`: 3명 중 최고 등수(최소 rank) 기준 평균

## 7. 운영 시 가장 중요한 주의 포인트

1. **정렬 옵션 불일치**
- 프론트는 `sortBy=totalGames`를 보낼 수 있음
- 서버는 `averageRP`가 아니면 전부 `winRate`로 처리함
- 즉 `totalGames` 선택 시 서버 정렬은 실제로 `winRate` 기준

2. **패치 단위 비교 불가**
- `CharacterTrio`는 패치 버전 컬럼 없이 누적 데이터
- `/synergy`는 시즌 누적 조합 추천 페이지로 봐야 함

3. **2명 선택 시 `character3` 가정**
- 현재 렌더 로직은 2명 선택 결과에서 `rec.character3`를 3번째 추천 캐릭터로 간주
- 이는 DB 저장 정렬 규칙(`character1<2<3`)에 의존

4. **표시 수와 조회 수 차이**
- API는 최대 100개 요청, 실제 렌더는 상위 20개만 표시
- 더 많은 결과가 필요하면 둘 다 함께 조정해야 함

## 8. 관련 파일 맵

- 페이지:
  - `frontend/src/app/synergy/page.tsx`
- 조합 API:
  - `frontend/src/app/api/stats/trios/route.ts`
- 티어 파싱:
  - `frontend/src/utils/tier.ts`
- 스키마:
  - `frontend/prisma/schema.prisma`
- 수집 로직:
  - `frontend/src/lib/collect-helpers.ts`
- l10n:
  - `frontend/src/components/L10nProvider.tsx`
  - `frontend/src/utils/l10n.ts`
  - `frontend/src/app/api/bser/l10n/[language]/route.ts`

## 9. 다음 담당자 권장 우선 작업

1. `sortBy=totalGames` 서버 지원 추가 또는 프론트 옵션 제거(둘 중 하나로 일관성 확보)
2. 필요 시 패치 버전 차원을 `CharacterTrio`에 추가해 기간 필터 확장
3. API 응답 스키마(`zod` 등)로 프론트/서버 계약 고정
