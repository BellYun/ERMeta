# ERMeta

ERMeta는 Next.js(App Router) 기반 프론트엔드 저장소입니다.  
현재 코드는 초기 셋업 단계이며, 기본 페이지와 운영 점검용 API 라우트가 포함되어 있습니다.

## 프로젝트 구조

```text
ERMeta/
├── README.md
├── PAGE_STRUCTURE.md
└── frontend/
    ├── package.json
    └── src/
        ├── app/
        │   ├── page.tsx
        │   └── api/
        │       ├── frontendHealth/route.ts
        │       ├── test-env/route.ts
        │       └── db/test/route.ts
        └── lib/
            └── env.ts
```

## 요구 사항

- Node.js `>= 20.9.0`
- npm
- Supabase 프로젝트(URL + Key)

## 로컬 실행

```bash
cd frontend
npm install
npm run dev
```

브라우저에서 `http://localhost:3000` 접속.

## 환경 변수

`frontend/.env.local` 파일을 생성하고 아래 값을 설정하세요.

```bash
BSER_API_KEY=your_bser_key
CRON_SECRET=your_cron_secret
NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
# 또는
# SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

필수 규칙:
- `BSER_API_KEY`, `CRON_SECRET`, `NEXT_PUBLIC_SUPABASE_URL`는 필수입니다.
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` 또는 `SUPABASE_SERVICE_ROLE_KEY` 중 하나는 반드시 필요합니다.

## 점검 API

개발 서버 실행 후:

```bash
curl http://localhost:3000/api/frontendHealth
curl http://localhost:3000/api/test-env
curl http://localhost:3000/api/db/test
```

의미:
- `/api/frontendHealth`: 프론트 서버 헬스체크
- `/api/test-env`: 필수 환경 변수 누락 여부 검사
- `/api/db/test`: Supabase health endpoint 도달 가능 여부 검사

## 스크립트

`frontend/package.json` 기준:

```bash
npm run dev
npm run build
npm run start
npm run lint
```

## 현재 상태 메모

- 루트 페이지(`/`)는 Next.js 기본 템플릿 상태입니다.
- 본격 기능(전적 조회/메타 분석/수집 파이프라인)은 아직 이 레포에 구현되지 않았습니다.
