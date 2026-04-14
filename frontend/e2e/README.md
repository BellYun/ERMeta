# ER&GG E2E 테스트

Playwright 기반 크리티컬 패스 회귀 스위트. 주요 페이지/API가 배포 전 퇴행 없이 동작함을 보장한다.

## 스코프

- 스모크 + 크리티컬 패스만 커버한다.
- 단위/통합 테스트는 vitest가 담당. 여기서는 실제 브라우저에서 사용자 플로가 무너지지 않는지만 검증한다.
- 상세한 시각/성능 회귀는 별도 CI(perf-ci.yml)가 담당한다.

## 커버리지 맵

| 스펙                | 대상                                                                      |
| ------------------- | ------------------------------------------------------------------------- |
| `home.spec.ts`      | `/` (메타 분석 페이지, GlobalFilter, TierRankingTable, HoneyPicksSection) |
| `character.spec.ts` | `/character/[code]` 직접 접근 + 섹션 렌더                                 |
| `synergy.spec.ts`   | `/synergy`, `/synergy-detail`, `/updates`, `/privacy`, `/terms`           |
| `seo.spec.ts`       | `/robots.txt`, `/sitemap.xml`, HEAD 메타(title/og/canonical)              |
| `api.spec.ts`       | `/api/patches/history`, `/api/meta/trending` 응답 shape                   |

## 로컬 실행

```bash
# 첫 실행만: 브라우저 바이너리 설치
npm run test:e2e:install

# 백그라운드에서 dev/start 서버를 이미 띄워둔 경우 자동 재사용.
# 아니면 webServer 설정이 자동으로 `npm run start`를 기동한다.
npm run test:e2e

# 디버그용 UI 러너
npm run test:e2e:ui
```

## CI 게이트

- 트리거: `pull_request` (frontend 변경) + `workflow_dispatch`
- 러너: `ubuntu-latest`, Node 20, chromium 전용
- 실패 시 `playwright-report/`, `test-results/`를 14일간 아티팩트로 보관해 스크린샷/트레이스 열람 가능
- 실행 병렬도 축소(`--workers=1` 수준의 안정성)와 `retries=2`로 Supabase 레이턴시 흔들림 흡수

## 환경 변수

Supabase 기반 페이지/ API가 동작해야 하므로 CI는 `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` secrets를 `perf-ci`와 동일한 방식으로 주입한다.

로컬에서는 `frontend/.env.local`이 있으면 자동 사용된다.
