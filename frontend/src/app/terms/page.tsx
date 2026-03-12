import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "이용약관",
  description: "이리와지지(ER&GG) 서비스 이용약관",
  robots: { index: true, follow: true },
}

export default function TermsPage() {
  return (
    <article className="prose-custom max-w-3xl mx-auto py-8">
      <h1 className="text-xl font-bold text-[var(--color-foreground)] mb-6">
        이용약관
      </h1>
      <p className="text-xs text-[var(--color-muted-foreground)] mb-8">
        시행일: 2026년 3월 12일
      </p>

      <section className="mb-8">
        <h2 className="text-base font-semibold text-[var(--color-foreground)] mb-3">
          제1조 (목적)
        </h2>
        <p className="text-sm text-[var(--color-muted-foreground)] leading-relaxed">
          본 약관은 이리와지지(ER&GG, 이하 &quot;서비스&quot;)의 이용과 관련하여 서비스
          운영자(이하 &quot;운영자&quot;)와 이용자 간의 권리, 의무 및 기타 필요한 사항을
          규정함을 목적으로 합니다.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-base font-semibold text-[var(--color-foreground)] mb-3">
          제2조 (서비스의 내용)
        </h2>
        <p className="text-sm text-[var(--color-muted-foreground)] leading-relaxed mb-3">
          서비스는 이터널리턴(Eternal Return) 게임의 공개 API 데이터를 기반으로 캐릭터
          통계, 티어 분석, 조합 추천 등의 정보를 제공합니다.
        </p>
        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
          <ul className="list-disc list-inside text-sm text-[var(--color-muted-foreground)] leading-relaxed space-y-1.5">
            <li>캐릭터별 승률, 픽률, 평균 RP 등 통계 정보</li>
            <li>패치별 메타 변동 분석 및 티어 산출</li>
            <li>3인 조합(Trio) 시너지 추천</li>
            <li>꿀챔(트렌딩) 캐릭터 분석</li>
          </ul>
        </div>
      </section>

      <section className="mb-8">
        <h2 className="text-base font-semibold text-[var(--color-foreground)] mb-3">
          제3조 (비공식 서비스)
        </h2>
        <div className="rounded-xl border border-[var(--color-danger)]/30 bg-[var(--color-danger)]/5 p-4">
          <p className="text-sm text-[var(--color-muted-foreground)] leading-relaxed">
            본 서비스는 (주)님블뉴런의 공식 서비스가 아닌 팬 제작 비공식 서비스입니다.
            게임 관련 이미지, 캐릭터명, 아이템명 등의 저작권은 (주)님블뉴런에 있으며,
            본 서비스는 님블뉴런의 Open API 이용약관에 따라 운영됩니다.
          </p>
        </div>
      </section>

      <section className="mb-8">
        <h2 className="text-base font-semibold text-[var(--color-foreground)] mb-3">
          제4조 (데이터 정확성)
        </h2>
        <p className="text-sm text-[var(--color-muted-foreground)] leading-relaxed">
          서비스에서 제공하는 통계 및 분석 정보는 공개 API 데이터를 기반으로 산출된
          참고용 정보이며, 실제 게임 내 결과와 다를 수 있습니다. 운영자는 데이터의
          정확성, 완전성, 최신성을 보장하지 않으며, 이를 근거로 한 이용자의 판단이나
          행위에 대해 책임지지 않습니다.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-base font-semibold text-[var(--color-foreground)] mb-3">
          제5조 (면책 조항)
        </h2>
        <ul className="list-disc list-inside text-sm text-[var(--color-muted-foreground)] leading-relaxed space-y-2">
          <li>
            운영자는 서비스의 이용으로 인해 발생한 직접적, 간접적, 부수적, 결과적
            손해에 대해 책임을 지지 않습니다.
          </li>
          <li>
            천재지변, 서버 장애, API 제공 중단 등 불가항력적 사유로 인한 서비스
            중단에 대해 책임을 지지 않습니다.
          </li>
          <li>
            서비스는 무료로 제공되며, 사전 고지 없이 변경, 중단될 수 있습니다.
          </li>
          <li>
            이용자가 서비스를 통해 제3자와 분쟁이 발생한 경우, 운영자는 이에
            관여하지 않으며 책임을 지지 않습니다.
          </li>
        </ul>
      </section>

      <section className="mb-8">
        <h2 className="text-base font-semibold text-[var(--color-foreground)] mb-3">
          제6조 (광고)
        </h2>
        <p className="text-sm text-[var(--color-muted-foreground)] leading-relaxed">
          서비스 운영 및 유지를 위해 서비스 내에 광고가 게재될 수 있습니다. 광고
          클릭으로 인해 발생하는 제3자와의 거래는 이용자와 해당 광고주 간의 문제이며,
          운영자는 이에 대해 책임을 지지 않습니다.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-base font-semibold text-[var(--color-foreground)] mb-3">
          제7조 (지적재산권)
        </h2>
        <ul className="list-disc list-inside text-sm text-[var(--color-muted-foreground)] leading-relaxed space-y-2">
          <li>
            게임 내 이미지, 캐릭터명, 아이템명 등 게임 관련 저작물의 권리는
            (주)님블뉴런에 귀속됩니다.
          </li>
          <li>
            서비스의 UI 디자인, 분석 알고리즘, 독자적 콘텐츠에 대한 권리는
            운영자에게 귀속됩니다.
          </li>
          <li>
            이용자는 서비스의 콘텐츠를 무단으로 복제, 배포, 상업적으로 이용할 수
            없습니다.
          </li>
        </ul>
      </section>

      <section className="mb-8">
        <h2 className="text-base font-semibold text-[var(--color-foreground)] mb-3">
          제8조 (개인정보 보호)
        </h2>
        <p className="text-sm text-[var(--color-muted-foreground)] leading-relaxed">
          이용자의 개인정보 보호에 관한 사항은{" "}
          <a
            href="/privacy"
            className="text-[var(--color-primary)] hover:underline"
          >
            개인정보처리방침
          </a>
          에 따릅니다.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-base font-semibold text-[var(--color-foreground)] mb-3">
          제9조 (약관의 변경)
        </h2>
        <p className="text-sm text-[var(--color-muted-foreground)] leading-relaxed">
          운영자는 필요한 경우 본 약관을 변경할 수 있으며, 변경된 약관은 서비스 내에
          공지함으로써 효력이 발생합니다. 이용자가 변경된 약관에 동의하지 않는 경우
          서비스 이용을 중단할 수 있습니다.
        </p>
      </section>

      <section>
        <h2 className="text-base font-semibold text-[var(--color-foreground)] mb-3">
          제10조 (준거법 및 관할)
        </h2>
        <p className="text-sm text-[var(--color-muted-foreground)] leading-relaxed">
          본 약관의 해석 및 서비스 이용에 관한 분쟁은 대한민국 법률을 준거법으로
          하며, 분쟁 발생 시 운영자의 주소지를 관할하는 법원을 전속 관할 법원으로
          합니다.
        </p>
      </section>
    </article>
  )
}
