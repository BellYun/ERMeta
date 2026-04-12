# 모바일 터치 개선 — 전후 비교 분석

## 테스트 환경

| 항목 | Before (배포) | After (로컬) |
|------|--------------|-------------|
| URL | erwagg.com/synergy-detail | localhost:3333/synergy-detail |
| 코드 | main 브랜치 | fix/#92 브랜치 |
| 렌더링 | Suspense + SSR Streaming | next/dynamic + ssr:false |

---

## 1. SSR HTML 응답 비교

### Before (배포 erwagg.com)

서버 응답 HTML을 분석한 결과:

```
초기 HTML → Suspense fallback (Skeleton)
  ↓ React Streaming
실제 컴포넌트 HTML 스트리밍 도착
  ↓ Hydration 필요
React가 서버 HTML과 클라이언트 렌더를 매칭 (이벤트 핸들러 부착)
```

- 서버가 **Suspense fallback(Skeleton)** 을 먼저 전송
- 이후 실제 컴포넌트 HTML이 **스트리밍**으로 도착
- 스트리밍된 HTML은 **hydration이 필요** — 이 구간에서 "보이지만 터치 안 되는" 상태 발생
- `$20` (React.suspense) 경계로 감싸진 비동기 컴포넌트 구조 확인

### After (로컬 fix/#92)

```
초기 HTML → Skeleton (loading prop)
  ↓ JS 번들 다운로드
클라이언트에서 직접 렌더링 (hydration 불필요)
  → 컴포넌트 표시 = 이벤트 핸들러 부착 = 터치 가능
```

- 서버는 **Skeleton만** 전송 (컴포넌트 HTML 없음)
- JS 로드 후 **클라이언트에서 직접 렌더링** → hydration 스텝 자체가 없음
- 컴포넌트가 화면에 나타나는 순간 = 터치 가능한 순간

---

## 2. 렌더링 타임라인 비교

### Before: Suspense Streaming 방식

```
t=0ms     서버 요청
t=50ms    [Skeleton 표시] ← 유저가 봄
t=200ms   [컴포넌트 HTML 스트리밍 도착] ← 유저가 봄, 터치 시도
t=200ms~  [Hydration 진행 중] ← 터치 안 됨 ❌
t=???ms   [Hydration 완료] ← 터치 됨 ✅
```

**문제**: `t=200ms`에 컴포넌트가 보이지만 hydration이 끝나야 터치 가능.
모바일에서 hydration에 걸리는 시간은 네트워크/CPU에 따라 **1~5초+**.

### After: Client-Only 렌더링 방식

```
t=0ms     서버 요청
t=50ms    [Skeleton 표시] ← 유저가 봄 (로딩 중 명확)
t=???ms   [JS 다운로드 + 파싱]
t=???ms   [컴포넌트 렌더링 + 이벤트 핸들러 동시 부착]
          → 표시 = 터치 가능 ✅
```

**해결**: 컴포넌트가 보이는 시점 = 터치 가능한 시점. Dead HTML 구간 없음.

---

## 3. HTML 구조 비교

### Before: Interactive Element 중첩

```html
<!-- ComboWeaponCard: Link(a) inside button -->
<button class="w-full flex items-center...">
  <a href="/character/1?weapon=16">  ← 모바일에서 터치 이벤트 충돌
    <img .../>
  </a>
</button>

<!-- FocusWeaponPool: button inside button -->
<button class="w-full flex items-center...">  ← 외부 토글 버튼
  <button class="text-[10px]...">초기화</button>  ← 내부 리셋 버튼 (HTML 스펙 위반)
</button>
```

### After: 중첩 해소

```html
<!-- ComboWeaponCard: Link inside div[role=button] (유효한 구조) -->
<div role="button" tabindex="0" class="...active:bg-...">
  <a href="/character/1?weapon=16" ontouchend="e.stopPropagation()">
    <img .../>
  </a>
</div>

<!-- FocusWeaponPool: button inside div[role=button] (중첩 해소) -->
<div role="button" tabindex="0" class="...active:bg-...">
  <button ontouchend="e.stopPropagation()" class="min-h-[44px]...">초기화</button>
</div>
```

---

## 4. 터치 타겟 크기 비교

| 요소 | Before | After | WCAG 기준 |
|------|--------|-------|-----------|
| SlotWeaponFilled X 버튼 | ~24px (p-0.5 + 16px icon) | 44px (min-h/w-[44px]) | 44px |
| 검색 클리어 X 버튼 | ~24px | 44px | 44px |
| 정렬 버튼 (추천/RP/승률) | ~32px (py-1) | 44px (min-h-[44px]) | 44px |
| 공유 버튼 | ~28px (py-1) | 44px (min-h-[44px]) | 44px |
| 초기화 버튼 | ~20px (py-0.5) | 44px (min-h/w-[44px]) | 44px |
| 칩 버튼 (캐릭터 풀) | ~24px (py-1) | 44px (min-h-[44px]) | 44px |
| 더보기 버튼 | ~44px (py-3) | 44px (min-h-[44px] 명시) | 44px |

---

## 5. 터치 피드백 비교

| 요소 | Before | After |
|------|--------|-------|
| ComboWeaponCard 메인 행 | `hover:bg-surface-2` (모바일 무반응) | + `active:bg-surface-2/80` |
| 캐릭터 이미지 Link | `hover:opacity-80` | + `active:opacity-60` |
| CharWeaponCell | `hover:bg-surface-2` | + `active:bg-surface-2/80` |
| FocusCell | `hover:bg-surface-2` | + `active:bg-surface-2/80` |
| 정렬 버튼 (선택) | 없음 | + `active:bg-primary/80` |
| 정렬 버튼 (미선택) | `hover:bg-surface-2` | + `active:bg-surface-2/80` |
| 공유 버튼 | `hover:bg-primary/20` | + `active:bg-primary/30` |
| 초기화 버튼 | `hover:text-foreground` | + `active:text-foreground` |
| 칩 버튼 | `hover:bg-primary/20` | + `active:bg-primary/30` |
| 더보기 버튼 | `hover:bg-surface-2` | + `active:bg-surface-2/80` |

---

## 6. 모듈 로딩 성능 비교

### Before: IIFE (즉시 실행)

```typescript
// 모듈 로드 시 즉시 실행 — 메인 스레드 차단
export const ALL_CHAR_WEAPON_ITEMS = (() => {
  // 90개 캐릭터 × 무기 조합 계산 + localeCompare("ko") 정렬
  // → 모바일 CPU에서 수십ms 차단
})()
```

### After: Lazy Singleton (지연 실행)

```typescript
// 첫 접근 시에만 계산 — 모듈 로드 시 차단 없음
let _allCharWeaponItems: CharWeaponItem[] | null = null
export function getAllCharWeaponItems() {
  if (!_allCharWeaponItems) { /* 계산 */ }
  return _allCharWeaponItems
}
```

---

## 7. 접근성 비교

| 항목 | Before | After |
|------|--------|-------|
| `<button>` in `<button>` | 있음 (FocusWeaponPool) | 없음 (div[role=button]) |
| `<a>` in `<button>` | 있음 (ComboWeaponCard) | 없음 (div[role=button]) |
| 키보드 탐색 | button 기본 제공 | tabIndex={0} + onKeyDown(Enter/Space) |
| aria-expanded | 있음 | 유지 |
| touch-action: manipulation | 전역 CSS 적용됨 | 유지 |

---

## 8. 종합 비교표

| 지표 | Before (배포) | After (fix/#92) |
|------|-------------|----------------|
| **Hydration Gap** | 있음 (1~5초+) | 없음 |
| **Dead HTML** | 스트리밍 후 hydration 전 | 해당 없음 |
| **Interactive 중첩** | 2건 (HTML 스펙 위반) | 0건 |
| **WCAG 44px 미달** | 7개 요소 | 0개 요소 |
| **모바일 터치 피드백** | 없음 (hover만) | 모든 interactive에 active 스타일 |
| **모듈 평가 차단** | IIFE 즉시 실행 | Lazy singleton |
| **TypeScript** | 통과 | 통과 |
| **테스트** | 89/89 | 89/89 |

---

## 9. 결론

**핵심 변경**: `Suspense + SSR Streaming` → `next/dynamic(ssr: false)`

이 전환으로 "컴포넌트가 보이지만 터치가 안 되는" 기간이 **완전히 제거**됨.
기존에는 서버가 컴포넌트 HTML을 스트리밍으로 보내면 유저가 즉시 터치를 시도하지만,
React hydration이 완료될 때까지 이벤트 핸들러가 없어 터치가 무시되었음.

개선 후에는 Skeleton → 컴포넌트 전환이 클라이언트에서 일어나므로,
**컴포넌트가 화면에 나타나는 순간 = 터치 가능한 순간**이 됨.

추가로 HTML 중첩 해소, 터치 타겟 확대, active 피드백으로
모바일 터치 안정성과 사용 경험을 전반적으로 개선.
