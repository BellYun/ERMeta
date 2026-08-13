# ERMeta 프론트엔드 Next.js 렌더링 전략 재분석

> 분석일: 2026-07-20  
> 기준 브랜치: `origin/main`  
> 기준 커밋: `2024016fbf0774f9964e7f9b25160e663aac13c2` (`Merge pull request #192`)  
> 대상: `frontend` / Next.js 16.2.4 App Router  
> 범위: 페이지 렌더링, RSC/Client 경계, Full Route/Data/HTTP cache, 정적 자산, Proxy  
> 측정 방식: 기준 커밋을 별도 clean worktree에서 Node.js 22로 production build 및 `next start` 검증

## 1. 결론

최신 `main`은 **전체적으로 정적 렌더링 중심의 방향이 맞다.** 일반 페이지를 SSR로 더 옮길 이유는 없고, 오히려 이미 정적인 경로의 데이터 정확성·TTL·중복 산출물을 정리하는 것이 다음 단계다.

이전 분석에서 가장 컸던 두 항목은 해결됐다.

| 기존 우선순위                                  | 최신 `main` 상태 | 실제 결과                                           |
| ---------------------------------------------- | ---------------- | --------------------------------------------------- |
| 전체 `initialL10n` 직렬화 제거                 | 완료, PR #190    | HTML raw 합계 약 1.90GB → 87.5MB                    |
| `/synergy-detail` 정적 UI와 공유 metadata 분리 | 완료, PR #192    | 일반 UI는 SSG, 공유 URL만 첫 요청 생성 후 cache hit |

현재 우선순위는 다음과 같다.

1. **P0 — 노출된 `/synergy-matrix` 404를 먼저 막는다.**
   - Header, Navigation, sitemap은 해당 URL을 노출하지만 `main`에는 페이지가 없다.
   - 기능을 바로 합칠 수 없으면 링크와 sitemap entry부터 feature flag로 숨겨야 한다.
2. **P1 — patch analysis를 “부분 데이터로 성공한 정적 페이지”로 발행하지 않게 한다.**
   - clean build에서 Supabase RPC statement timeout이 발생했지만, 실패 chunk를 버리고 505/505 성공했다.
   - 이 상태의 HTML은 다음 배포까지 정상 정적 결과처럼 고정된다.
3. **P1 — l10n 2단계 최적화로 cold client transfer를 줄인다.**
   - 서버 직렬화는 해결됐지만 모든 페이지가 hydration 직후 전체 l10n을 다시 받는다.
   - 한국어 기준 raw 3.76MB, gzip 약 648KB이며 HTTP cache도 `max-age=0`이다.
4. **P1 — 홈 Full Route TTL과 Data Cache TTL을 맞춘다.**
   - 홈 HTML은 1시간마다 stale이 되지만 원본 데이터는 6시간 cache다.
   - 데이터가 그대로인 상태에서 HTML만 최대 6배 자주 재생성될 수 있다.
5. **P1 — `/patch-analysis` redirect를 config/static redirect로 바꾼다.**
   - 현재 단순 redirect가 유일한 일반 페이지 SSR이며 실제 GET은 `200 private, no-store` + meta refresh다.
6. **P2 — 중복·도달 불가·실험용 route를 정리하고 payload budget을 CI에 넣는다.**

핵심 판단은 다음과 같다.

> 지금은 Server Component를 더 늘리는 작업보다, publish 실패 의미와 cache 수명, route 중복, cold client payload를 정리하는 편이 비용과 안정성에 더 효과적이다.

## 2. clean `main` 측정 결과

### 2.1 빌드 결과

```bash
cd frontend
PATH=/opt/homebrew/opt/node@22/bin:$PATH npm run build
```

빌드는 성공했고 정적 페이지 생성 단계는 `505/505`로 끝났다.

| 항목                             |                                    결과 |
| -------------------------------- | --------------------------------------: |
| 생성된 HTML                      |                                   476개 |
| HTML raw 합계                    |                  87,519,318B, 약 87.5MB |
| 독립 `.rsc` raw 합계             |                  45,452,024B, 약 45.5MB |
| localized 캐릭터 HTML            |                     267개 / 41,921,305B |
| default 캐릭터 HTML              |                      89개 / 14,470,396B |
| 500KB 초과 HTML                  |                                    13개 |
| 1MB 초과 HTML                    |                                     1개 |
| 최대 HTML                        | `/ko/character-lab/preview`, 1,098,908B |
| `.next/server/app`               |                                   237MB |
| 전체 `.next`                     |                                   927MB |
| 전체 l10n key marker가 남은 HTML |                                     0개 |

`Object.entries()` 기반 전체 사전 직렬화가 제거된 효과는 확실하다. 아래 비교는 이전 working tree 측정과 최신 clean `main` 측정이므로 완전히 동일한 커밋의 A/B test는 아니지만, 병목 제거 규모를 판단하기에는 충분하다.

| 항목                 |      이전 측정 | 최신 `main` |   감소율 |
| -------------------- | -------------: | ----------: | -------: |
| HTML raw 합계        | 1,904,686,037B | 87,519,318B |    95.4% |
| 캐릭터 HTML raw 합계 | 1,430,198,405B | 56,391,701B |    96.1% |
| `/ko/about` raw HTML |     4,093,860B |    111,426B |    97.3% |
| `.next/server/app`   |          6.6GB |       237MB | 약 96.5% |
| 전체 `.next`         |          8.3GB |       927MB | 약 89.1% |

### 2.2 대표 HTML/RSC 크기

gzip 값은 생성 파일을 gzip으로 압축한 값이다. JS chunk, image, font는 포함하지 않는다.

| 경로                        | 전략           |   raw HTML | gzip HTML |  raw RSC | gzip RSC |
| --------------------------- | -------------- | ---------: | --------: | -------: | -------: |
| `/ko/about`                 | SSG            |   111,426B |   28,028B |  75,284B |  22,003B |
| `/ko`                       | ISR 1h         |   455,477B |   60,734B | 197,616B |  41,818B |
| `/ko/character/1`           | ISR 12h        |   167,995B |   36,646B |  91,944B |  24,390B |
| `/ko/synergy-detail`        | SSG            |   124,368B |   29,863B |  77,913B |  22,349B |
| `/ko/patch-analysis/11.5`   | build snapshot |   555,528B |   55,638B | 299,410B |  35,520B |
| `/ko/season10-recap`        | ISR 1d         |   773,322B |   73,660B | 214,769B |  43,491B |
| `/ko/character-lab/preview` | SSG            | 1,098,908B |  102,549B | 583,773B |  63,014B |

홈이 소개 페이지보다 큰 이유는 l10n 회귀가 아니다. 현재 홈은 `homeMetaStats` 702 rows를 Client Component prop으로 넘기고 초기 랭킹 markup도 함께 렌더링한다. `/api/meta/home-stats?patchVersion=11.6` 응답 자체가 raw 121,509B, gzip 19,509B다. 홈 gzip HTML 60.7KB는 당장 P0 수준은 아니지만, 향후 payload budget으로 추적할 값이다.

### 2.3 기존 P0의 정확한 효과와 남은 trade-off

현재 서버 seed는 다음 세 prefix, 322 keys만 포함한다.

```text
Character/Name/*
WeaponType/*
Trait/Name/*
```

| 언어     | seed raw | seed gzip | 전체 사전 raw | 전체 사전 gzip |
| -------- | -------: | --------: | ------------: | -------------: |
| Korean   |  13,377B |    3,597B |    3,763,733B |       647,916B |
| English  |  12,392B |    3,359B |    3,309,803B |       628,722B |
| Japanese |  13,799B |    3,673B |    3,864,679B |       642,807B |

따라서 현재 상태는 다음과 같다.

- **빌드/ISR:** 전체 3~4MB object를 매 HTML/RSC에 쓰지 않으므로 크게 개선됐다.
- **첫 paint:** seed가 있으므로 캐릭터·무기·특성 이름을 즉시 표시할 수 있다.
- **cold client network:** `L10nProvider` effect가 전체 사전을 다시 fetch하므로 약 629~648KB gzip이 남는다.
- **client CPU/memory:** 브라우저가 3~4MB JSON을 parse하고 전체 `Map`을 만든다.
- **재방문 cache:** `/l10n/*.json`이 `Cache-Control: public, max-age=0`이라 매 fresh document에서 재검증이 필요하다.

즉 PR #190은 **서버 렌더링 비용을 해결한 것**이고, 전체 l10n 사용성을 유지하기 위해 **클라이언트 background 비용을 받아들인 구현**이다. 삭제만 더 진행하면 이름 누락이나 hydration flicker가 재발할 수 있으므로 다음 단계는 namespace/hash 분할이어야 한다.

## 3. 현재 렌더링 전략 지도

| 라우트군                            | 현재 전략                         | 실제 cache                                 | 판단                                   |
| ----------------------------------- | --------------------------------- | ------------------------------------------ | -------------------------------------- |
| `/[locale]` 홈                      | SSG + ISR 1h                      | HTML 1h, Supabase Data Cache 6h            | 전략은 맞지만 TTL 불일치               |
| `/[locale]/character/[code]`        | 267개 SSG + ISR 12h               | HTML/Data Cache 모두 12h                   | 적절                                   |
| `/character/[code]`                 | 89개 SSG + ISR 12h                | localized 구현과 별도 산출물               | 중복 제거 대상                         |
| about, methodology, legal, updates  | SSG                               | `s-maxage=1y`                              | 적절                                   |
| `/patches`, `/patches/[version]`    | SSG                               | build snapshot                             | 로컬 patch note이므로 적절             |
| `/synergy-detail`                   | SSG + Client query state          | query가 달라도 동일 HTML/ETag              | 적절, PR #192 완료                     |
| `/synergy-detail/share/[selection]` | on-demand static                  | 첫 요청 MISS, 다음 요청 HIT, `s-maxage=1y` | 적절                                   |
| `/patch-analysis/[version]`         | SSG build snapshot                | revalidate 없음                            | snapshot이면 적절, publish 검증은 부족 |
| `/patch-analysis`                   | 요청별 SSR redirect               | `private, no-store`                        | 정적 redirect로 변경                   |
| `/season10-recap`                   | ISR 1d                            | 매일 DB 재집계 가능                        | 종료 시즌이면 snapshot 권장            |
| multi-search, synergy UI            | 정적 shell + Client/API           | API별 public/no-store                      | 적절                                   |
| 인증, feedback, health              | Dynamic                           | `no-store`                                 | 적절                                   |
| 통계·빌드 Route Handler             | Dynamic handler + Data/HTTP cache | query key별 cache                          | handler가 `ƒ`인 것은 정상              |

일반 UI를 query별 RSC로 미리 생성할 필요는 없다. SEO HTML은 정적 shell에 두고, 고카디널리티 상호작용은 Client island와 cached API에 두는 현재 시너지 구조가 이 서비스에 맞다.

## 4. 해결된 `/synergy-detail` 경계 검증

PR #192에서 다음 구조로 바뀌었다.

```text
/{locale}/synergy-detail
  generic metadata + force-static UI shell
  query state는 useSearchParams()로 처리

/{locale}/synergy-detail/share/{selection}
  selection별 title/description/OG
  generateStaticParams()는 []
  dynamicParams=true + force-static으로 첫 요청 생성
  client에서 일반 tool URL로 replace
```

로컬 production 응답은 다음과 같았다.

| 요청                                   | status/cache                    | raw HTML | 비고                         |
| -------------------------------------- | ------------------------------- | -------: | ---------------------------- |
| `/ko/synergy-detail`                   | 200 / HIT / `s-maxage=31536000` | 124,368B | generic static shell         |
| `/ko/synergy-detail?ally1=1&ally2=2`   | 200 / HIT / `s-maxage=31536000` | 124,368B | 기본 URL과 동일 ETag         |
| `/ko/synergy-detail/share/1-2` 첫 요청 | 200 / MISS                      | 106,709B | metadata 포함 on-demand 생성 |
| 동일 share 두 번째 요청                | 200 / HIT / `s-maxage=31536000` | 106,709B | cache 재사용                 |

이 경계는 다시 합치지 않는 것이 좋다. query별 일반 UI SSR로 돌아가면 동일한 shell을 선택 조합마다 다시 렌더링하고 CDN 공유 cache도 잃는다.

## 5. 수정해야 할 방향

### 5.1 P0 — `/synergy-matrix` 공개 404 정리

최신 `main`에는 다음 참조가 이미 있다.

- `src/components/layout/Header.tsx`
- `src/components/layout/Navigation.tsx`
- `src/app/sitemap.ts`
- `public/data/synergy-matrix/*.json`

하지만 `src/app/(site)/[locale]/synergy-matrix/page.tsx`는 없다. production server에서 `/ko/synergy-matrix`는 `404 private, no-store`였다.

권장 선택지는 둘 중 하나다.

1. route와 Client island가 배포 준비가 끝났다면 해당 구현을 함께 merge한다.
2. 아직 준비 중이면 Header/Navigation/sitemap entry를 같은 feature flag로 숨긴다.

완료 조건:

- Header와 sitemap에 노출된 모든 URL이 2xx 또는 의도된 3xx다.
- sitemap smoke test가 각 URL의 404를 검출한다.
- 기능을 노출할 때 정적 shell + 필요한 matrix shard만 lazy fetch한다.

### 5.2 P1 — patch analysis publish를 fail-safe하게 변경

clean build에서 아래 오류가 세 번 발생했다.

```text
[patch-analysis] role combo RPC chunk failed; using partial combo metrics.
code: 57014
message: canceling statement due to statement timeout
```

현재 [patchAnalysis.ts](../src/lib/patchAnalysis.ts)는 실패한 chunk를 `continue`하고 성공한 rows만으로 페이지를 만든다. 모든 chunk가 실패해도 `roleComboMetrics: []`로 바꾸고 렌더 성공 처리한다. build 결과는 505/505 성공이며 `/patch-analysis/11.5`는 revalidate 없는 정적 페이지다.

문제는 “dependency failure”와 “정상적으로 데이터가 없음”이 같은 성공 결과가 된다는 점이다.

권장 정책은 콘텐츠 성격에 따라 나눈다.

#### 종료된 분석을 snapshot으로 발행하는 경우

```text
집계 job
  -> 전체 chunk 성공 여부 검증
  -> row count / patch / tier / generatedAt manifest 기록
  -> versioned JSON snapshot 생성
  -> Next build는 snapshot만 import
```

- 하나라도 필수 chunk가 실패하면 snapshot 교체를 중단한다.
- 기존 검증 snapshot을 유지한다.
- `dynamicParams=false`로 allowlist 밖 버전을 닫는다.
- 현재 `11.5`, `11.4`처럼 종료된 버전에는 이 방식이 가장 안전하다.

#### 최신 분석을 live/ISR로 유지하는 경우

- `(patch, tier, cacheVersion)`을 key로 `unstable_cache` 또는 별도 persisted cache를 사용한다.
- ingestion 완료 시 tag/path revalidation을 호출한다.
- 재검증 중 dependency error는 throw해 기존 stale 결과를 유지한다.
- partial 결과를 허용해야 한다면 UI와 metadata에 `sourceStatus=partial`을 명시하고 publish 기준을 따로 둔다.

현재 module-level `Map<string, Promise<...>>`은 한 Node process 안에서만 중복 요청을 줄인다. build worker, server instance, deployment 사이에서 공유되지 않으므로 데이터 cache 대체재로 보면 안 된다.

완료 조건:

- RPC timeout이 난 build는 실패하거나 검증된 기존 snapshot으로 명시적으로 fallback한다.
- 최소 row/chunk completeness test가 있다.
- `generatedAt`, source patch, schema/cache version을 결과에 기록한다.
- partial page가 정상 정적 page로 조용히 고정되지 않는다.

### 5.3 P1 — l10n을 namespace + content hash asset으로 전환

현재 [L10nProvider.tsx](../src/components/L10nProvider.tsx)는 seed가 있어도 mount 직후 전체 사전을 fetch한다. `/ko/about` HTML gzip은 28KB인데 background 한국어 l10n은 약 648KB gzip이므로, 문서성 페이지의 cold transfer는 여전히 l10n이 지배한다.

권장 구조:

```text
/l10n/{hash}/Korean/core.json
  Character/Name, WeaponType, Trait/Name

/l10n/{hash}/Korean/items.json
  Item/Name

/l10n/{hash}/Korean/skills.json
  Skill/Name, TacticalSkill/Name
```

- `core`는 현재 server seed를 유지해 첫 paint를 보장한다.
- about/legal/patch index처럼 추가 사전이 필요 없는 route는 full fetch를 하지 않는다.
- 캐릭터 상세나 build UI가 실제 필요할 때 `items`, `skills` namespace를 lazy load한다.
- content hash 파일에는 `Cache-Control: public, max-age=31536000, immutable`을 준다.
- 고정 파일명 manifest만 짧은 TTL 또는 배포 시 교체한다.
- Provider API는 `ensureNamespaces(["items"])`처럼 명시적으로 만든다.

단순히 seed까지 삭제하거나 모든 소비처를 한 번에 async lookup으로 바꾸는 것은 권장하지 않는다. 첫 paint와 hydration 안정성을 유지하면서 background download 범위를 줄이는 것이 목표다.

완료 조건:

- about/legal cold load에서 전체 l10n request가 없다.
- 이름이 필요한 화면에서만 해당 namespace를 한 번 요청한다.
- namespace asset은 재방문 시 immutable cache hit다.
- seed 이름 누락, hydration warning, 언어 전환 잔상이 없다.

### 5.4 P1 — 홈 ISR 1h와 Data Cache 6h 정렬

현재 홈은 다음 두 수명을 동시에 가진다.

```text
Full Route Cache: revalidate = 3600
getCachedHomeMetaStats: revalidate = 21600
```

따라서 트래픽이 계속 있는 cache scope에서는 6시간 동안 같은 Data Cache 값을 사용하면서 HTML/RSC만 최대 6번 다시 만들 수 있다. DB query는 Data Cache가 막아도 route regeneration, serialization, cache write 비용은 남는다.

권장 순서:

1. ingestion webhook이 안정적이면 홈을 긴 TTL로 두고 `revalidateTag`/`revalidatePath`를 source of truth로 사용한다.
2. 시간 기반만 쓸 경우 page revalidate를 6시간으로 맞춘다.
3. 더 빠른 갱신이 필요하면 Data Cache도 1시간으로 맞추되 비용 증가를 의도된 정책으로 기록한다.

3개 locale이 계속 요청된다는 단순 상한 계산에서는 1시간 TTL이 월 최대 2,160회, 6시간 TTL이 360회 route regeneration이다. 6시간 정렬 시 최대 약 83% 감소다. 실제 Vercel 비용은 traffic, region, cache hit에 따라 이보다 작거나 다르므로 대시보드의 ISR invocation/cache write로 확인해야 한다.

### 5.5 P1 — `/patch-analysis`를 HTTP redirect로 변경

현재 route는 로컬 상수에서 최신 분석 버전을 고른 뒤 `redirect()`하지만 `force-dynamic`이다. 실제 GET 결과는 다음과 같았다.

```http
HTTP/1.1 200 OK
Cache-Control: private, no-cache, no-store, max-age=0, must-revalidate
Content-Length: 83358
```

HTML 안에는 다음 meta refresh가 들어간다.

```html
<meta id="__next-page-redirect" http-equiv="refresh" content="1;url=/patch-analysis/11.5" />
```

layout streaming 뒤 redirect가 발생해 HTTP 307 대신 200 document가 만들어진 것이다. 목적지는 build-time allowlist로 결정되므로 다음 중 하나로 바꾼다.

- `next.config.ts`에 locale별 308 redirect를 생성한다.
- route를 완전 정적으로 만들고 실제 3xx artifact가 생성되는지 build/E2E로 검증한다.

config redirect가 가장 단순하다. 이 변경은 해당 URL의 page render, RSC payload, `private, no-store` 응답을 없앤다.

### 5.6 P2 — 중복·도달 불가 route 정리

#### default 캐릭터 route 중복

현재 같은 한국어 캐릭터 문서를 두 구현으로 생성한다.

- `/character/[code]`: 89 HTML, raw 합계 14,470,396B
- `/[locale]/character/[code]`: 267 HTML 중 `ko` 89개 포함

Proxy matcher가 `character/`를 제외하므로 default 구현이 별도 실행된다. 외부 `/character/:code` URL은 유지하되 내부적으로 `/ko/character/:code`에 rewrite하고 `(default)/character` 구현을 제거하면 89개 정적 산출물과 이중 유지보수를 없앨 수 있다.

적용 전 canonical, sitemap, locale alternates, not-found, revalidation path를 E2E로 고정해야 한다.

#### redirect 앞에서 막혀 도달하지 않는 page

다음 10개 HTML은 build되지만 Proxy 또는 `next.config.ts` redirect가 먼저 처리한다.

```text
/[ko|en|ja]/synergy
/lab
/lab/{rangers|skilldealers|tanks|warriors}
/landing
/character-test
```

이들의 raw 합계는 783,268B다. default 캐릭터 중복까지 합치면 99개 route artifact, raw 약 15.25MB다. 현재 HTML 개수의 20.8%, raw 합계의 17.4%다.

redirect source에 실제 page를 함께 두지 말고 config/Proxy 한 곳을 source of truth로 정리한다.

#### 실험용 production page

- `/[locale]/design-lab`: 3개 raw 합계 2,444,024B
- `/[locale]/character-lab/preview`: 3개 raw 합계 1,293,728B

둘 다 제품 route가 아니라면 production App Router에서 제외하고 Storybook, static artifact, 별도 preview deployment로 옮긴다. 유지한다면 `noindex`만으로 끝내지 말고 접근 목적과 payload budget을 명시한다.

### 5.7 P2 — Proxy cookie write 최소화

[proxy.ts](../src/proxy.ts)는 정적 HTML 요청에서도 매번 1년짜리 언어 cookie를 다시 쓴다. 로컬 응답은 Full Route Cache `HIT`여도 항상 `Set-Cookie`를 포함했다.

권장:

- 기존 cookie 값이 URL locale과 다를 때만 갱신한다.
- RSC navigation에도 Proxy가 호출되는지 Vercel invocation을 확인한다.
- locale 판단이 URL source of truth라면 동일 cookie refresh를 없앤다.
- 정적 asset/API matcher 제외는 현재처럼 유지한다.

이 변경은 HTML 생성량보다 Edge/Proxy invocation당 부가 작업과 response header 변동을 줄이는 최적화다.

### 5.8 P2 — payload와 build artifact budget 추가

전체 l10n 회귀를 다시 만들지 않도록 CI에서 결과를 숫자로 막아야 한다.

권장 budget 시작점:

| 항목                       | warning |   fail |
| -------------------------- | ------: | -----: |
| 일반 문서 raw HTML         |   150KB |  250KB |
| 일반 문서 gzip HTML        |    40KB |   60KB |
| 홈 gzip HTML               |    75KB |  100KB |
| 캐릭터 gzip HTML           |    50KB |   75KB |
| 전체 HTML raw 합계         |   100MB |  125MB |
| 단일 HTML raw              |     1MB | 1.25MB |
| 전체 l10n marker 포함 HTML |       0 |      1 |

preview/design route는 별도 budget으로 분리하거나 production build에서 제외한다. route table snapshot도 CI에 저장해 의도치 않은 `● → ƒ` 변경을 검출한다.

### 5.9 P3 — build warning 정리

clean build는 성공했지만 다음 경고가 남았다.

- 여러 lockfile로 인한 workspace root 추론 경고
- 일부 route의 `metadataBase` localhost fallback 경고
- Sentry `disableLogger` deprecation
- Sentry `onRequestError` instrumentation 누락
- `sentry.client.config.ts` → `instrumentation-client.ts` migration 안내

이들은 현재 렌더링 비용의 주병목은 아니지만, build log에서 실제 데이터 timeout을 묻히게 한다. `outputFileTracingRoot`를 명시하고 Sentry/metadata 설정을 갱신해 오류 신호를 선명하게 만드는 것이 좋다.

## 6. cache 계층별 권장 책임

| 계층                    | 책임                             | ERMeta 적용                          |
| ----------------------- | -------------------------------- | ------------------------------------ |
| Full Route Cache        | SEO HTML/RSC 결과                | 홈, 캐릭터, 문서, generic tool shell |
| Data Cache              | Supabase 집계와 normalized query | ranking, character stats, home stats |
| CDN HTTP cache          | 공개 Route Handler JSON          | 통계·빌드 API 응답                   |
| Browser immutable cache | 내용 hash 정적 asset             | l10n namespace, matrix shard, image  |
| `no-store`              | 사용자별/보안/쓰기               | auth, feedback write, health/test    |

GET Route Handler가 build 표에서 `ƒ`라고 해서 문제는 아니다. query parameter 조합형 API는 handler가 dynamic이어도 내부 Data Cache와 공개 `Cache-Control`로 재사용하는 것이 맞다.

반대로 HTML route가 단순 상수 redirect인데 `ƒ private, no-store`인 것은 불필요한 dynamic 경계다. 페이지와 API를 같은 기준으로 정적화하려 하지 말고 결과의 공유 가능성과 개인화 여부로 판단해야 한다.

## 7. 비용 감소 예상

정확한 원화/달러 비용은 Vercel usage 없이 계산할 수 없다. 다만 비용 항목별 감소 방향은 다음처럼 추정할 수 있다.

| 변경                              | 감소하는 비용                                              | 예상 규모                                        |
| --------------------------------- | ---------------------------------------------------------- | ------------------------------------------------ |
| 이미 완료된 compact l10n seed     | build artifact write, ISR serialization, HTML/RSC transfer | artifact raw 약 89~96% 감소가 측정됨             |
| 홈 TTL 1h → 6h                    | ISR invocation, route cache write                          | 지속 트래픽 기준 최대 약 83% 감소                |
| patch redirect config화           | 해당 URL server render/RSC                                 | 요청당 render 1회 → 0회                          |
| default/dead route 제거           | build render, artifact storage                             | HTML route 99개, raw 약 15.25MB 감소 가능        |
| l10n namespace/hash               | cold transfer, client parse/GC, 재검증 request             | 문서 route에서 약 648KB gzip full l10n 제거 가능 |
| patch analysis snapshot/fail-safe | build DB/RPC, timeout 재시도, 잘못된 배포                  | 금액보다 정확성과 build 안정성 효과가 큼         |

PR #190 이후 ISR 한 번의 단순 문서 serialization 크기는 이미 약 97% 줄었다. 이제 Vercel compute 비용에서 가장 현실적인 추가 절감은 홈 TTL 정렬, 동적 redirect 제거, 중복 route 제거다. l10n 2단계는 주로 사용자 network/CPU와 asset transfer를 줄인다.

## 8. 권장 PR 순서

### PR 1 — 공개 route 정합성

- `/synergy-matrix` 구현 merge 또는 링크/sitemap feature flag
- sitemap URL smoke test
- 의도된 redirect status test

### PR 2 — patch analysis publish 안전성

- partial chunk와 complete result 구분
- versioned snapshot + completeness manifest 또는 persisted Data Cache
- 실패 시 기존 snapshot/stale 유지
- build minimum row/chunk test

### PR 3 — l10n client payload 2단계

- core/items/skills namespace 생성
- content hash asset + immutable cache
- Provider `ensureNamespaces()` 도입
- 문서 route의 full l10n fetch 제거

### PR 4 — route/cache 비용 정리

- 홈 route/Data Cache TTL 정렬 또는 ingestion tag revalidation
- `/patch-analysis` config redirect
- default 캐릭터 route 통합
- redirect에 가려진 page 제거
- Proxy cookie 조건부 write

### PR 5 — budget과 build hygiene

- route classification snapshot
- HTML/RSC/artifact size budget
- preview/design route 분리
- workspace root, metadataBase, Sentry warning 정리

## 9. 검증 체크리스트

### build

```bash
cd frontend
PATH=/opt/homebrew/opt/node@22/bin:$PATH npm run build
```

- `505/505` 같은 성공 숫자만 보지 않고 dependency error를 fail 기준에 포함한다.
- route 표에서 `/synergy-detail`은 `●`, share route는 on-demand static, redirect는 config 3xx인지 확인한다.
- HTML/RSC raw·gzip과 전체 artifact 합계를 CI artifact로 남긴다.
- full l10n marker가 HTML/RSC에 없는지 검사한다.

### production response

- `/ko/synergy-detail`과 query deep link가 동일 static ETag를 사용하는지 확인한다.
- share URL 첫 요청 MISS, 다음 요청 HIT, metadata/OG가 selection과 일치하는지 확인한다.
- `/patch-analysis`가 실제 HTTP 3xx와 `Location`을 반환하는지 확인한다.
- `/synergy-matrix` 등 sitemap URL에 404가 없는지 확인한다.
- auth/write route만 `private/no-store`인지 확인한다.

### data failure

- Supabase timeout 시 partial static page를 새 정상 cache로 저장하지 않는다.
- ISR 재검증 실패 시 이전 stale HTML이 유지된다.
- snapshot manifest의 patch/tier/row count/schema version을 검증한다.
- ingestion 완료 후 필요한 tag/path만 갱신된다.

### client

- seed로 첫 paint 이름이 즉시 보인다.
- 문서 route에서 full l10n을 받지 않는다.
- 필요한 namespace만 lazy load되고 재방문은 immutable cache hit다.
- locale 전환, 뒤로가기, synergy deep link에서 hydration warning이 없다.

## 10. 최종 판단

최신 `main`은 “대부분 SSG/ISR + 상호작용만 Client island”라는 큰 방향을 유지하면 된다. 과거의 가장 큰 렌더링 병목인 전체 l10n 직렬화와 `/synergy-detail` 요청별 SSR은 이미 해결됐다.

다음 단계는 광범위한 렌더링 재작성보다 아래 세 축에 집중하는 것이 맞다.

1. **정확성:** 외부 데이터 실패를 정상 빈/부분 정적 페이지로 발행하지 않기
2. **수명 정렬:** Full Route, Data, CDN, browser cache의 TTL과 invalidation 책임 맞추기
3. **중복 제거:** 동적 redirect, duplicate locale route, dead/preview page 줄이기

이 순서가 현재 `main`에서 비용 감소와 운영 안정성을 동시에 가장 크게 가져온다.
