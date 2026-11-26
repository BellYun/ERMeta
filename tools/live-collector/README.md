# ER&GG Worker A: 13.2 실시간 수집 & Supabase 스냅샷 업로더 (`tools/live-collector`)

13.2 패치 랭크 매치를 실시간으로 수집하여 **로컬 원본 압축 저장**과 **단일 캐릭터 통계 선집계**를 동시에 처리하고, 완성된 스냅샷만 Supabase(Free Tier)로 주기적 멱등 UPSERT하는 독립 서버입니다.

- **1 RPS (1,000ms 간격)**: 당일 실시간 랭크 매치 100% 추적 (Worker B 원본 저장 역할 통합)
- **트리오 완전 배제 & 단일 캐릭터 특화**: Supabase 용량을 수십 MB 내로 묶어 **500MB 무료 한도 완벽 방어**
- **1시간 주기 업로드**: `v2_CharacterStats` 단일 배치 UPSERT (0.2초 컷, I/O 0%)
- **6시간 주기 업로드**: 장비 빌드, 특성, 스킬 순서, 시작 루트, 전술 스킬 (`totalGames >= 3` 컷 적용, 500행 단위 청크 UPSERT)
- **실시간 웹 대시보드**: `http://127.0.0.1:4320`

---

## 빠른 시작

저장소 루트에서 실행합니다 (`BSER_API_KEY` 및 Supabase 접속 정보는 `backend/.env` 또는 `frontend/.env`에서 자동 로드됩니다).

```bash
# 1. 서버만 띄우기 (대시보드에서 시작/일시정지 제어)
node tools/live-collector/server.mjs

# 2. 13.2 특정 시작 번호부터 즉시 자동 수집 시작
START_GAME_ID=68500000 AUTO_START=1 node tools/live-collector/server.mjs
```

실행 후 브라우저에서 **`http://127.0.0.1:4320`** 으로 접속하면 실시간 수집 현황과 누적된 캐릭터 통계 행 수, 다음 업로드까지 남은 시간을 확인하고 수동 업로드 버튼을 사용할 수 있습니다.

---

## 주요 환경변수

| 변수 | 기본값 | 설명 |
| :--- | :--- | :--- |
| `PORT` | `4320` | 로컬 웹 대시보드 포트 (Worker C의 `4310`과 충돌 방지) |
| `HOST` | `127.0.0.1` | 바인드 주소 |
| `TARGET_PATCH` | `13.2` | 수집 및 집계 대상 패치 버전 |
| `START_GAME_ID` | `68500000` | 최초 실행 시 시작할 게임 번호 (`state.json` 존재 시 기존 커서 우선) |
| `INTERVAL_MS` | `1000` | 요청 간격 (1 RPS = 1000ms) |
| `CHUNK_SIZE` | `500` | 원본 회전 압축할 경기 수 (`raw/13.2/games_*.ndjson.gz`) |
| `UPLOAD_1H_INTERVAL_MS` | `3600000` | 기본 통계(`v2_CharacterStats`) 업로드 주기 (기본 1시간) |
| `UPLOAD_6H_INTERVAL_MS` | `21600000` | 상세 빌드 통계 업로드 주기 (기본 6시간) |
| `DETAIL_MIN_GAMES` | `3` | 6시간 상세 통계 업로드 시 노이즈 컷팅 판수 (기본 3판 이상) |
| `AUTO_START` | `0` | `1` 설정 시 서버 부팅 즉시 수집 시작 |

---

## 듀얼 워커 운영 요약 (노트북 동시 실행)

동일한 노트북에서 터미널 창 2개를 열어 10 RPS 대역폭을 나누어 운영합니다:

1. **터미널 1 — Worker A (현재 13.2 통계 + 원본, 1 RPS)**
   ```bash
   node tools/live-collector/server.mjs
   # 대시보드: http://127.0.0.1:4320
   ```
2. **터미널 2 — Worker C (과거 12.3 ➔ 12.7 원본 초고속 백필, 8~8.5 RPS)**
   ```bash
   INTERVAL_MS=120 AUTO_START=1 node tools/collector/server.mjs
   # 대시보드: http://127.0.0.1:4310
   ```
