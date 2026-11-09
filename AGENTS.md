# Repository Agent Instructions

ER&GG(이리와지지)는 이터널리턴 전적 및 메타 분석 서비스입니다.
모든 에이전트는 아래 지침과 프로젝트 고유의 아키텍처, 성능, 그리고 **비용 제약**을 엄격히 준수해야 합니다.

---

## 1. 프로젝트 구조 및 작업 경로

이 저장소는 서브프로젝트로 분리되어 있습니다. 작업 수행 및 명령어 실행 시 디렉터리를 반드시 구분하세요.

- **Frontend (`frontend/`)**: Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS v4, Zustand, TanStack Virtual
- **Backend (`backend/`)**: NestJS 11, TypeScript, Supabase (PostgreSQL), Redis (L1/L2), Dockerfile.player-api (Cloud Run)
- **Database & Pipeline (`supabase/`, `DATA/`)**: Supabase 마이그레이션, Edge Functions, 데이터 수집 파이프라인
- **Root (`./`)**: 공용 Vitest 설정 및 Husky 훅

> [!IMPORTANT]
> 코드 수정 및 검증 명령어는 반드시 해당 서브 디렉터리(`cd frontend` 또는 `cd backend`)로 이동한 후 실행해야 합니다.

---

## 2. 비용 및 리소스 영향 사전 고려 (Cost-Aware Guidelines)

에이전트는 코드나 아키텍처를 변경하기 전, **"이 변경이 인프라 비용(Supabase, Vercel)과 유지보수 비용에 어떤 영향을 미치는가?"**를 반드시 사전에 검토해야 합니다.

### 인프라 및 운영 비용 방어 (Vercel & Supabase)
- **Supabase DB 쿼리 최소화**:
  - 원본 매치/게임 로그(`ProcessedGame` 등)를 클라이언트 요청 시점에 실시간 전수 스캔하는 쿼리를 절대 작성하지 않습니다.
  - 반드시 사전 집계 테이블(`CharacterStats`, `CharacterTrioByWeapon` 등)이나 canonical key 인덱스를 활용합니다.
- **Vercel Function & ISR 호출 비용 통제**:
  - 패치 분석, 캐릭터 상세 등은 On-Demand Revalidation을 남발하지 않고, 데이터 갱신 주기에 맞춘 적절한 TTL(SWR/s-maxage)을 유지합니다.
  - 불변 데이터와 정적 리소스는 Browser/CDN 캐시를 최대한 활용해 서버리스 함수(Serverless Function) 실행 횟수를 최소화합니다.
- **BSER API Rate Limit 보호**:
  - 사용자 요청 흐름에서 외부 BSER API를 직접 동기 호출하지 않습니다. 반드시 수집 파이프라인(Edge Collector)이나 L1/L2 캐시를 경유해야 합니다.

### 번들 크기 및 유지보수 비용 최소화
- **불필요한 의존성(npm 패키지) 추가 금지**:
  - 단순 유틸 함수나 아이콘을 위해 새로운 라이브러리를 설치하지 마세요. 이미 설치된 의존성(`lucide-react`, `tailwind-merge`, Node.js 내장 모듈 등)을 재사용합니다.
- **Diff 최소화 (Zero Unnecessary Refactoring)**:
  - 요청받은 작업과 직접 관련 없는 주변 코드나 포맷팅을 광범위하게 수정하여 토큰을 낭비하거나 리뷰 비용을 높이지 않습니다.
  - 수정 전 **"최소한의 파일과 변경량으로 요구사항을 달성할 수 있는 경로"**를 먼저 판단합니다.

### AI 에이전트 토큰 최적화 (Token-Aware Engineering)
- **로컬 스크립트 오프로딩 (Code Offloading)**:
  - 통계 계산이나 대량 데이터 가공을 LLM이 직접 수행하지 말고, `frontend/scripts/`에 있는 전처리/분석 스크립트를 우선 실행해 요약 결과(NDJSON 등)만 컨텍스트에 담습니다.
- **On-Demand Skill 및 지식 베이스 참조**:
  - 3인 조합 전술 분석, 패치 영상 기획 등 고유 도메인 작업 시에는 임의로 추론하지 말고 `.agents/skills/` 및 `knowledge/` 문서를 참조합니다.
- **정적 감사(Audit) 스크립트 활용**:
  - 생성 결과물의 유효성은 LLM에게 재질의하지 말고, 관련 감사 스크립트(`audit-*.mjs`)를 실행해 정적 검증을 거칩니다.

---

## 3. 작업 후 필수 자가 검증 (Verification Commands)

코드 작업을 완료한 후 작업을 끝내기 전 반드시 아래 명령어로 자가 검증을 수행해야 합니다.

### Frontend
```bash
cd frontend
npm run lint          # ESLint 검증
npm test              # Vitest 단위 테스트
npm run build         # Next.js 프로덕션 빌드 (타입 검사 포함)
# E2E 테스트 검증 필요 시 (Fixture 모드로 실행)
PATCH_PAGE_TEST_FIXTURES=1 npm run test:e2e
```

### Backend
```bash
cd backend
npm run lint          # ESLint 검증
npm run build         # NestJS 빌드
npm run test          # 단위/통합 테스트
```

---

## 4. 프론트엔드 아키텍처 및 성능 제약

1. **Server vs Client Component 경계**:
   - 데이터 페칭 및 조회 페이지는 Server Component(RSC)를 기본으로 하며, 정적 생성(SSG/ISR)을 우선합니다.
   - 필터 조작, 모달, 탭, 터치 인터랙션 등 사용자 입력이 필요한 영역만 `'use client'`로 최소 분리합니다.
2. **모바일 상호작용 및 INP 성능 예산 (250ms)**:
   - 3인 조합/캐릭터 분석 등 긴 목록과 그리드는 반드시 `@tanstack/react-virtual` 가상화를 유지해야 합니다.
   - 즉각적인 탭 피드백과 무거운 상세 패널 렌더링은 `React.startTransition`을 활용해 분리합니다.
   - 레이아웃 이동(CLS)을 방지하기 위해 스켈레톤과 카드 높이 고정 규칙을 준수합니다.
3. **다국어(i18n)**:
   - 다국어는 `next-intl`을 사용하며 한국어(ko), 영어(en), 일본어(ja)를 지원합니다.
   - UI 문구 하드코딩을 지양하고 `messages/` 번역 키를 준수합니다.
4. **자동 생성 파일(`generated/`)**:
   - `frontend/src/generated/` 내부 파일(스프라이트 맵, 스킬 아이콘 맵, 캐릭터 메타 등)은 직접 수정하지 말고 `frontend/scripts/build-*.mjs` 스크립트를 통해 생성합니다.

---

## 5. 백엔드 및 도메인 불변식 (Invariants)

1. **3인 조합 Canonical Key**:
   - 3인 캐릭터 조합을 다룰 때는 순서에 영향을 받지 않도록 정규화된 Canonical Key(정렬된 캐릭터/무기 ID 조합)를 보존해야 합니다.
2. **조회 최적화 및 Supabase 쿼리**:
   - 통계 조회 기능은 원본 매치 로그 테이블을 풀 스캔하지 않고, 사전 집계 테이블과 인덱스를 활용합니다.

---

## 6. Git, Commit 및 PR 규칙

1. **Pull Request 상태**:
   - 사용자가 명시적으로 Draft를 요청하지 않는 한, PR은 항상 **Ready for Review** 상태로 생성합니다.
   - PR 설명은 `.github/pull_request_template.md` 양식을 따릅니다.
2. **커밋 메시지 및 PR 제목 규칙**:
   - 커밋 메시지: `<type>: <한국어 요약>` (관련 이슈가 있을 경우: `<type>: <한국어 요약> (#이슈번호)`)
   - PR 제목: 커밋 메시지와 동일하게 Conventional Commits 접두사 + 한국어 요약으로 작성합니다.
   - 허용 접두사: `feat`, `fix`, `refactor`, `style`, `docs`, `test`, `chore`, `perf`
   - *예시: `feat: 실험체 폭 기반 3인큐 조합 추천 추가 (#334)`*
   - *예시: `fix: 패치 분석 ISR 재생성 비용 최적화 (#340)`*
3. **브랜치 네이밍**:
   - `feat/#<이슈번호>`, `fix/#<이슈번호>`, 또는 작업 내용 요약 형식을 사용합니다.
