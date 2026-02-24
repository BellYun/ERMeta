# 무기 이름 인수인계 가이드

이 문서는 현재 레포의 무기 이름 처리 방식을 다른 컨텍스트/레포로 넘길 때 필요한 핵심만 정리한 인수인계 문서입니다.

## 1) 핵심 개념

- 무기 식별자는 문자열이 아니라 `bestWeapon` 코드(`number`)입니다.
- 무기 이름은 화면마다 서로 다른 소스에서 가져옵니다.
- `bestWeapon = null`은 "전체 무기 집계" 의미입니다.

## 2) 이름 소스 3가지

### A. 정적 한글 맵

- 파일: `frontend/src/const/weaponNames.ts`
- 함수: `getWeaponNameKorByCode(code)`
- 특징:
  - 코드 → 한글 이름 매핑
  - 미매핑 코드는 `무기 {code}` 반환
  - `null/undefined`는 빈 문자열 반환

### B. l10n 동적 이름

- 파일: `frontend/src/utils/l10n.ts`
- 함수: `getWeaponName(l10n, code)`
- 키 형식:
  - `WeaponType/${code}`
- 특징:
  - 언어별 이름 가능
  - 값 없으면 `null`

### C. 캐릭터별 무기 탭 라벨

- 파일:
  - `frontend/src/const/characterBestWeapons.json`
  - `frontend/src/const/characterBestWeapons.ts`
- 특징:
  - 캐릭터별 추천 무기 목록 + 라벨(`label`) + 기본값(`isDefault`)
  - 이 라벨은 별도 정적 텍스트라 l10n과 독립적

## 3) 화면별 실제 동작

### 메인 페이지 티어 리스트

- 파일: `frontend/src/components/character/CharacterTierItem.tsx`
- 동작:
  - `getWeaponNameKorByCode(stat.bestWeapon)` 사용
  - 즉, **정적 한글 맵** 기준

### 빌드 페이지 카드

- 파일: `frontend/src/components/builds/WeaponStatCard.tsx`
- 동작:
  - `getWeaponName(l10n, bestWeapon) || 무기 {code}`
  - 즉, **l10n 기반** 이름

### 캐릭터 분석 페이지 무기 탭

- 파일: `frontend/src/app/character-analysis/page.tsx`
- 동작:
  - `selectedWeapon.label` 사용
  - 즉, **characterBestWeapons.json 라벨** 표시

## 4) DB/API에서 bestWeapon 의미

### 테이블 의미

- `CharacterStats.bestWeapon`
  - `null`: 전체 무기 집계 행
  - 숫자: 특정 무기 집계 행

### 주요 API

- `/api/builds/weapons`
  - 내부적으로 `bestWeapon IS NOT NULL`만 조회
  - 무기별 통계 화면용
- `/api/character/stats/[characterCode]`
  - 쿼리 `bestWeapon` 받음
  - 없으면 `bestWeapon = null`(전체 무기)
- `/api/character/mithril-rp-ranking`
  - 캐릭터 단위로 다시 합산해서 `bestWeapon: null`로 응답

## 5) 다른 레포로 옮길 때 권장 통일 규칙

현재는 화면별 이름 소스가 달라 다국어/일관성 문제가 생길 수 있습니다.  
이식 시 아래 우선순위로 통일하는 걸 권장합니다.

1. `l10n` (`WeaponType/${code}`)
2. 정적 맵 (`WEAPON_KOR_BY_CODE`)
3. 최종 fallback (`무기 {code}`)

권장 함수:

```ts
export function resolveWeaponName(
  code: number | null | undefined,
  l10n: Map<string, string>,
  korMap: Record<number, string>
): string {
  if (code == null) return '전체 무기';
  return l10n.get(`WeaponType/${code}`) ?? korMap[code] ?? `무기 ${code}`;
}
```

## 6) 주의할 점

- 현재 `L10nProvider`는 언어를 `Korean`으로 고정 로드합니다.
  - 즉 l10n을 써도 실제로는 한국어만 보입니다.
- 정적 맵과 JSON 라벨은 다국어 전환 시 자동 번역되지 않습니다.
- `characterBestWeapons.json` 라벨은 사람이 관리하는 데이터라 표기 오타/불일치 가능성이 있습니다.
- `bestWeapon`가 `null`일 때는 빈 문자열보다 `"전체 무기"`로 명확히 표시하는 게 안전합니다.

## 7) 참고 파일

- `frontend/src/const/weaponNames.ts`
- `frontend/src/utils/l10n.ts`
- `frontend/src/components/builds/WeaponStatCard.tsx`
- `frontend/src/components/character/CharacterTierItem.tsx`
- `frontend/src/const/characterBestWeapons.ts`
- `frontend/src/const/characterBestWeapons.json`
- `frontend/src/app/api/builds/weapons/route.ts`
- `frontend/src/app/api/character/stats/[characterCode]/route.ts`
