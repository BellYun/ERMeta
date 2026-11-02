# 수동 연구·운영 도구

서비스 코드와 분리한 수동 실행 도구입니다. Node.js 내장 모듈만 사용하며 추가 패키지 설치는 필요하지 않습니다. 아래 명령은 별도 설명이 없으면 **저장소 루트**에서 실행합니다.

## 도구 구분

| 경로                                            | 목적                                                        | 외부 통신           | 파일 변경                                                   |
| ----------------------------------------------- | ----------------------------------------------------------- | ------------------- | ----------------------------------------------------------- |
| `composition/`                                  | 과거 조합 연구 결과에 핑거프린트·수동 그룹·비교 시각화 추가 | 없음                | 로컬 `DATA/trio-role-combinations/`의 HTML 생성·수정        |
| `synergy/build-synergy-pairs.mjs`               | 저장된 캐릭터별 원본 JSON으로 동료 시너지 계산              | 없음                | `frontend/public/data/synergy-pairs/*.json` 생성·덮어쓰기   |
| `synergy/generate-trio-pair-templates.mjs`      | 과거 10.x 조합 SQL·JSON 템플릿 생성                         | 없음                | `backend/manual_sql/trio_pair_synergy/`의 SQL·JSON 덮어쓰기 |
| `synergy/fetch-and-build-trio-pair-synergy.mjs` | Supabase RPC 결과를 저장한 뒤 시너지 빌드                   | Supabase RPC        | 원본 JSON과 공개 시너지 JSON 덮어쓰기                       |
| `legacy/`                                       | 구형 이미지 매핑 스크립트 보존                              | 로컬 개발 서버 HTTP | 구형 아이템 이미지 매핑 JSON                                |

## 조합 연구 도구

입력 자료인 `DATA/trio-role-combinations/`는 현재 `main`에 포함되어 있지 않습니다. 보존한 분석 자료를 해당 위치에 준비한 뒤 실행합니다. 파일 경로는 스크립트 위치를 기준으로 계산하므로 다른 작업 디렉터리에서도 같은 자료를 사용합니다.

| 파일                                   | 작업                                                                      |
| -------------------------------------- | ------------------------------------------------------------------------- |
| `build-all-characters-fingerprint.mjs` | `raw_character_multiset.json`에서 전체 캐릭터·무기의 핑거프린트 HTML 생성 |
| `append-handcrafted-groups.mjs`        | 수동으로 작성한 그룹 해설 추가                                            |
| `append-manual-grouping.mjs`           | 수동 그룹 분류 UI 추가                                                    |
| `append-overlay-fingerprint.mjs`       | 핑거프린트 겹침 비교 추가                                                 |
| `append-pair-fingerprint-cards.mjs`    | 파트너 역할 조합별 핑거프린트 카드 추가                                   |
| `append-pair-fingerprint.mjs`          | 파트너 역할 조합별 핑거프린트 추가                                        |
| `append-similarity-matrix.mjs`         | 유사도 행렬 추가                                                          |

```bash
node tools/composition/build-all-characters-fingerprint.mjs
node tools/composition/append-manual-grouping.mjs
```

각 append 스크립트는 서로 다른 기존 HTML을 입력으로 사용합니다. 파일 상단의 `ROOT`, `TARGET_FILE` 등 입력 경로를 확인하세요. 전체 실행 순서가 있는 통합 파이프라인은 아닙니다.

## 수동 시너지 작업

기존 `backend/manual_sql/trio_pair_synergy/` 원본 자료를 계속 사용합니다. 스크립트 이동으로 집계 기준이나 결과 형식은 바뀌지 않습니다.

저장된 자료만으로 특정 캐릭터를 빌드하려면:

```bash
node tools/synergy/build-synergy-pairs.mjs 001 005
```

캐릭터 코드를 생략하면 `soloBaseline`, `pairs`가 채워진 모든 JSON을 처리합니다.

Supabase에서 다시 가져와 빌드하려면:

```bash
node tools/synergy/fetch-and-build-trio-pair-synergy.mjs 1 5
```

- `frontend/.env`의 `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`를 읽습니다.
- `backend/migrations/016_trio_pair_synergy_rpc.sql`의 `get_trio_pair_synergy`, `get_solo_baseline` RPC가 필요합니다.
- 지정 캐릭터마다 RPC를 두 번 호출하며, 코드를 생략하면 기존 87개 캐릭터 전체를 수집합니다.
- 수집 후 빌드 단계는 원본 자료가 채워진 모든 캐릭터를 다시 처리합니다.
- 사용자 요청이나 CI에 연결하지 않고, 필요한 캐릭터를 지정해 수동 실행합니다.

과거 10.x 기준 템플릿을 다시 생성하려면:

```bash
node tools/synergy/generate-trio-pair-templates.mjs
```

기존 87개 캐릭터의 SQL·JSON을 덮어씁니다. 채워 둔 통계를 유지하려면 원본 자료를 먼저 별도로 보존해야 합니다. 최신 패치용 수집기로 사용하지 않습니다.

## 구형 도구 보존

`legacy/generate_item_image_map.js`는 과거 `/api/bser/l10n/English` 응답과 `frontend/public/Item/` 파일명으로 이미지를 매핑하던 스크립트입니다. 기존 출력 경로는 `frontend/src/const/itemImageMap.json`이며 현재 서비스의 `frontend/const/itemImageMap.json`과 다릅니다. 현재 데이터 생성 흐름에 연결하지 않으며, 재사용하려면 구형 API·경로 계약을 먼저 검토해야 합니다.

## 기존 위치를 유지하는 스크립트

- `frontend/scripts/`: npm 명령, CI 성능 검사, Playwright 실행, 스프라이트·번역·연구소 데이터 생성
- `backend/scripts/migrate-player-history.js`: 플레이어 DB 마이그레이션
- `.github/scripts/`: GitHub Actions 연동
- `desktop/scripts/`: Electron 설치 프로그램 실행

생성 파일은 직접 수정하지 않고 해당 생성 스크립트를 사용합니다. 연구 근거와 해석은 [`knowledge/eternal-return/`](../knowledge/eternal-return/README.md)에 보존합니다.
