import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "개인정보처리방침",
  description: "이리와지지(ER&GG) 개인정보처리방침",
  robots: { index: true, follow: true },
}

export default function PrivacyPage() {
  return (
    <article className="prose-custom max-w-3xl mx-auto py-8">
      <h1 className="text-xl font-bold text-[var(--color-foreground)] mb-6">
        개인정보처리방침
      </h1>
      <p className="text-xs text-[var(--color-muted-foreground)] mb-8">
        시행일: 2026년 3월 12일
      </p>

      <section className="mb-8">
        <h2 className="text-base font-semibold text-[var(--color-foreground)] mb-3">
          1. 개인정보의 수집 및 이용 목적
        </h2>
        <p className="text-sm text-[var(--color-muted-foreground)] leading-relaxed">
          이리와지지(ER&GG, 이하 &quot;서비스&quot;)는 별도의 회원가입 절차 없이 이용할 수 있으며,
          원칙적으로 이용자의 개인정보를 수집하지 않습니다. 다만, 서비스 개선 및 이용 통계
          분석을 위해 아래와 같은 정보가 자동으로 수집될 수 있습니다.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-base font-semibold text-[var(--color-foreground)] mb-3">
          2. 자동 수집 정보
        </h2>
        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
          <ul className="list-disc list-inside text-sm text-[var(--color-muted-foreground)] leading-relaxed space-y-1.5">
            <li>방문 페이지 URL, 유입 경로(Referrer)</li>
            <li>브라우저 종류, 운영체제, 화면 해상도</li>
            <li>방문 일시, 체류 시간, 페이지 조회 수</li>
            <li>IP 주소 (익명화 처리)</li>
            <li>쿠키 식별자</li>
          </ul>
        </div>
      </section>

      <section className="mb-8">
        <h2 className="text-base font-semibold text-[var(--color-foreground)] mb-3">
          3. 쿠키(Cookie) 및 분석 도구
        </h2>
        <p className="text-sm text-[var(--color-muted-foreground)] leading-relaxed mb-3">
          본 서비스는 이용 통계 분석을 위해 다음 도구를 사용하며, 각 도구는 쿠키를
          통해 익명화된 이용 데이터를 수집합니다.
        </p>
        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 space-y-3">
          <div>
            <p className="text-sm font-medium text-[var(--color-foreground)]">Vercel Analytics</p>
            <p className="text-xs text-[var(--color-muted-foreground)]">
              페이지 성능 및 방문 통계 수집. 제공: Vercel Inc.
            </p>
          </div>
          <div>
            <p className="text-sm font-medium text-[var(--color-foreground)]">Google Analytics 4</p>
            <p className="text-xs text-[var(--color-muted-foreground)]">
              웹사이트 트래픽 및 이용 행태 분석. IP 익명화 적용. 제공: Google LLC.
            </p>
          </div>
          <div>
            <p className="text-sm font-medium text-[var(--color-foreground)]">Amplitude</p>
            <p className="text-xs text-[var(--color-muted-foreground)]">
              사용자 행동 분석 (페이지 조회, 필터 사용 등). 제공: Amplitude Inc.
            </p>
          </div>
        </div>
        <p className="text-sm text-[var(--color-muted-foreground)] leading-relaxed mt-3">
          이용자는 브라우저 설정을 통해 쿠키 저장을 거부할 수 있으며, 이 경우 서비스
          이용에는 영향이 없습니다.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-base font-semibold text-[var(--color-foreground)] mb-3">
          4. 개인정보의 보유 및 파기
        </h2>
        <p className="text-sm text-[var(--color-muted-foreground)] leading-relaxed">
          자동 수집된 이용 통계 데이터는 수집일로부터 최대 26개월간 보관 후 자동
          삭제됩니다. 별도로 수집하는 개인정보는 없으므로 회원 탈퇴 등의 절차는
          해당하지 않습니다.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-base font-semibold text-[var(--color-foreground)] mb-3">
          5. 개인정보의 제3자 제공
        </h2>
        <p className="text-sm text-[var(--color-muted-foreground)] leading-relaxed">
          본 서비스는 이용자의 개인정보를 제3자에게 제공하지 않습니다. 다만, 위 분석
          도구 제공사(Google, Vercel, Amplitude)의 서버에 익명화된 통계 데이터가 전송될 수
          있으며, 각 서비스의 개인정보처리방침을 따릅니다.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-base font-semibold text-[var(--color-foreground)] mb-3">
          6. 이용자의 권리
        </h2>
        <ul className="list-disc list-inside text-sm text-[var(--color-muted-foreground)] leading-relaxed space-y-1.5">
          <li>브라우저 설정에서 쿠키를 삭제하거나 차단할 수 있습니다.</li>
          <li>분석 도구의 Opt-out 기능을 통해 데이터 수집을 거부할 수 있습니다.</li>
          <li>개인정보 관련 문의는 아래 연락처로 보내주세요.</li>
        </ul>
      </section>

      <section className="mb-8">
        <h2 className="text-base font-semibold text-[var(--color-foreground)] mb-3">
          7. 연락처
        </h2>
        <p className="text-sm text-[var(--color-muted-foreground)] leading-relaxed">
          개인정보 관련 문의: 서비스 내 피드백 위젯을 이용해 주세요.
        </p>
      </section>
    </article>
  )
}
