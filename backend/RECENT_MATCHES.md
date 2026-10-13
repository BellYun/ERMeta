# 최근 전적 조회

멀티서치 화면의 닉네임 입력 옆 **최근 전적** 버튼이 Next.js 서버 경로를 거쳐 NestJS `GET /multi-search/recent-matches`를 호출합니다. NestJS는 닉네임을 공식 BSER API의 임시 UID로 바꾼 다음 최근 경기 목록을 조회합니다. 브라우저는 BSER API 키를 받지 않습니다.

## 로컬 실행

1. `backend/.env.example`을 참고해 `backend/.env`에 `BSER_API_KEY`를 설정합니다. 이 파일은 Git에 올리지 않습니다.
2. 백엔드에서 `npm run start:dev`를 실행합니다.
3. 프론트엔드 서버 환경에 `ENABLE_MULTI_SEARCH=true`와 `MULTI_SEARCH_API_BASE_URL=http://localhost:4000`을 설정하고 `npm run dev`를 실행합니다.

## API 계약

`GET /multi-search/recent-matches?nickname=닉네임&limit=10`

- `nickname`: 공백을 제거한 1~16자 문자열, 필수
- `limit`: 1~20 정수, 기본값 10
- `status`: `ok`, `not_found`, `no_matches`, `error` 중 하나
- `matches`: 최근순 목록. 각 항목은 `gameId`, `startDtm`, `seasonId`, `matchingMode`, `matchingTeamMode`, `characterNum`, `gameRank`, `playerKill`, `playerAssistant`를 포함합니다.
- `reason`: 오류 시 `bser_api_key_missing`, `bser_api_unavailable`, `unknown_error` 등

공식 API는 [최근 90일 경기](https://developer.eternalreturn.io/static/media/OpenAPI_EN_20260917_01.html)만 제공하며, 닉네임 변경 이전 경기는 포함되지 않을 수 있습니다. NestJS는 닉네임 조회와 경기 조회 모두 기존 BSER 요청 제한 장치를 사용하고, 최근 경기 요약 최대 20건을 2분간 Redis에 캐시합니다. Redis가 없어도 조회는 가능하지만 공유 캐시는 사용되지 않습니다.

이 경로의 `status`는 전적 조회의 결과를 나타내며 HTTP 응답은 정상 처리 시 200입니다. 입력 검증 실패는 400입니다. 외부 API 장애는 `status: error`와 `reason`으로 구분합니다. 프론트엔드는 기존 멀티서치 기능 플래그를 따릅니다.

검증: `npm run test:recent-matches`는 공식 UID 응답 매핑, 경기 조회 경로, 응답 필드 제한, 빈 결과와 장애 구분을 확인합니다.
