# 한 번의 탭에 묶인 세 완료 시점: 모바일 연속 선택 p95를 520ms에서 201ms로 줄인 과정

ERMeta의 시너지 상세 화면에서는 캐릭터와 무기를 연속으로 선택해 추천 조합을 비교합니다.

이 화면의 선택, URL, 결과 패널은 같은 선택값을 사용합니다. 처음에는 같은 값을 사용한다는 이유로 세 작업을 하나의 순차 경로에 두었습니다.

```plain
선택
→ URL 변경
→ searchParams 갱신
→ 선택 표시
→ API 요청
→ 통계·조합 분석 계산
→ 결과 카드 렌더
```

문제는 완료 시점이 서로 다르다는 점이었습니다.

- 선택 강조는 현재 입력에 즉시 반응해야 합니다.
- URL은 공유와 새로고침 복원에 필요하지만 첫 feedback의 선행 조건은 아닙니다.
- 추천 통계와 보조 조합 분석은 늦게 완료돼도 됩니다.

production build, 390×844 touch viewport, CPU 6배 제한 환경에서 이 경로를 다시 측정했습니다. 첫 API 응답 50ms 뒤 다음 선택을 보내는 스트레스 조건에서 두 번째 선택 DOM 반영 p95는 최초 구현의 **520.3ms에서 200.7ms로 61.4%**, 결과 통계 DOM 반영 p95는 **1,270.3ms에서 842.3ms로 33.7%** 줄었습니다.

측정 도중 새 조합 분석 기능이 결과 계산을 무겁게 만들어 선택 p95가 1,074.9ms까지 다시 늘어난 회귀도 발견했습니다. 같은 계산 기능을 유지한 채 결과 전달 경계를 나눈 뒤에는 선택 p95를 **1,074.9ms에서 200.7ms로 81.3%**, lab Event Timing p95를 **1,096ms에서 224ms로 79.6%** 줄였습니다.

이 글은 Zustand나 `useDeferredValue` 하나로 성능을 해결한 이야기가 아닙니다. **한 번의 탭에 묶여 있던 선택, URL, 결과의 완료 시점을 분리하고, 기능 추가로 다시 길어진 결과 계산이 다음 입력을 막지 않게 만든 과정**을 다룹니다.

---

## 1. URL을 source of truth로 둔 선택 경로가 첫 feedback을 늦췄습니다

최초 구현은 URL query parameter를 선택 상태의 source of truth로 사용했습니다.

```plain
pointer event
→ router.replace
→ searchParams 갱신
→ 선택값 재계산
→ selected class commit
```

URL 하나만 보면 현재 상태를 복원할 수 있어 구조는 단순했습니다. 그러나 선택 셀은 URL 갱신이 끝난 뒤에야 자신이 선택됐다는 값을 받았습니다.

최초 구현의 일반 조건 trace에서는 lab Event Timing이 48ms에 끝난 뒤 selected class가 약 92ms 늦게 commit됐습니다. 브라우저 interaction이 끝났다고 해서 사용자가 기다리던 선택 표시까지 끝난 것은 아니었습니다.

따라서 최초 구현과 이후 구조의 Event Timing을 그대로 비교하지 않았습니다. 최초 구현과의 end-to-end 비교에는 `pointerdown`부터 실제 selected class mutation까지의 시간을 사용했습니다.

### 상태 관리 도구를 쓰면 해결되는 문제였을까

복기해 보면 Zustand 자체가 필요한 문제는 아니었습니다. Context selector나 페이지 상위의 `useReducer`로도 선택값의 단일 소유권을 만들 수 있습니다.

다만 당시에는 URL, local state, ref, Custom Event에 선택 상태와 형제 컴포넌트 간 동기화 책임이 흩어져 있었습니다. 페이지를 떠나면 폐기되는 scoped Zustand store를 사용해 다음 책임만 모았습니다.

- 선택 UI는 최신 tuple을 동기 구독합니다.
- URL 동기화는 store snapshot을 읽되 별도 task에서 실행합니다.
- 결과 패널은 같은 값을 deferred snapshot으로 소비합니다.

```plain
선택 이벤트 ──→ scoped store ──→ 선택 강조
                    ├──────────→ URL 예약
                    └─ deferred → 요청·결과 패널
```

Zustand는 성능 개선 원인이 아니라 경계를 구현할 때 상태 소유권을 정리한 도구였습니다.

---

## 2. 무엇을 완료라고 부를지부터 다시 정했습니다

처음 만든 벤치마크에는 세 가지 오류가 있었습니다.

### 같은 interaction을 중복 집계했습니다

`pointerdown`, `pointerup`, `click`을 각각 다른 interaction처럼 세고 있었습니다. 수정 후에는 같은 `interactionId`를 하나로 묶고 그룹 안의 최대 duration 하나만 대표값으로 사용했습니다.

### 안내 문구 변경을 결과 완료로 잘못 판단했습니다

API 응답 후 안내 문구가 먼저 바뀌어도 추천 배열 계산은 끝나지 않을 수 있습니다. 성공 요청 key와 추천 배열의 순서·조합·통계를 hash한 `data-result-version`이 commit된 시점을 결과 통계 완료로 다시 정의했습니다.

보조 조합 분석은 이 marker에 포함하지 않았습니다. 최종 구조에서는 결과 통계가 먼저 보이고 조합 분석이 별도 시점에 채워지기 때문입니다. 대신 두 조건의 60회 모두에서 두 번째 입력 1.8초 뒤 보이는 분석 카드 4개가 완료됐고 pending placeholder가 남지 않았는지 별도로 확인했습니다.

### 첫 결과가 무거워지자 다음 입력 시점도 뒤로 밀렸습니다

이전 자동화는 첫 결과 `data-result-version`이 commit된 뒤 50ms 또는 1초 후 다음 탭을 보냈습니다.

결과 계산 코드가 무거워지자 첫 계산이 전부 끝난 뒤에야 타이머가 시작됐습니다. 그 결과 실제로는 결과 계산과 다음 입력이 겹치지 않았고, Long Task가 줄어든 것처럼 보였습니다.

이 수치는 폐기했습니다.

새 하네스는 첫 `/api/stats/trios-weapon` 성공 응답을 Node 쪽에서 관찰한 시점을 기준으로 다음 입력을 예약합니다.

```plain
첫 API 응답
├─ 50ms  → 다음 선택: 결과 처리와 충돌시키는 스트레스 조건
└─ 1000ms → 다음 선택: 일반 조건
```

결과 렌더 중 페이지 스크롤이 바뀌어 실제 셀 좌표가 움직였기 때문에, 벤치마크에서만 고정된 입력 proxy를 사용했습니다. proxy의 trusted pointer task 안에서 실제 셀의 pointer handler를 동기 실행하고, selected class observer는 실제 셀을 관찰했습니다. 이 코드는 제품에는 포함되지 않습니다.

예약 오차 p95는 50ms 조건에서 52.5ms, 1초 조건에서 1,002.4ms였습니다.

최종 지표는 다음과 같습니다.

- **선택 DOM 반영:** `pointerdown`부터 실제 셀의 selected class mutation까지
- **결과 통계 DOM 반영:** 같은 시점부터 해당 선택의 `data-result-version` commit까지
- **lab Event Timing:** 같은 `interactionId` 그룹의 최대 Event Timing duration
- **input / processing / presentation:** 대표 Event Timing entry의 구간 분해
- **겹침 Long Task:** 두 번째 interaction 구간과 겹친 50ms 이상 task

선택 DOM과 결과 DOM은 paint 시각이 아닙니다. 따라서 실제 기기 INP나 사용자가 픽셀 변화를 본 시점이라고 표현하지 않았습니다.

---

## 3. 선택 경로를 나눈 뒤 새 결과 계산이 다시 입력을 막았습니다

선택 경로에서는 다음 작업을 적용했습니다.

- 선택 UI가 scoped store의 최신 tuple을 직접 구독
- 90개가 넘는 셀에는 자신에게 필요한 `selected`와 `disabled`만 전달
- 셀 callback 참조 안정화
- URL 변경을 현재 interaction 밖의 최신 예약 한 건으로 이동
- disabled 표현은 deferred tuple로 계산하되, 실제 입력 검증은 `store.getState()`의 최신 값 사용

요청 경로도 다음처럼 정리했습니다.

- 300ms debounce를 50ms로 단축
- 첫 번째 캐릭터 기준 tuple bucket 재사용
- 같은 요청 Promise 공유
- 이전 반영 취소와 stale response 차단

기존 300ms debounce는 연속 입력 때 요청이 몰리는 것을 막기 위한 값이었습니다. bucket 재사용과 요청 경쟁 정책을 추가한 뒤에는 모든 사용자에게 고정 300ms를 부과할 이유가 줄어 마지막 입력을 묶는 50ms만 남겼습니다.

그런데 이후 카드에 전투 교리와 멤버별 임무를 보여 주는 조합 분석 기능을 추가하면서 결과 계산이 다시 무거워졌습니다.

결과 배열을 그룹화할 때 모든 그룹에 대해 `buildTrioCompositionInsight`를 동기 실행했고, 성공 응답의 `setResultsState`도 긴급 업데이트로 전달됐습니다.

```plain
API 응답
→ tuple 파싱·필터링
→ 긴급 results state 갱신
→ 모든 그룹 통계 계산
→ 모든 그룹 조합 분석
→ 결과 카드 commit
```

API 응답 50ms 뒤 다음 입력을 보낸 trace에서 React scheduler task 하나가 874.9ms 동안 메인 스레드를 점유했습니다. 두 번째 interaction의 input delay는 993.9ms였고, 선택 class를 갱신하는 handler가 실행되기도 전에 대부분의 시간이 소비됐습니다.

즉 URL이나 셀 렌더만 줄여서는 해결할 수 없는 새로운 병목이었습니다. **늦게 끝나도 되는 결과 계산이 다음 urgent 입력보다 먼저 메인 스레드를 차지한 것**이 원인이었습니다.

---

## 4. 결과 통계와 보조 분석의 완료 시점도 다시 나눴습니다

결과 계산을 모두 없앨 수는 없었습니다. 대신 사용자가 먼저 봐야 하는 내용과 나중에 채워도 되는 내용을 분리했습니다.

### 성공 결과를 Transition으로 전달했습니다

API 성공값을 받은 뒤의 결과 state 갱신을 Transition으로 바꿨습니다.

```tsx
fetchDetailRows(queryAllies, controller.signal).then((data) => {
  React.startTransition(() => {
    setResultsState({ data, error: null, loading: false, queryKey });
  });
});
```

`startTransition`이 계산 자체를 빠르게 만들지는 않습니다. 다만 React가 결과 commit보다 새 사용자 입력을 우선 처리할 수 있는 경계를 만듭니다.

### 모든 그룹의 조합 분석을 결과 통계의 선행 조건에서 제거했습니다

추천 통계 그룹을 만들 때 전투 교리를 함께 계산하던 코드를 제거했습니다. 조합 분석은 실제로 마운트된 카드가 100ms 뒤 idle callback에서 계산합니다.

```plain
결과 통계 commit
→ 보이는 카드만 예약
→ idle 시 조합 분석
→ 카드의 분석 영역 갱신
```

같은 캐릭터·무기 조합의 분석 결과는 512개 한도의 module-level `Map`에 저장해 다시 계산하지 않습니다. 분석을 기다리는 동안에는 실제 배지와 같은 높이의 placeholder를 렌더해 카드 높이가 갑자기 바뀌지 않도록 했습니다.

`requestIdleCallback`을 지원하지 않는 브라우저에서는 timer fallback을 사용합니다. 따라서 이번 Chromium lab 결과를 Safari의 동일한 개선 수치로 해석하지 않았습니다.

결과적으로 한 번의 선택은 다음 시간축을 갖게 됐습니다.

```plain
urgent       선택 tuple · 선택 강조 · 입력 무결성 검증
separate     URL 공유 상태 · 다수 셀 disabled 표현
transition   추천 통계 결과
idle         보이는 카드의 보조 조합 분석
```

---

## 5. 같은 하네스에서 최초·회귀·최종 구조를 다시 비교했습니다

공통 환경은 다음과 같습니다.

```plain
production build
390×844 touch viewport
CPU 6배 제한
동일 Chromium / 동일 데이터
warm-up 2회
조건별 30회
```

비교 버전은 네 가지입니다.

- **최초 구현:** `4048a32ab294e74adc3016d33b3999302f091e3d`에 결과 marker만 추가
- **경로 분리 체크포인트:** store와 deferred 결과 경계를 적용했지만 URL·disabled 후속 분리는 적용 전
- **조합 분석 추가 후:** 최신 전투 교리 계산이 모든 결과 그룹의 동기 경로에 포함된 상태
- **최종 구조:** 결과 Transition, 보이는 카드 단위 idle 계산, 조합 분석 캐시 적용

수치는 `median / p95`입니다.

### API 응답 50ms 뒤 다음 입력을 보내는 스트레스 조건

| 지표               |           최초 구현 | 경로 분리 체크포인트 |   조합 분석 추가 후 |           최종 구조 |
| ------------------ | ------------------: | -------------------: | ------------------: | ------------------: |
| 선택 DOM 반영      |     471.7 / 520.3ms |      573.7 / 630.5ms |   972.8 / 1,074.9ms | **147.1 / 200.7ms** |
| 결과 통계 DOM 반영 | 1,178.1 / 1,270.3ms |  1,159.7 / 1,325.3ms | 2,028.7 / 2,090.5ms | **750.6 / 842.3ms** |
| lab Event Timing   |      비교 대상 아님 |          672 / 744ms |     1,000 / 1,096ms |     **176 / 224ms** |
| input delay p95    |      비교 대상 아님 |              596.3ms |           1,060.1ms |         **183.1ms** |
| processing p95     |      비교 대상 아님 |               59.8ms |              18.7ms |          **21.0ms** |
| presentation p95   |      비교 대상 아님 |              100.5ms |              43.7ms |          **36.0ms** |

최초 구현 대비 최종 구조의 선택 DOM p95는 **61.4%**, 결과 통계 DOM p95는 **33.7%** 줄었습니다.

같은 조합 분석 기능을 가진 회귀 버전과 최종 구조를 비교하면 선택 DOM p95는 **81.3%**, Event Timing p95는 **79.6%**, 결과 통계 DOM p95는 **59.7%** 줄었습니다.

interaction과 겹친 Long Task가 있는 실행 수는 네 버전 모두 30/30회였습니다. 따라서 Long Task를 제거했다고 주장할 수는 없습니다. 다만 조합 분석 추가 후와 최종 구조를 비교하면 겹친 Long Task duration p95는 **979ms에서 108ms로 89.0%** 줄었습니다.

이 차이는 processing보다 input delay에서 컸습니다. 결과 작업이 현재 event handler를 빠르게 만드는 수준을 넘어, handler가 시작될 수 있는 시점 자체를 막고 있었기 때문입니다.

### API 응답 1초 뒤 다음 입력을 보내는 일반 조건

| 지표                       |       최초 구현 | 경로 분리 체크포인트 |   조합 분석 추가 후 |           최종 구조 |
| -------------------------- | --------------: | -------------------: | ------------------: | ------------------: |
| 선택 DOM 반영              | 118.4 / 131.7ms |       68.8 / 125.5ms |     112.4 / 170.5ms |  **64.5 / 124.4ms** |
| 결과 통계 DOM 반영         | 836.3 / 951.3ms |      610.8 / 701.3ms | 1,067.3 / 1,183.2ms | **485.5 / 622.1ms** |
| lab Event Timing           |  비교 대상 아님 |          168 / 216ms |         136 / 200ms |      **88 / 152ms** |
| interaction 겹침 Long Task |          0/30회 |              30/30회 |              4/30회 |              9/30회 |

일반 조건에서 최초 구현 대비 선택 DOM median은 **45.5%**, p95는 **5.5%** 줄었습니다. 결과 통계 DOM p95는 **34.6%** 줄었습니다.

경로 분리 체크포인트와 비교하면 최종 Event Timing p95는 **216ms에서 152ms로 29.6%** 감소했습니다. processing p95는 58.7ms에서 19.1ms로, presentation p95는 104.1ms에서 34.8ms로 줄었습니다.

Long Task 발생 횟수는 단조롭게 줄지 않았습니다. 최종 구조가 조합 분석을 여러 후속 task로 나눴기 때문에 1초 조건의 겹침 실행 수는 조합 분석 추가 후 4회에서 9회로 늘었습니다. 대신 겹친 Long Task duration p95는 985ms에서 108ms로 줄었습니다. 횟수만 보면 악화지만, 한 번의 작업이 입력을 막는 시간은 크게 줄어든 결과입니다.

---

## 6. 이 수치를 어디까지 성과로 말할 수 있을까

가장 강한 인과 비교는 **조합 분석 추가 후와 최종 구조**입니다. 같은 기능과 같은 데이터에서 결과 전달 시점과 계산 위치를 바꿨기 때문입니다.

최초 구현과 최종 구조의 차이에는 다음 변경이 함께 포함됩니다.

- URL 중심 상태에서 scoped store 중심 상태로 변경
- callback과 셀 구독 범위 정리
- debounce와 요청 경쟁 정책 변경
- tuple bucket 재사용
- 결과 Transition
- 카드 가상화
- 조합 분석 지연·캐시

따라서 “Zustand가 선택 p95를 61.4% 줄였다”거나 “`useDeferredValue`가 결과 p95를 33.7% 줄였다”고 말하지 않았습니다. 이 숫자는 최종 체크포인트 전체의 결과입니다.

기능 동작은 별도 Playwright 시나리오로 확인했습니다.

- 모바일 pointer 선택
- 조합 카드 확장과 내부 링크 이벤트 전파
- 진행 중인 tuple bucket Promise 공유
- 최신 선택에만 결과 반영
- URL 공유와 새로고침 복원

이번 변경 뒤 직접 실행한 모바일 터치 3개와 요청 경쟁 1개 테스트는 모두 통과했습니다. production build와 TypeScript, 수정 파일 lint도 통과했습니다.

성능 벤치마크는 PR hard gate로 사용하지 않습니다. 30회 p95도 가장 느린 1~2개 표본의 영향을 크게 받고 공유 runner의 변동까지 포함하기 때문입니다. 현재는 warm-up 후 반복 실행한 원본 JSON을 남기는 report-only 측정으로 사용합니다.

또한 이번 결과는 CPU를 제한한 데스크톱 Chromium의 lab 측정입니다. 실제 모바일 기기 INP나 운영 field INP로 바꿔 말할 수 없습니다. `requestIdleCallback` fallback이 다른 Safari에서는 별도 실기기 측정이 필요합니다.

---

## 마무리

처음에는 같은 선택값을 사용하는 UI, URL, 결과를 하나의 상태 경로에 두는 편이 단순하다고 생각했습니다.

하지만 같은 상태를 소비한다는 사실과 같은 시점에 완료돼야 한다는 것은 다른 문제였습니다.

선택 강조는 현재 입력에 필요하지만 URL 공유 상태는 그렇지 않습니다. 추천 통계는 선택보다 늦어도 되고, 전투 교리 같은 보조 분석은 통계 카드보다도 늦게 채워질 수 있습니다.

완료 시점을 나눈 결과 API 응답 50ms 뒤 다음 선택을 보내는 조건에서 선택 DOM p95를 **520.3ms에서 200.7ms**, 결과 통계 DOM p95를 **1,270.3ms에서 842.3ms**로 줄였습니다. 새 조합 분석이 만든 회귀와 비교하면 Event Timing p95도 **1,096ms에서 224ms**로 줄었습니다.

이번 작업에서 가장 중요했던 것은 렌더 횟수를 줄이는 것보다 **각 작업이 언제까지 끝나야 하는지 정의하고, 늦게 끝나도 되는 계산이 다음 입력의 시작을 막지 않게 만드는 것**이었습니다.
