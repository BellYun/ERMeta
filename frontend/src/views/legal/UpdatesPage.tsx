import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "업데이트 내역",
  description: "이리와지지(ER&GG) 서비스 업데이트 내역",
  robots: { index: true, follow: true },
};

interface UpdateEntry {
  date: string;
  version?: string;
  changes: string[];
}

const updates: UpdateEntry[] = [
  {
    date: "2026-05-29",
    changes: [
      "11.3 패치 데이터 반영",
      "홈/캐릭터 분석 티어 필터에서 단일 미스릴 옵션 제거",
      "캐릭터 분석 페이지에 캐릭터 조합/역할 조합별 RP 추가 획득량 추가",
      "조합 실험실 상세보기와 목록 노출 범위 확장",
      "조합 추천 정렬과 티어 산정 기준 개편",
      "조합 추천에서 캐릭터/무기 조건에 맞는 후보 노출 개선",
      "조합 실험실을 무기 조합 기준으로 조회하도록 개선",
      "조합 상세보기 화면 구조와 핵심 지표 표시 개선",
      "11.1~11.3 조합 데이터를 함께 활용해 최신 실험체 조합 보강",
      "조합 실험실 일부 조건에서 500 오류가 발생하던 문제 수정",
      "메인/실험실 화면의 베타 표시와 불필요한 설명 문구 정리",
    ],
  },
  {
    date: "2026-05-26",
    changes: ["티어 필터의 단일/누적(+) 옵션 충돌 수정"],
  },
  {
    date: "2026-05-24",
    changes: [
      "캐릭터 유형 분석 페이지 추가",
      "조합 실험실 페이지 추가",
      "캐릭터 빌드 통계를 누적(+) 티어 기준으로 통일",
      "캐릭터 분석에 1000위권 필터 추가",
      "티어 선택 의미를 누적(+) 기준으로 정리",
    ],
  },
  {
    date: "2026-05-21",
    changes: [
      "트리오/통계 데이터 로딩 안정성 개선",
      "광고 영역 추가",
      "개인정보처리방침에 Google AdSense 쿠키 섹션 추가",
    ],
  },
  {
    date: "2026-05-19",
    changes: [
      "패치 버전 하드코딩 제거 및 최신 패치노트 자동 사용",
      "11.2 패치노트 데이터 추가",
      "신규 실험체 비형 데이터와 다국어 리소스 추가",
      "알렉스 통계를 무기군 무관 단일 직업군 기준으로 통합",
      "홈/랭킹/캐릭터 통계 로딩 속도 개선",
    ],
  },
  {
    date: "2026-05-08",
    changes: [
      "11.1 통계 제공",
      "통계 계산에서 11.0 패치 제외",
      "기본 티어 기준을 다이아몬드로 통일",
      "미스릴 컷 상향 및 플래티넘 티어 추가",
    ],
  },
  {
    date: "2026-05-07",
    changes: ["페어 시너지 기능 추가", "신규 아이템 및 패치노트 데이터 업데이트"],
  },
  {
    date: "2026-05-03",
    changes: ["조합 추천 데이터 정확도 개선", "소표본 기준을 20판으로 상향"],
  },
  {
    date: "2026-05-02",
    changes: ["다국어 페이지 안정성 개선", "캐릭터 상세 페이지 로딩 안정성 개선"],
  },
  {
    date: "2026-04-30",
    changes: [
      "시즌 리캡 기능 추가",
      "패치노트 기능 추가",
      "URL 우선 locale 라우팅과 언어 추천 배너 적용",
      "공유 링크와 언어별 메타데이터 표시 개선",
      "프리시즌/구버전 지표 노출 정리",
    ],
  },
  {
    date: "2026-04-28",
    changes: [
      "홈/랭킹/시너지 주요 화면 리디자인",
      "홈 필터 URL 동기화",
      "랭킹 모바일 탭 단순화",
      "피드백 보내기 기능 토글화",
    ],
  },
  {
    date: "2026-04-21",
    changes: ["공유 링크 기능 개선", "공유 미리보기 이미지 생성 기능 추가"],
  },
  {
    date: "2026-04-19",
    changes: ["접근성 개선", "일부 화면의 색상 대비와 키보드 접근성 개선"],
  },
  {
    date: "2026-04-16",
    changes: ["10.7 버전 데이터 추가"],
  },
  {
    date: "2026-04-15",
    changes: ["조합 상세 페이지 터치/스크롤 충돌 개선", "iOS Safari 탭 지연 대응"],
  },
  {
    date: "2026-04-14",
    changes: ["티어 세그먼트 접근성 구조 개선", "포커스 트랩과 키보드 네비게이션 보강"],
  },
  {
    date: "2026-04-13",
    changes: [
      "상세 조합 페이지 성능 개선",
      "모바일 터치 반응성 개선",
      "조합 카드 점진 렌더링 및 불필요한 재렌더 차단",
    ],
  },
  {
    date: "2026-04-12",
    changes: ["메인페이지 로딩 속도 개선", "꿀챔 소표본 제거", "움직임 줄이기 설정 대응"],
  },
  {
    date: "2026-04-04",
    changes: ["캐릭터 분석 UI 개선", "캐릭터 분석 진입 흐름 개선"],
  },
  {
    date: "2026-04-02",
    changes: [
      "캐릭터 분석/조합 추천 플로우 다국어화",
      "홈 대시보드와 랭킹 UI 다국어화",
      "언어 전환 및 전역 메타데이터 연결",
    ],
  },
  {
    date: "2026-03-30",
    changes: [
      "캐릭터 분석 페이지 초기 로딩 성능 개선",
      "나머지 패치 데이터 fetch 지연 로딩",
      "Recharts 번들 최적화",
    ],
  },
  {
    date: "2026-03-29",
    changes: ["캐릭터 분석 페이지 로딩 속도와 오류 화면 안정성 개선"],
  },
  {
    date: "2026-03-27",
    changes: ["메인 페이지 리디자인", "모바일/가로 스크롤 UI 개선"],
  },
  {
    date: "2026-03-25",
    changes: [
      "시너지 페이지 레이아웃 개선 (아군 선택/추천 조합 좌우 배치)",
      "상세 조합 추천 페이지 레이아웃 개선",
      "상세 조합 특성 브레이크다운 UI 개선 (특성 아이콘 추가, 클릭으로 펼치기)",
      "로딩 스켈레톤 UI 개선",
      "더보기 버튼 추가 (30개 단위 로드)",
    ],
  },
  {
    date: "2026-03-19",
    changes: ["무기군별 상세 조합 분석 페이지 추가"],
  },
  {
    date: "2026-03-15",
    changes: ["초성 검색 시 띄어쓰기 무시하도록 개선"],
  },
  {
    date: "2026-03-14",
    changes: ["모바일 반응형 UI 개선"],
  },
  {
    date: "2026-03-12",
    changes: [
      "도메인 변경: erwagg.com",
      "브랜딩 변경: LumiaStats → 이리와지지(ER&GG)",
      "SEO 메타데이터 및 파비콘 업데이트",
      "이용약관 / 개인정보처리방침 페이지 추가",
    ],
  },
  {
    date: "2026-03-10",
    changes: [
      "캐릭터 분석 페이지 추가 (장비/특성 빌드, 스킬 빌드)",
      "꿀챔(트렌딩) 섹션 추가",
      "3인 조합(시너지) 추천 페이지 추가",
    ],
  },
  {
    date: "2026-03-09",
    changes: ["서비스 오픈", "캐릭터 티어 랭킹 (승률/픽률/평균 RP)", "패치별 필터 및 티어 필터"],
  },
];

export default function UpdatesPage() {
  return (
    <article className="max-w-3xl mx-auto py-8">
      <h1 className="text-xl font-bold text-[var(--color-foreground)] mb-2">업데이트 내역</h1>
      <p className="text-xs text-[var(--color-muted-foreground)] mb-8">
        이리와지지(ER&GG) 서비스 변경 사항을 안내합니다.
      </p>

      <div className="space-y-6">
        {updates.map((entry) => (
          <section
            key={entry.date}
            className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5"
          >
            <div className="flex items-center gap-3 mb-3">
              <time className="text-sm font-semibold text-[var(--color-foreground)]">
                {entry.date}
              </time>
              {entry.version && (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-[var(--color-primary)]/15 text-[var(--color-primary)] font-medium">
                  {entry.version}
                </span>
              )}
            </div>
            <ul className="space-y-1.5">
              {entry.changes.map((change, i) => (
                <li
                  key={i}
                  className="text-sm text-[var(--color-muted-foreground)] leading-relaxed flex items-start gap-2"
                >
                  <span className="text-[var(--color-primary)] mt-1.5 shrink-0 w-1 h-1 rounded-full bg-[var(--color-primary)]" />
                  {change}
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </article>
  );
}
