# 광고 Viewability 퍼널·성능 비용 계측

> 작성일: 2026-08-27
>
> 목적: 광고 수익화를 유지하면서 `request → fill → viewable` 병목과 광고가 Web Vitals에 더하는 비용을 같은 릴리스 단위에서 판단한다.

## 1. 측정 질문

1. 렌더 가능한 광고 슬롯 중 실제 요청, fill, viewable까지 도달하는 비율은 얼마인가?
2. 광고가 정상 fill된 방문과 광고가 없거나 실패한 방문의 INP/LCP/CLS p75 차이는 얼마인가?
3. INP 후보와 직접 겹친 광고 스크립트 또는 광고 iframe Long Task가 있는가?
4. 어떤 `page_surface × slot_name` 개선이 가장 많은 viewable impression과 실제 수익을 회수하는가?

Google Active View와 같은 기준으로, 클라이언트의 viewable은 **광고가 fill된 뒤 광고 영역의 50% 이상이 1초 연속 viewport에 머문 경우**로 정의한다. 이 이벤트는 AdSense 공식 집계를 대체하지 않고 퍼널 진단용으로 쓴다.

## 2. 구현된 계측

### 광고 퍼널

| 단계        | 이벤트/필터                                           | 의미                                     |
| ----------- | ----------------------------------------------------- | ---------------------------------------- |
| Opportunity | `ad_slot_rendered`                                    | 슬롯 DOM과 예약 공간이 생성됨            |
| Request     | `ad_slot_state_changed`, `status=requested`           | `adsbygoogle.push`가 중복 없이 queue됨   |
| Fill        | `ad_slot_state_changed`, `status=filled`              | AdSense가 `data-ad-status=filled`로 응답 |
| Viewable    | `ad_slot_viewed`                                      | fill 후 50%/1초 조건 충족                |
| Failure     | `ad_slot_state_changed`, `status=unfilled or timeout` | fill 실패 또는 10초 내 응답 없음         |

`ad_slot_viewed`에는 `render_to_viewable_ms`, `fill_to_viewable_ms`가 포함된다. 상태 이벤트에는 `elapsed_since_render_ms`, `request_to_state_ms`가 포함되어 request→fill 지연의 p50/p75/p95를 바로 계산할 수 있다.

### 광고 성능 문맥

모든 광고 이벤트와 `web_vital_measured`에 다음 저 cardinality 속성을 붙인다.

| 속성                                                             | 용도                                                                                                             |
| ---------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| `page_surface`                                                   | `home`, `character_detail`, `character_analysis`, `synergy_detail`, `patches`, `patch_analysis` 등 페이지군 비교 |
| `ad_delivery_state`                                              | `no_slot`, `slot_only`, `requested`, `filled`, `viewable`, `blocked_or_failed` 코호트 분리                       |
| `ad_*_slot_count`                                                | 한 문서에서 단계별로 도달한 슬롯 수                                                                              |
| `ad_resource_count`, `ad_resource_duration_ms`, `ad_transfer_kb` | Resource Timing 기반 광고 네트워크 비용. TAO가 없는 응답의 transfer size는 `null`                                |
| `page_long_task_*`                                               | 페이지 전체 Long Task 개수·합·최댓값                                                                             |
| `ad_frame_long_task_*`                                           | Long Tasks attribution의 iframe `containerSrc`가 광고 도메인인 직접 귀속 비용                                    |
| `ad_correlated_long_task_*`                                      | 광고 응답/요청 후 2초 안에 겹친 시간 상관 비용. 인과로 표현하지 않음                                             |
| `ad_script_state`, `ad_script_load_ms`                           | AdSense loader 예약/성공/실패와 Resource Timing 기반 로드 시간                                                   |

`web-vitals/attribution`으로 INP를 `input delay / processing / presentation`으로 나누고, LoAF가 지원되는 브라우저에서는 INP와 가장 오래 겹친 script host 및 광고 도메인 여부도 전송한다. CLS는 가장 큰 shift target이 `ad_slot:*`인지 별도로 기록한다.

초기 문서 경로를 `WebVitalsReporter` mount 시 고정한다. 사용자가 SPA 라우팅 후 탭을 닫아도 최초 navigation의 Web Vital이 마지막 URL로 잘못 귀속되지 않는다.

## 3. 로딩 전략 변경

- AdSense loader는 기존처럼 Next.js `lazyOnload + async`를 유지한다.
- 각 수동 슬롯은 viewport 기준 상하 800px 안에 들어온 뒤에만 request한다.
- `display:none`인 모바일/좁은 데스크톱 rail은 IntersectionObserver에 들어오지 않으므로 불필요한 request를 만들지 않는다.
- 슬롯별 DOM element ref로 `adsbygoogle.push`를 1회만 허용한다.
- 슬롯 높이는 breakpoint별로 계속 사전 예약해 CLS를 방어한다.
- viewability observer는 root placeholder가 아니라 **fill된 `<ins>` 영역**만 관찰한다.

이 변경 전후 비교에서는 `app_version`을 release filter로 반드시 사용한다. viewable의 의미가 “빈 슬롯 포함 가능”에서 “fill 광고만”으로 바뀌었기 때문에 단순 시계열을 이어 붙이면 안 된다.

## 4. Amplitude 차트

### 4.1 Viewability 퍼널

```text
Chart Type: Funnel
Step 1: ad_slot_rendered
Step 2: ad_slot_state_changed WHERE status = requested
Step 3: ad_slot_state_changed WHERE status = filled
Step 4: ad_slot_viewed
Conversion Window: 30 seconds
Group by: slot_name 또는 page_surface
Measure: Totals
```

같이 보는 비율:

- Request rate = requested / rendered
- Fill rate = filled / requested
- Viewability = viewed / filled
- 요청 낭비율 = 1 - requested / rendered (의도적인 viewport 지연 포함)
- Fill 실패율 = (unfilled + timeout) / requested

### 4.2 광고 코호트별 Web Vitals 비용

```text
Event: web_vital_measured
Metric: p75(value)
Filter: metric_name = INP (LCP, CLS 각각 별도 차트)
Group by: ad_delivery_state
Secondary group/filter: page_surface, is_mobile_viewport, effective_connection_type, app_version
```

핵심 비교:

```text
광고 정상: ad_filled_slot_count >= 1
광고 없음/실패: ad_filled_slot_count = 0
직접 광고 script 증거: inp_longest_script_is_ad = true
직접 광고 iframe 증거: ad_frame_long_task_count >= 1
시간 상관만 존재: ad_correlated_long_task_count >= 1 AND ad_frame_long_task_count = 0
```

관찰 코호트 비교는 페이지 종류, 디바이스, 네트워크, 광고 차단 사용자 차이의 영향을 받는다. 먼저 이 데이터로 병목을 찾고, 표본이 충분해지면 작은 무광고 holdout으로 인과 효과를 검증한다. holdout 없이 “광고가 INP를 N ms 악화시켰다”고 단정하지 않는다.

### 4.3 페이지·슬롯 우선순위

```text
Event: ad_slot_viewed
Measure: Totals / Uniques
Group by: page_surface, slot_name
Compare with: session_start 또는 page_view
```

클라이언트 이벤트만으로 실제 광고 수익을 계산하지 않는다. AdSense에서 각 placement에 별도 custom channel ID를 만들고 아래 환경 변수에 연결한다.

```text
NEXT_PUBLIC_ADSENSE_HOME_RANKING_CHANNEL
NEXT_PUBLIC_ADSENSE_SYNERGY_DETAIL_CHANNEL
NEXT_PUBLIC_ADSENSE_CHARACTER_ANALYSIS_CHANNEL
NEXT_PUBLIC_ADSENSE_SITE_RAIL_LEFT_CHANNEL
NEXT_PUBLIC_ADSENSE_SITE_RAIL_RIGHT_CHANNEL
```

AdSense 일별 custom-channel report의 `impressions, Active View viewable, estimated earnings, impression RPM`을 `channel ↔ slot_name` 매핑으로 합친다. 클릭 DOM 이벤트는 수집하지 않는다.

권장 우선순위 표:

| page_surface     | slot_name              | PV share | fill rate | viewability | revenue share | INP p75 delta | 결정 |
| ---------------- | ---------------------- | -------: | --------: | ----------: | ------------: | ------------: | ---- |
| home             | home_ranking           |          |           |             |               |               |      |
| character_detail | character_analysis_top |          |           |             |               |               |      |
| synergy_detail   | synergy_detail_top     |          |           |             |               |               |      |
| shared           | site_rail_left/right   |          |           |             |               |               |      |

수익 share가 높고 INP/CLS 비용도 큰 슬롯은 로딩 최적화 우선, 수익 share와 viewability가 모두 낮은 슬롯은 제거/이동 검토 대상으로 둔다.

## 5. 운영 순서와 성공 기준

1. 배포 후 7일간 이벤트 누락, unknown/timeout 비율, 속성 cardinality를 검증한다.
2. `page_surface × device × connection`으로 보정한 광고 fill 유무별 Web Vitals p75 baseline을 만든다.
3. INP poor 표본에서 `inp_longest_script_is_ad`, `ad_frame_long_task_count`, `ad_correlated_long_task_count` 순으로 직접성을 확인한다.
4. AdSense custom channel report를 연결해 실제 revenue share를 채운다.
5. 한 번에 하나의 로딩 전략만 변경하고 `app_version` 전후로 viewability/revenue와 Web Vitals를 같이 비교한다.

초기 guardrail:

- CLS p75 ≤ 0.1
- INP p75 ≤ 200ms
- LCP p75 ≤ 2.5s
- Fill rate 또는 AdSense estimated earnings가 유의하게 하락하면 로딩 margin을 재조정
- 광고 성능 속성 때문에 `web_vital_measured` 이벤트 전송량이 늘어나지 않아야 함

## 참고

- [Google AdSense: Viewability and Active View](https://support.google.com/adsense/answer/4510652?hl=en)
- [Google AdSense: custom channels로 ad unit 성과 추적](https://support.google.com/adsense/answer/10078316?hl=en)
- [GoogleChrome/web-vitals attribution build](https://github.com/GoogleChrome/web-vitals#attribution)
- [web.dev: third-party JavaScript와 Long Tasks](https://web.dev/articles/optimizing-content-efficiency-loading-third-party-javascript)
