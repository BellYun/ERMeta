# ERMeta Backend

## 단일 플레이어 전적 개발 (#300)

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

`backend/**` 변경 PR의 GitHub Actions는 Node.js 22에서 빌드한 뒤 `npm run test --if-present`를 실행한다. 현재는 표준 `test` 스크립트가 없어 빌드만 검증한다. 이후 `backend/package.json`에 `test` 스크립트를 추가하면 같은 CI에서 자동으로 실행된다. 프론트와 백엔드를 함께 변경한 PR에는 두 CI가 모두 실행된다.
