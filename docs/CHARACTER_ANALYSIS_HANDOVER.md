# 캐릭터 분석 페이지 인수인계서

이 문서는 `/character-analysis` 페이지를 빠르게 유지보수/이관하기 위한 실무용 인수인계 문서입니다.

## 1. 페이지 개요

- 라우트: `/character-analysis`
- 엔트리 파일: `frontend/src/app/character-analysis/page.tsx`
- 핵심 기능:
  - 캐릭터 선택
  - 무기/티어 선택
  - 현재 패치 vs 이전 패치 지표 비교
  - 간단 패치 추이(LineChart)
  - 특성 빌드 통계(`CharacterTraitBuildAnalyzer`)

## 2. 의존 컴포넌트/데이터

- 캐릭터 이름/다국어:
  - `useL10n`, `getCharacterName`
  - `frontend/src/components/L10nProvider.tsx`
  - `frontend/src/utils/l10n.ts`
- 캐릭터 목록:
  - `frontend/src/const/codes_and_names.json`
- 캐릭터 이미지:
  - `frontend/src/const/characterImages.ts`
- 캐릭터별 무기 탭:
  - `frontend/src/const/characterBestWeapons.ts`
  - `frontend/src/const/characterBestWeapons.json`
- 차트:
  - `frontend/src/components/charts/LineChart.tsx`

## 3. 상태(State) 구조

페이지 로컬 상태:

- `selectedCharacter: number | null`
- `selectedWeapon: CharacterWeaponInfo | null`
- `selectedTier: TierGroup`
- `stats: CharacterStats | null` (현재 패치)
- `previousStats: CharacterStats | null` (이전 패치)
- `showComparison: boolean`
- `patchHistory: PatchHistoryPoint[]`
- `loading: boolean`
- `error: string | null`

핵심 useEffect:

1. `selectedCharacter` 변경 시
   - 해당 캐릭터 무기 목록에서 `isDefault` 우선 선택
   - 캐릭터 해제 시 통계 상태 초기화
2. `[selectedCharacter, selectedWeapon, selectedTier]` 변경 시
   - `fetchCharacterStats()` 실행

## 4. API 연동 계약

### 4.1 캐릭터 통계 API

- 호출 위치: `page.tsx`의 `fetchCharacterStats`
- 엔드포인트: `/api/character/stats/[characterCode]`
- 요청 쿼리:
  - `tier` (예: `DIAMOND`)
  - `patchVersion` (현재 하드코딩: `10.3`, 이전: `10.2`)
  - `bestWeapon` (선택)
- 라우트 파일:
  - `frontend/src/app/api/character/stats/[characterCode]/route.ts`

중요 동작:

- 데이터가 없으면 0값 객체를 `200`으로 반환
- `pickRate`는 API 내부에서 다시 계산
- `bestWeapon` 미지정 시 `bestWeapon = null` 집계 행 조회

### 4.2 특성 빌드 API

- 컴포넌트: `frontend/src/components/character/CharacterTraitBuildAnalyzer.tsx`
- 사용 API:
  - `/api/builds/traits/main`
  - `/api/builds/traits/options`
- 라우트 파일:
  - `frontend/src/app/api/builds/traits/main/route.ts`
  - `frontend/src/app/api/builds/traits/options/route.ts`

중요 동작:

- `CharacterTraitBuildStats`에서 조회
- 무기별 데이터가 있으면 `bestWeapon != null` 기준으로 집계
- 없으면 레거시 `bestWeapon = null` 행으로 fallback

## 5. 현재 하드코딩/제약 사항

1. 패치 버전 하드코딩
   - `currentPatchVersion = '10.3'`
   - `previousPatchVersion = '10.2'`
2. React Query 미사용
   - 수동 `fetch` + 로컬 상태로 관리
3. URL 파라미터 연동 없음
   - 선택 캐릭터/무기/티어가 URL에 반영되지 않음
4. 디버그 로그 다수 존재
   - `console.log`가 페이지 로직 내부에 남아 있음
5. 무기 탭 라벨은 정적 JSON 라벨
   - l10n 다국어 전환과 독립적으로 동작

## 6. 유지보수 시 주의 포인트

1. API 응답 필드명과 UI 필드명 불일치 여부를 먼저 확인할 것
   - 예: `averageAssists`는 현재 `totalPlayerAssist` 값을 받음
2. `averageDeaths`는 현재 API에서 0으로 내려옴
   - KDA 계산은 `Math.max(averageDeaths, 1)`로 방어
3. 비교 배지 색상은 도메인 의미보다 디자인 우선 로직
   - `DeltaIndicator`의 색상/긍정 방향(`inverted`) 확인 필요
4. 패치 비교가 2포인트(현재/이전)만 지원
   - 다중 패치 히스토리로 확장 시 설계 변경 필요

## 7. 관련 파일 맵

- 페이지 본체
  - `frontend/src/app/character-analysis/page.tsx`
- 특성 빌드 분석
  - `frontend/src/components/character/CharacterTraitBuildAnalyzer.tsx`
- API
  - `frontend/src/app/api/character/stats/[characterCode]/route.ts`
  - `frontend/src/app/api/builds/traits/main/route.ts`
  - `frontend/src/app/api/builds/traits/options/route.ts`
- 데이터/유틸
  - `frontend/src/const/codes_and_names.json`
  - `frontend/src/const/characterBestWeapons.ts`
  - `frontend/src/const/characterBestWeapons.json`
  - `frontend/src/const/characterImages.ts`
  - `frontend/src/utils/l10n.ts`
  - `frontend/src/utils/tier.ts`

## 8. 다음 담당자 권장 작업 순서

1. 패치 하드코딩 제거
   - `/api/patches/history`와 연동해 현재/이전 패치 자동 계산
2. 페이지 상태 URL 동기화
   - 캐릭터/무기/티어 공유 링크 가능하게 변경
3. 데이터 패칭 계층 통일
   - React Query 도입 또는 공통 fetch 래퍼 적용
4. 콘솔 로그 정리
   - 개발 플래그 기반 로그만 남기기
5. API 응답 필드 의미 정리
   - `average*`와 `total*` 혼용 부분 정리
