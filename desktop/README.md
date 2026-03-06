# ERMeta Desktop (Electron)

Windows EXE 배포를 위한 Electron 앱입니다.

## 기능

- Steam OpenID 로그인 (시스템 브라우저 + `ermeta://` 딥링크)
- Eternal Return `Player.log` 실시간 테일링
- 로그에서 감지한 캐릭터/파티 인원 기준 조합 추천 조회

## 환경 변수

`desktop/.env` 또는 OS 환경 변수로 설정:

- `ERMETA_API_BASE_URL` (기본값: `http://localhost:3000`)
- `ERMETA_PLAYER_LOG_PATH` (선택, 기본값은 Windows 표준 경로)

Next 서버(`frontend`)에는 아래 값이 필요:

- `STEAM_WEB_API_KEY`
- `STEAM_AUTH_TOKEN_SECRET` (없으면 `CRON_SECRET` fallback)
- `STEAM_APP_TOKEN_TTL_SEC` (선택)

## 개발 실행

```bash
cd desktop
npm install
npm run dev
```

동시에 `frontend`도 실행되어 있어야 인증/추천 API가 동작합니다.

```bash
cd frontend
npm run dev
```

## Windows EXE 빌드

```bash
cd desktop
npm install
npm run dist:win
```

결과물은 `desktop/dist` 하위에 생성됩니다.

## 테스트용 무결성 체크 우회 실행

NSIS 무결성 오류를 테스트 목적으로만 우회하려면:

```bash
cd desktop
npm run installer:ncrc
```

빌드 후 바로 우회 실행:

```bash
npm run dist:win:test
```

`/NCRC`는 테스트 전용이며, 실제 배포에는 사용하지 않는 것을 권장합니다.
