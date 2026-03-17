<div align="center">

# ER&GG — 이리와지지

**이터널리턴 메타 분석 서비스**

[![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-3FCF8E?logo=supabase&logoColor=white)](https://supabase.com/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-v4-38BDF8?logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)

[erwagg.com](https://erwagg.com) · 캐릭터 티어 · 빌드 추천 · 3인 조합 분석

</div>

---

## Overview

ER&GG(이리와지지)는 **이터널리턴(Eternal Return)** 게임의 실시간 통계를 기반으로 캐릭터 메타를 분석하는 서비스입니다.

패치별 승률·픽률·RP 데이터를 수집하고, Bayesian 보정 스코어링으로 신뢰도 높은 티어와 빌드를 추천합니다.

## Features

| 기능 | 설명 |
|------|------|
| **캐릭터 티어표** | 패치·티어별 승률/픽률/평균RP 기반 S~D 등급 분류 |
| **꿀챔 TOP 5** | 이번 패치 급상승 캐릭터 자동 감지 (트렌드 분석) |
| **캐릭터 상세 분석** | 무기·특성·장비 빌드를 복합 스코어로 추천 |
| **3인 조합 추천** | 86명 캐릭터 조합 중 최적의 시너지 탐색 |
| **패치 비교** | 이전 패치 대비 변동폭 시각화 |
| **OG 이미지 생성** | 조합 결과를 소셜 공유용 이미지로 자동 생성 |

## Tech Stack

```
Frontend     Next.js 16 (App Router) · React 19 · TypeScript 5
Backend      NestJS 11 · Node.js · TypeScript
Styling      Tailwind CSS v4 · CSS Variables · Dark Theme
Database     Supabase (PostgreSQL + RLS)
Cache        Redis (L1 In-Memory + L2 Redis 2-Tier)
Data         BSER Open API · 5분 주기 자동 수집
Charts       Recharts 3
Analytics    Vercel Analytics · Amplitude · Google Analytics
Desktop      Electron (Windows EXE)
```

## Project Structure

```
ERMeta/
├── frontend/                    # 메인 웹 서비스
│   ├── src/
│   │   ├── app/                 # App Router 페이지 & API 라우트
│   │   │   ├── page.tsx                    # 홈 (메타 분석 대시보드)
│   │   │   ├── character-analysis/         # 캐릭터 상세 분석
│   │   │   ├── synergy/                    # 3인 조합 추천
│   │   │   └── api/                        # REST API 엔드포인트
│   │   ├── components/
│   │   │   ├── ui/              # 공통 UI (Button, Card, Badge, Table...)
│   │   │   ├── layout/          # Header, Navigation
│   │   │   ├── features/        # 도메인 컴포넌트
│   │   │   └── character/       # 캐릭터 분석 전용 컴포넌트
│   │   ├── lib/                 # 유틸리티 & 설정
│   │   ├── data/                # 패치 데이터 (10.1~10.4)
│   │   └── utils/               # 범용 헬퍼
│   └── public/                  # 정적 에셋 (캐릭터 이미지, 아이콘)
├── desktop/                     # Electron 데스크톱 앱
├── const/                       # 공유 상수 (무기, 아이템, 캐릭터 매핑)
├── DATA/                        # 분석 문서 & 기획서
└── docs/                        # 프로젝트 문서
```

## Getting Started

### Prerequisites

- **Node.js** >= 20.9.0
- **npm**
- Supabase 프로젝트 (URL + Key)
- BSER API Key ([developer.eternalreturn.io](https://developer.eternalreturn.io))

### Installation

```bash
# 레포 클론
git clone https://github.com/BellYun/ERMeta.git
cd ERMeta/frontend

# 의존성 설치
npm install

# 환경 변수 설정
cp .env.example .env.local
```

### Environment Variables

`.env.local` 파일에 다음 값을 설정하세요:

```bash
# === 필수 ===
BSER_API_KEY=               # BSER Open API 키
CRON_SECRET=                # 스케줄링 작업 인증
NEXT_PUBLIC_SUPABASE_URL=   # Supabase 프로젝트 URL
# 아래 둘 중 하나 필수
NEXT_PUBLIC_SUPABASE_ANON_KEY=
# SUPABASE_SERVICE_ROLE_KEY=

# === 선택 ===
STEAM_WEB_API_KEY=          # Steam OpenID (데스크톱 연동)
STEAM_AUTH_TOKEN_SECRET=    # 토큰 서명 시크릿
GOOGLE_SHEETS_WEBHOOK_URL=  # 피드백 수집
NEXT_PUBLIC_GA_ID=          # Google Analytics
```

### Run

```bash
# 개발 서버
npm run dev
# → http://localhost:3000

# 프로덕션 빌드
npm run build && npm run start

# 린트
npm run lint
```

## API Routes

| Endpoint | Method | 설명 |
|----------|--------|------|
| `/api/patches/history` | GET | 패치 목록 조회 |
| `/api/character/mithril-rp-ranking` | GET | 캐릭터 티어 랭킹 |
| `/api/character/stats/:code` | GET | 캐릭터 상세 스탯 |
| `/api/meta/honey-picks` | GET | 꿀챔 TOP 5 |
| `/api/meta/trending` | GET | 트렌드 캐릭터 |
| `/api/builds/equipment` | GET | 장비 빌드 |
| `/api/builds/traits/main` | GET | 메인 특성 |
| `/api/builds/traits/options` | GET | 특성 옵션 |
| `/api/stats/trios` | GET | 3인 조합 통계 |
| `/api/og/synergy` | GET | 조합 OG 이미지 생성 |
| `/api/frontendHealth` | GET | 서버 헬스체크 |

## Desktop App

Windows 데스크톱 앱은 Steam 인증 기반의 부가 클라이언트입니다.

```bash
cd desktop
npm install
npm run dev          # 개발 모드
npm run dist:win     # Windows EXE 빌드
```

## Architecture Highlights

- **4-Tier 캐싱** — Server(5~30m) → CDN/Edge → Browser HTTP Cache → 프리셋(immutable/slow/daily/frequent)
- **Bayesian 스코어링** — 소표본 노이즈를 보정한 빌드·캐릭터 추천
- **Server/Client 분리** — Server Components로 초기 로드 최적화, Client Components는 인터랙션 전용
- **URL 상태 동기화** — `?patch=...&tier=...` 파라미터로 필터 상태 공유 & 딥링크 지원
- **Dynamic OG** — 조합 결과를 이미지로 렌더링하여 소셜 미리보기 지원

## Contributing

1. `main`에서 feature 브랜치 생성 (`feat/#이슈번호`)
2. 변경 사항 커밋
3. PR 생성 → 리뷰 → 머지

## License

Private — All rights reserved.

---

<div align="center">

**[erwagg.com](https://erwagg.com)**

*이터널리턴, 데이터로 이기자.*

</div>
