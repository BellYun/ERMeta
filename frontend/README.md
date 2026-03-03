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
