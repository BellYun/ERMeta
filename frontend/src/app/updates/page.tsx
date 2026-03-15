import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "업데이트 내역",
  description: "이리와지지(ER&GG) 서비스 업데이트 내역",
  robots: { index: true, follow: true },
}

interface UpdateEntry {
  date: string
  version?: string
  changes: string[]
}

const updates: UpdateEntry[] = [
  {
    date: "2026-03-15",
    changes: [
      "초성 검색 시 띄어쓰기 무시하도록 개선",
    ],
  },
  {
    date: "2026-03-14",
    changes: [
      "모바일 반응형 UI 개선",
    ],
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
    changes: [
      "서비스 오픈",
      "캐릭터 티어 랭킹 (승률/픽률/평균 RP)",
      "패치별 필터 및 티어 필터",
    ],
  },
]

export default function UpdatesPage() {
  return (
    <article className="max-w-3xl mx-auto py-8">
      <h1 className="text-xl font-bold text-[var(--color-foreground)] mb-2">
        업데이트 내역
      </h1>
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
  )
}
