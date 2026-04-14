# ER&GG E2E 테스트

Playwright 기반 회귀 스위트. **스모크(페이지 가용성)** + **플로(사용자 시나리오)** 두 축을 구분해 운영한다.

## 디렉터리 구조

```
frontend/e2e/
├── smoke/   # 페이지/API가 살아있는지 (200 + 주요 마커 노출)
└── flows/   # 사용자 인터랙션 여정 (클릭 → URL/상태 변화 → 다음 화면)
```

## 스모크 스위트 (smoke/)

페이지가 무너지지 않았는지 확인하는 가용성 체크. 기능 로직은 검증하지 않는다.

| 스펙                      | 대상                                                                                            |
| ------------------------- | ----------------------------------------------------------------------------------------------- |
| `smoke/home.spec.ts`      | `/` (메타 분석, GlobalFilter, TierRankingTable, HoneyPicksSection)                              |
| `smoke/character.spec.ts` | `/character/[code]` 직접 접근 + canonical                                                       |
| `smoke/synergy.spec.ts`   | `/synergy`, `/synergy-detail`, `/updates`, `/privacy`, `/terms`                                 |
| `smoke/seo.spec.ts`       | `/robots.txt`, `/sitemap.xml`, HEAD 메타(title/og/canonical)                                    |
| `smoke/api.spec.ts`       | `/api/patches/history`, `/api/meta/honey-picks`, `/api/character/mithril-rp-ranking` 응답 shape |

## 플로 스위트 (flows/)

실제 사용자 인터랙션이 끝단까지 도달하는지 검증. 상태/URL 변화 + DOM 갱신 확인.

| 스펙                                   | 시나리오                                                         |
| -------------------------------------- | ---------------------------------------------------------------- |
| `flows/home-to-character.spec.ts`      | 홈 → 꿀챔 카드 클릭 → `/character/{code}?weapon={w}` 이동 + 렌더 |
| `flows/global-filter.spec.ts`          | patch/tier 변경 → URL `?patch`/`?tier` 반영 + 랭킹 refetch       |
| `flows/synergy-ally-selection.spec.ts` | `/synergy-detail` 아군 선택 → URL `?ally1` 반영 + 슬롯 업데이트  |
| `flows/api-error-fallback.spec.ts`     | `/api/meta/honey-picks` 500 주입 → SectionErrorBoundary fallback |
| `flows/mobile-tab-bar.spec.ts`         | 모바일 뷰 MobileTabBar 탭 클릭 → 페이지 전환 (모바일 전용)       |

## 로컬 실행

```bash
# 첫 실행만: 브라우저 바이너리 설치
npm run test:e2e:install

# 전체 스위트 (webServer가 자동으로 `npm run start`를 기동)
npm run test:e2e

# 스모크 또는 플로만 실행
npx playwright test e2e/smoke
npx playwright test e2e/flows

# 디버그용 UI 러너
npm run test:e2e:ui
```

## CI 게이트

- 트리거: `pull_request` (frontend 변경) + `workflow_dispatch`
- 러너: `ubuntu-latest`, Node 20, chromium 전용 (desktop + Pixel 5 모바일 프로젝트 모두 실행)
- 실패 시 `playwright-report/`, `test-results/`를 14일간 아티팩트로 보관해 스크린샷/트레이스 열람 가능
- `retries=2`로 Supabase 레이턴시 흔들림 흡수, `workers=1`로 실행 순서 안정화

## 환경 변수

Supabase 기반 페이지/API가 동작해야 하므로 CI는 `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` secrets를 `perf-ci`와 동일한 방식으로 주입한다.

로컬에서는 `frontend/.env` 또는 `frontend/.env.local`이 있으면 자동 사용된다.
