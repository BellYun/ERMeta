# 모바일 터치 이슈 개선 — 상세 조합 페이지

## VOC (Voice of Customer)

| 날짜 | 유형 | 내용 |
|------|------|------|
| 2026-03-17 | 일반 문의 | 조합 검색이 지금 안되는건가요? |
| 2026-03-20 | 버그 신고 | 모바일에서 클릭 안됌 |
| 2026-04-05 | 일반 문의 | 모바일로는 조합 카테고리 내에서 조작이 안되는 부분인가요, 제 폰 세팅 문제일까요? |

**공통 증상**: 페이지 진입 직후 터치가 안 되고, 시간이 지나면 작동됨

---

## 근본 원인 분석

### 1차 원인: React Hydration Gap (핵심)

서버에서 HTML을 완전히 렌더링해서 보내기 때문에, 모바일 유저에게는 **버튼과 그리드가 다 보이지만 실제로는 이벤트 핸들러가 없는 "dead HTML"** 상태가 발생.

**Before (문제 흐름)**:
```
서버 렌더링 → HTML 전송 → 유저 화면에 컴포넌트 표시 (보이지만 터치 안 됨)
  → JS 번들 다운로드 (모바일 네트워크 지연) → React Hydration → 이벤트 핸들러 부착 → 터치 작동
                                                                    ↑
                                                          이 구간이 "터치가 안 되는 시간"
```

**After (개선 흐름)**:
```
서버 렌더링 → Skeleton Fallback 전송 (로딩 중 명확히 표시)
  → JS 번들 다운로드 → 컴포넌트 렌더 + 이벤트 핸들러 동시 부착 → 표시되는 순간부터 터치 작동
```

### 2차 원인: 모듈 평가 시 메인 스레드 차단

`ALL_CHAR_WEAPON_ITEMS`가 모듈 로드 시 즉시 실행되는 IIFE(즉시 실행 함수)로 구현되어 있어, JS 번들 파싱 중 `localeCompare("ko")` 정렬 + 90개 캐릭터 무기 조합 계산이 메인 스레드를 차단. 모바일 CPU에서 hydration을 추가로 지연시킴.

### 3차 원인: HTML 스펙 위반 + 터치 UX 미비

- `<button>` 안에 `<Link>` 중첩 (ComboWeaponCard) → 모바일 터치 이벤트 전파 실패
- `<button>` 안에 `<button>` 중첩 (FocusWeaponPool 헤더) → HTML 스펙 위반
- 터치 타겟이 WCAG 44px 미만 (X 버튼, 검색 클리어, 정렬 버튼 등)
- `hover` 스타일만 있고 `active` 스타일 없음 → 모바일에서 탭 피드백 부재

---

## 해결 방법

### Fix 1: `next/dynamic` + `ssr: false` (Hydration Gap 제거)

**파일**: `src/app/synergy-detail/page.tsx`

```tsx
const FocusWeaponPool = dynamic(
  () => import("@/.../FocusWeaponPool").then((m) => m.FocusWeaponPool),
  { ssr: false, loading: () => <FocusPoolSkeleton /> }
)
```

3개 interactive 컴포넌트를 모두 `dynamic(ssr: false)`로 전환:
- 서버에서는 skeleton만 렌더링
- 클라이언트에서 JS 로드 완료 시 컴포넌트 렌더 + 이벤트 핸들러 동시 부착
- **"보이지만 터치 안 되는" 기간 완전 제거**

### Fix 2: Lazy Singleton 패턴 (모듈 평가 최적화)

**파일**: `src/components/features/synergy-detail/WeaponAllySelector.tsx`

```tsx
// Before: 모듈 로드 시 즉시 실행
export const ALL_CHAR_WEAPON_ITEMS = (() => { ... })()

// After: 첫 접근 시에만 계산
let _allCharWeaponItems: CharWeaponItem[] | null = null
export function getAllCharWeaponItems(): CharWeaponItem[] {
  if (!_allCharWeaponItems) { /* 계산 */ }
  return _allCharWeaponItems
}
```

### Fix 3: HTML 중첩 해소 + 터치 타겟 + 터치 피드백

| 컴포넌트 | 변경 내용 |
|----------|----------|
| **ComboWeaponCard** | `<button>` → `<div role="button" tabIndex={0}>` + `onKeyDown` + Link에 `onTouchEnd stopPropagation` |
| **FocusWeaponPool** | 헤더 `<button>` → `<div role="button">` + 초기화 버튼 44px 타겟 + `onTouchEnd` |
| **WeaponAllySelector** | CharWeaponCell `active` 피드백 + X 버튼 44px + 검색 클리어 44px |
| **SynergyDetailResults** | 정렬 버튼 44px + `active` + 공유/초기화 44px + `active` |

---

## 변경 파일 목록

| 파일 | 변경 유형 |
|------|----------|
| `src/app/synergy-detail/page.tsx` | `next/dynamic` + `ssr: false` 전환, Suspense 제거 |
| `src/components/features/synergy-detail/WeaponAllySelector.tsx` | lazy singleton, active 피드백, 44px 터치 타겟 |
| `src/components/features/synergy-detail/FocusWeaponPool.tsx` | lazy import, div[role=button], 44px, active |
| `src/components/features/synergy-detail/ComboWeaponCard.tsx` | div[role=button], Link onTouchEnd, active |
| `src/components/features/synergy-detail/SynergyDetailResults.tsx` | 44px 터치 타겟, active 피드백 |

---

## 검증

- **TypeScript**: `tsc --noEmit` 통과 (0 errors)
- **테스트**: `vitest run` 89/89 통과
- **접근성**: 키보드 탐색 (Tab/Enter/Space) `onKeyDown` 핸들러 추가
- **데스크탑**: `hover` 효과 기존 유지, `active` 추가만

---

## 핵심 교훈

1. **SSR + Interactive 컴포넌트 = Hydration Gap**: 서버에서 완전한 HTML을 보내면 "보이지만 안 되는" 기간이 생김. `ssr: false`로 skeleton을 보내면 유저 기대치와 실제 동작이 일치함.
2. **모듈 스코프 계산은 lazy로**: IIFE는 번들 파싱 시 메인 스레드를 차단. Lazy singleton은 실제 필요할 때만 실행.
3. **Interactive element 중첩 금지**: `<a>` in `<button>`, `<button>` in `<button>`은 모바일 브라우저에서 터치 이벤트 전파가 불안정. `div[role=button]`으로 해소.
4. **WCAG 44px**: 모바일 터치 타겟 최소 크기. `min-h-[44px] min-w-[44px]`로 보장.
