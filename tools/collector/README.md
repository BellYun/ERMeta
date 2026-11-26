# ER&GG 로컬 상세 수집기 서버 (`tools/collector`)

노트북에서 BSER Open API(`GET /v1/games/{gameId}`) 전체 경기 JSON을 로컬에 안전하게 수집·압축 보관하기 위한 **무의존성(Node.js 내장 모듈 전용)** HTTP 서버입니다.

## 빠른 시작

저장소 루트에서 실행합니다 (`BSER_API_KEY`는 `backend/.env` 또는 `frontend/.env`에서 자동 로드됩니다).

```bash
# 1. 서버만 띄우기 (대시보드에서 시작/일시정지 제어)
node tools/collector/server.mjs

# 2. 12.1 생존 최소 ID(63777159)부터 즉시 자동 수집 시작
START_GAME_ID=63777159 AUTO_START=1 node tools/collector/server.mjs

# 3. 13.0 최신 구간(예: 67633001)부터 즉시 자동 수집 시작
START_GAME_ID=67633001 AUTO_START=1 node tools/collector/server.mjs
```

실행 후 브라우저에서 **`http://127.0.0.1:4310`** 으로 접속하면 실시간 수집 현황 대시보드와 시작/일시정지/커서 이동 버튼을 사용할 수 있습니다.

## 주요 환경변수

| 변수 | 기본값 | 설명 |
| --- | --- | --- |
| `PORT` | `4310` | 로컬 HTTP 서버 포트 |
| `HOST` | `127.0.0.1` | 바인드 주소 |
| `START_GAME_ID` | `63777159` | 최초 실행 시 시작할 `gameId` (`state.json`이 이미 있으면 기존 커서 우선) |
| `DIRECTION` | `forward` | `forward` (정방향) 또는 `backward` (역방향) |
| `INTERVAL_MS` | `105` | 요청 간격(ms, 최소 `50`ms — Personal 등급 10 req/s 상향 반영) |
| `CHUNK_SIZE` | `500` | 패치별 `.ndjson.gz`로 압축 회전할 경기 수 |
| `MAX_CONSECUTIVE_404` | `50` | 연속 `404` 발생 시 자동 일시정지 임계값 |
| `AUTO_START` | `0` | `1` 또는 `--auto-start` 전달 시 서버 부팅 즉시 수집 시작 |
| `DATA_DIR` | `tools/collector/data` | 수집 데이터 및 상태 저장 경로 (`.gitignore` 제외됨) |

## 저장 구조 (`tools/collector/data/`)

- `state.json`: 현재 `nextGameId`, 방향, 누적 통계, 활성 청크 상태 (원자적 저장으로 재시작 시 이어받기 지원)
- `index.ndjson`: 수집된 경기의 1줄 요약 인덱스 (`gameId`, `patch`, `seasonId`, `matchingMode`, `startDtm`, `players`)
- `active/active_<patch>.ndjson`: 현재 기록 중인 활성 청크 (비정상 종료 시에도 손실 방지)
- `raw/<patch>/games_<minId>_<maxId>.ndjson.gz`: `CHUNK_SIZE` 도달 시 자동 gzip 압축 보관되는 전체 원본 JSON

## HTTP API

- `GET /`: 웹 대시보드
- `GET /health`: 헬스체크 (`{"ok":true}`)
- `GET /status`: 현재 수집 상태 및 통계 JSON
- `POST /start`: 수집 시작/재개 (`{"startGameId": 63777159, "direction": "forward"}` 선택 전달 가능)
- `POST /pause`: 현재 요청 완료 후 일시정지
- `POST /flush`: 현재 `active/` 청크를 즉시 `.ndjson.gz`로 압축 보관

## 백그라운드 실행 예시 (macOS / Linux)

```bash
nohup env START_GAME_ID=63777159 AUTO_START=1 node tools/collector/server.mjs > tools/collector/data/collector.log 2>&1 &
```
