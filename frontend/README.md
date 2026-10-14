This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Desktop auth API

Electron 데스크톱 로그인 연동용 Steam OpenID 엔드포인트:

- `GET /api/auth/steam/start`
- `GET /api/auth/steam/callback`
- `GET /api/auth/me`

필수 환경 변수:

- `STEAM_WEB_API_KEY`
- `STEAM_AUTH_TOKEN_SECRET` (없으면 `CRON_SECRET` 사용)
- `STEAM_APP_TOKEN_TTL_SEC` (선택, 기본 86400초)
- `ENABLE_DESKTOP_AUTH` (선택, `false`면 desktop auth API 비활성화)

기존 웹 페이지/기능 서빙에는 영향을 주지 않는 부가 API입니다.

## 로컬 플레이어 API 연동

기본 멀티서치 화면은 기존 `/multi-search/players`·`/multi-search/recent-matches` 백엔드 경로를 사용합니다. 새 PostgreSQL 기반 NestJS 플레이어 API를 로컬에서 확인하려면 [백엔드 실행 안내](../backend/README.md)에 따라 DB 마이그레이션 후 백엔드를 실행하고, `frontend/.env.local`에 다음 서버 전용 설정을 추가합니다.

```dotenv
ENABLE_MULTI_SEARCH=true
PLAYER_API_BASE_URL=http://localhost:4000
```

프론트엔드를 다시 시작하면 기존 `/multi-search` 화면의 검색은 `POST /v1/players/compare`, 최근 전적은 `GET /v1/players/{nickname}/matches`를 사용합니다. 화면은 현재 시즌 39 랭크 모드에 맞춰 요청하며, 공식 시즌 통계와 저장된 최근 경기의 출처·갱신 시점·오래된 데이터 여부를 표시합니다. `PLAYER_API_BASE_URL`이 없으면 기존 경로를 유지합니다. API 키는 백엔드에만 설정하며 프론트엔드 환경변수에 넣지 않습니다.

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
