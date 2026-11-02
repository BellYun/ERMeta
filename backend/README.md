# ERMeta Backend

## 플레이어 전용 실행·배포 (#309)

기존 전체 백엔드(`npm run start:dev`)와 별도로, 전적·통계·멀티서치만 실행하는 진입점은 `npm run start:player`다. 이 진입점은 Supabase·Redis 설정 없이 시작한다. 로컬에서는 `DATABASE_URL`, Google Cloud에서는 Cloud SQL Unix socket 설정을 사용한다. `/health/live`는 프로세스 상태, `/health/ready`는 BSER API 키와 PostgreSQL 연결·전적 테이블 적용 상태를 확인한다.

Cloud Run 이미지, 마이그레이션 Job, Secret Manager, 예상 비용과 배포 순서는 [CLOUD_RUN_DEPLOYMENT.md](./CLOUD_RUN_DEPLOYMENT.md)에 정리했다. 운영 키 발급 전에는 이 문서의 비공개 프리뷰 절차로 기동과 DB 상태를 구분해 확인한다. 실제 프로젝트와 예산을 확정하기 전에는 Google Cloud 리소스를 만들지 않는다.

## 플레이어 전적·개인 통계·멀티서치 (#300, #303, #305, #307)

Node.js 22와 PostgreSQL이 필요하다. `.env.example`을 참고해 `BSER_API_KEY`와 `DATABASE_URL`을 로컬 환경에 설정한다. API 키를 Git에 커밋하지 않는다. 전적 테이블은 지정한 DB의 `player_history` 스키마에 생성되므로, 이 DB 사용자에게 스키마·테이블 생성 권한이 필요하다.

```sh
cd backend
npm ci
DATABASE_URL='postgres://user:password@localhost:5432/ermeta' npm run db:migrate:player-history
npm run start:dev
```

서버를 시작할 때는 `DATABASE_URL`과 `BSER_API_KEY`가 환경변수 또는 `backend/.env`에 있어야 한다. 마이그레이션 스크립트는 `.env`를 자동으로 읽지 않으므로 위처럼 URL을 전달한다. 기존 분석 API는 `DATABASE_URL` 없이도 시작할 수 있지만 전적 API는 503을 반환한다.

```text
GET /v1/players/{URL-encoded nickname}/matches?limit=20&cursor=...
```

`limit`은 1~50, 기본값은 20이다. `cursor`는 이전 응답의 `nextCursor`를 그대로 사용한다. `matches[].gameId`는 문자열이고 `startedAt`과 `lastSyncedAt`은 UTC ISO 8601이다. `isStale=true`는 공식 API 갱신 실패 후 저장 데이터로 응답했다는 뜻이다. 저장은 최근 경기 최대 300건이며, 공식 API에서 제공하는 기간은 최근 90일이다.

```sh
npm run test:player-matches
TEST_DATABASE_URL='postgres://user:password@localhost:5432/ermeta_test' npm run test:player-matches
```

첫 명령은 서비스 단위 테스트를 실행하고 DB 통합 테스트는 건너뛴다. 두 번째 명령은 **테스트 전용 DB**에 마이그레이션을 먼저 적용한 뒤 실행한다. 실제 BSER API 키를 사용하는 라이브 호출은 포함하지 않는다. 실 API의 `startDtm`은 `+0900` 오프셋을 포함하므로 이를 정규화한다. 시간대가 없는 응답에만 `BSER_MATCH_TIME_OFFSET`(기본 `+09:00`)을 적용한다.

공식 시즌 통계는 같은 `player_history` 스키마에 저장한다. 기존 DB에서도 `npm run db:migrate:player-history`를 다시 실행하면 아직 적용하지 않은 마이그레이션만 순서대로 적용된다. 애플리케이션 시작 시 자동 마이그레이션은 하지 않는다.

```text
GET /v1/players/{URL-encoded nickname}/stats?seasonId=41&matchingMode=3
```

`seasonId`는 1~9999 정수이며 `matchingMode`는 공식 API가 지원하는 2(일반) 또는 3(랭크)이다. 둘 다 필수다. 응답의 `source`는 `bser_official`이고, `stats.totalGames`는 **공식 시즌 전체 경기 수**다. 저장된 최근 경기 일부에서 계산한 수치가 아니다. `stats`에는 승리·승률·평균 순위·랭크 정보·실험체별 기록이 포함된다. 공식 API에 해당 시즌 통계가 없으면 `stats: null`, `fetchedAt: null`을 반환한다.

저장된 통계는 기본 600초(`PLAYER_STATS_TTL_SECONDS`) 동안 재사용한다. 갱신 실패 시 저장 통계가 있으면 `isStale: true`로 반환하며, 없으면 502(공식 API 장애) 또는 429(요청 제한)를 반환한다. 빈 통계 결과는 현재 저장하지 않아 다음 조회에서 공식 API에 다시 확인한다. DB는 대소문자를 정규화한 닉네임을 조회 키로 사용한다. BSER UID는 각 외부 요청에서만 사용하며 저장하지 않는다. 같은 닉네임을 다시 조회했을 때 UID가 달라도 기존 전적·통계를 삭제하지 않는다. 닉네임 변경 전후의 기록은 연결하지 않으며, 다른 계정이 과거 닉네임을 재사용하는 경우는 현재 API만으로 확실히 구별할 수 없어 별도 정책이 필요하다.

동시에 같은 닉네임의 전적·공식 통계를 갱신하면 진행 중인 닉네임 확인 호출을 공유한다. 완료된 확인 결과는 별도로 캐시하지 않는다. BSER 호출은 프로세스당 기본 초당 4회, 초기 버스트 4회, 대기 50개까지 허용하며, 각 대기 요청은 최대 10초(`BSER_API_RATE_LIMIT_MAX_WAIT_MS`)를 기다린다. 큐가 꽉 차거나 대기 시간이 끝나면 저장 데이터가 없는 단건 조회는 `429 BSER_RATE_LIMITED`와 `Retry-After` 헤더·응답 본문의 `retryAfter`(초)를 반환한다. 저장 데이터가 있으면 기존처럼 `isStale=true`로 응답한다. 이 제한은 단일 프로세스 기준이므로 여러 인스턴스에서 전역 호출량을 보장하지 않는다.

저장 경기 기준 개인 통계는 별도 경로로 조회한다. 이 요청은 전적 API와 같은 300초 갱신 규칙을 사용하고, 집계는 PostgreSQL에 저장된 경기만 대상으로 한다.

```text
GET /v1/players/{URL-encoded nickname}/match-stats?seasonId=41&matchingMode=3
```

`seasonId`(1~9999)와 `matchingMode`(2 또는 3)는 필수다. 응답의 `source`는 `stored_matches`, `sampleSize`는 해당 시즌·모드에 저장된 경기 수다. `period.from`/`period.to`는 표본 중 가장 이른·늦은 경기 시각(UTC ISO 8601)이고, 표본이 없으면 `period: null`이다. `stats`는 경기 수·승수·3위 이내 횟수·승률·3위 이내 비율·평균 순위·평균 킬·평균 어시스트를 포함한다. `winRate`는 0~100 퍼센트, `top3Rate`는 0~1 비율이며 평균값은 소수 둘째 자리까지 반환한다. 표본이 없으면 횟수와 비율은 0, 평균은 `null`이다. `lastSyncedAt`은 전적 갱신 시점이고 `isStale=true`는 공식 API 갱신에 실패해 기존 저장 데이터를 사용했다는 뜻이다. 최근 경기 일부의 집계이므로 공식 시즌 전체 성적으로 해석하면 안 된다. 이 API에는 별도 테이블이나 마이그레이션이 필요 없다.

최대 3명 공식 시즌 통계 비교는 다음 경로를 사용한다. `seasonId`와 `matchingMode`는 필수 숫자이며 개인 공식 통계 API와 범위가 같다.

```http
POST /v1/players/compare
Content-Type: application/json

{"nicknames":["첫째","둘째","셋째"],"seasonId":41,"matchingMode":3}
```

응답은 입력 순서대로 `results`를 반환한다. 닉네임은 공백을 제거하고 대소문자를 무시해 중복을 제거한다. 각 결과는 `input`과 `status`를 가지며, 성공한 플레이어는 개인 공식 통계 API와 같은 `source=bser_official`, `stats`, `fetchedAt`, `isStale`을 포함한다. `status=no_stats`는 플레이어는 있지만 해당 시즌 통계가 없는 경우(`stats=null`)다. `not_found`와 `error`는 `code`를 포함한다. `summary.requested`는 중복 제거 후 인원수, `ok`는 통계가 있는 인원수, `failed`는 나머지 인원수다. 일부 또는 모든 플레이어 조회가 실패해도 유효한 요청이면 HTTP 200으로 사용자별 상태를 반환한다. 입력이 잘못되면 400이다.

```json
{
  "seasonId": 41,
  "matchingMode": 3,
  "results": [
    {
      "input": "첫째", "status": "ok", "nickname": "첫째", "seasonId": 41, "matchingMode": 3,
      "source": "bser_official", "fetchedAt": "2026-10-14T00:00:00.000Z", "isStale": false,
      "stats": {
        "seasonId": 41, "matchingMode": 3, "matchingTeamMode": 3, "totalGames": 10,
        "totalWins": 2, "winRate": 20, "averageRank": 2.4, "mmr": null, "rank": null,
        "rankSize": null, "rankPercent": null, "top3Rate": null,
        "averageKills": null, "averageAssistants": null, "characterStats": []
      }
    },
    {
      "input": "둘째", "status": "no_stats", "nickname": "둘째", "seasonId": 41,
      "matchingMode": 3, "source": "bser_official", "stats": null,
      "fetchedAt": null, "isStale": false
    },
    { "input": "셋째", "status": "not_found", "code": "PLAYER_NOT_FOUND" }
  ],
  "summary": { "requested": 3, "ok": 1, "failed": 2 }
}
```

새 경로는 기존 프론트엔드가 쓰는 `POST /multi-search/players`와 독립적이다. 비교 수치는 **공식 시즌 전체 통계**이며 저장 경기 통계는 각 플레이어의 `/match-stats`에서 별도로 조회한다. 캐시가 없는 세 명 조회는 정상적으로 최대 6회(닉네임·시즌 통계 각 3회)의 공식 API 호출을 시도하며, 기존 BSER 요청 큐 제한을 적용한다.
비교 요청에서 큐 제한에 걸린 플레이어는 전체 응답을 실패시키지 않고 해당 결과에 `status=error`, `code=BSER_RATE_LIMITED`, `retryAfter`(초)를 표시한다. 비교 응답 자체는 기존 계약대로 HTTP 200이다.

### 전적·공식 시즌 통계 강제 갱신

```http
POST /v1/players/%ED%85%8C%EC%8A%A4%ED%84%B0/refresh
Content-Type: application/json

{"seasonId":41,"matchingMode":3}
```

`seasonId`와 `matchingMode`는 비교 API와 같은 숫자 범위를 사용한다. 이 요청은 전적 300초·공식 통계 600초 TTL을 무시하고 두 영역을 갱신한다. 저장 경기 기준 `/match-stats`는 갱신된 전적을 다음 조회에서 집계한다. 같은 프로세스에서 같은 닉네임·시즌·모드 갱신이 겹치면 각 영역의 외부 요청을 공유한다.

두 영역이 성공하면 HTTP 200과 `refreshStatus=updated`를 반환한다. 공식 시즌 기록이 없어 `seasonStats.status=no_stats`인 경우도 확인 완료로 처리한다. 하나라도 실패하면 HTTP 오류와 `refreshStatus=partial` 또는 `failed`, 각 영역의 `status`와 실패 `code`를 반환한다. 성공한 영역은 이미 DB에 반영될 수 있으므로 부분 실패 후 재요청할 수 있다. 저장된 데이터가 있더라도 이번 명시적 갱신 실패를 성공이나 `isStale=true`로 바꾸지 않는다. 양쪽 모두 플레이어 없음이면 404, 공식 API 요청 제한이면 429, 일반 외부 장애면 502, 내부 오류면 500이다.

```json
{
  "nickname": "테스터", "seasonId": 41, "matchingMode": 3,
  "refreshStatus": "updated",
  "matches": { "status": "updated", "lastSyncedAt": "2026-10-15T00:00:00.000Z" },
  "seasonStats": { "status": "no_stats", "fetchedAt": null }
}
```

공개 강제 갱신 경로는 Redis 연결과 무관한 갱신 전용 가드로 Express가 판별한 IP별 60초당 5회로 제한한다. 전달 헤더를 직접 신뢰하지 않는다. 이 제한은 프로세스 메모리에 있으므로 여러 인스턴스 간 전역 제한은 제공하지 않는다. 프록시 뒤에서는 신뢰할 프록시 설정이 없을 경우 여러 사용자가 하나의 IP로 묶일 수 있다. 배포 시 프록시 설정과 공유 제한을 함께 검토한다.

```sh
npm test
TEST_DATABASE_URL='postgres://user:password@localhost:5432/ermeta_test' npm run test:player-season-stats
TEST_DATABASE_URL='postgres://user:password@localhost:5432/ermeta_test' npm run test:player-match-stats
npm run test:player-compare
npm run test:player-refresh
```

DB 통합 테스트를 실행할 때는 테스트 전용 DB에 먼저 마이그레이션을 적용한다. `npm test`는 최근 전적과 시즌 통계의 단위 테스트를 모두 실행하며, `TEST_DATABASE_URL`이 없으면 DB 통합 테스트를 건너뛴다. `backend/**` 변경 PR의 GitHub Actions도 `npm test`를 실행한다.
