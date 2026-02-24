# 캐릭터 이름 매칭 가이드 (다른 레포 이식용)

이 문서는 ERmangho 기준 캐릭터 이름 매칭 규칙을 다른 레포에서 그대로 재현할 수 있도록 정리한 문서입니다.

## 1) 핵심 원칙

- 캐릭터의 **유일 식별자**는 문자열 이름이 아니라 `characterCode`/`characterNum`(숫자)입니다.
- 화면에 표시할 이름은 항상 `code -> name` 방식으로 계산합니다.
- 이름 문자열을 기준으로 DB/API를 조회하지 않습니다.

## 2) 현재 레포의 이름 소스

### A. 실시간 다국어 이름 (1순위)

- 소스: BSER l10n
- 경로:
  - `frontend/src/app/api/bser/l10n/[language]/route.ts`
  - `frontend/src/lib/bser.ts`
  - `frontend/src/utils/l10n.ts`
- 조회 키:
  - `Character/Name/${code}`

### B. 정적 fallback 이름 (2순위)

- 소스: `frontend/src/const/codes_and_names.json`
- 형태:
  - `[{ code: number, name: string }, ...]`
- 용도:
  - l10n 로드 실패/지연 시 기본 이름 제공
  - 선택 UI(드롭다운/멀티셀렉트)의 기본 캐릭터 목록

### C. 최종 fallback (3순위)

- 이름을 찾지 못하면 `코드: ${code}` 또는 `캐릭터 ${code}` 형태로 표시

## 3) 실제 매칭 규칙

현재 UI의 공통 패턴:

1. `getCharacterName(l10n, code)` 시도  
2. 없으면 `codes_and_names.json`의 `name` 사용  
3. 그래도 없으면 `"코드: ${code}"` 사용

권장 공통 함수:

```ts
type CharacterCode = number;

export function resolveCharacterName(
  code: CharacterCode,
  l10n: Map<string, string>,
  fallbackMap: Map<number, string>
): string {
  return (
    l10n.get(`Character/Name/${code}`) ??
    fallbackMap.get(code) ??
    `코드: ${code}`
  );
}
```

## 4) 데이터 계약(Contract)

다른 레포에서도 아래 계약을 유지하면 호환이 쉽습니다.

- 입력:
  - `characterCode` 또는 `characterNum` (`number`)
- 출력:
  - `displayName` (`string`)
- 보장:
  - 항상 문자열 반환 (null/undefined 미반환)

권장 타입:

```ts
export interface CharacterNameResolverInput {
  code: number;
  l10n: Map<string, string>;
  fallbackNameByCode: Map<number, string>;
}
```

## 5) 구현 체크리스트 (이식용)

1. 캐릭터 코드 목록을 정적 파일로 준비한다.  
2. `code -> fallback name` 맵을 앱 시작 시 생성한다.  
3. l10n API를 1회 로드하고 `Map<string, string>`으로 보관한다.  
4. 이름 표시는 공통 함수(`resolveCharacterName`)만 사용한다.  
5. 컴포넌트에서 개별 fallback 로직을 직접 쓰지 않는다.

## 6) 자주 생기는 실수

- 이름으로 역조회하는 실수:
  - 언어/표기 변경 시 깨짐. 항상 숫자 코드로 처리해야 함.
- `characterCode` vs `characterNum` 혼용:
  - 의미는 동일하지만 네이밍이 달라 헷갈릴 수 있음. 타입 별칭으로 통일 권장.
- 이미지 경로를 이름으로 조합:
  - 현재 레포는 `CHARACTER_MINI_IMAGE_BY_CODE`처럼 **명시적 매핑**을 사용함.
  - 일부 리소스 폴더명은 코드/영문명 규칙이 일관적이지 않아 문자열 조합이 취약함.
- l10n 지연 상태 미처리:
  - 초기 렌더에서 l10n이 비어 있을 수 있으므로 fallback을 반드시 둬야 함.

## 7) 권장 레이어 구조

- `domain/character-name.ts`
  - `resolveCharacterName`, `buildFallbackMap`
- `infra/l10n-client.ts`
  - l10n fetch + parse + cache
- `const/character-codes.ts`
  - 코드 목록(정적)

이렇게 분리하면 다른 레포에서도 UI/서버 코드 변경 없이 재사용 가능합니다.

## 8) 현 레포 참고 파일

- `frontend/src/utils/l10n.ts`
- `frontend/src/components/L10nProvider.tsx`
- `frontend/src/const/codes_and_names.json`
- `frontend/src/const/characterImages.ts`
- `frontend/src/app/page.tsx`
- `frontend/src/components/character/CharacterTierItem.tsx`
