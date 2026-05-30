import type { Metadata } from "next";
import { Link } from "@/i18n/navigation";
import type { RouteLocale } from "@/i18n/routing";

export const metadata: Metadata = {
  title: "서비스 소개",
  description: "이리와지지(ER&GG)의 운영 목적, 데이터 출처, 문의 방법 안내",
  robots: { index: true, follow: true },
};

const copy = {
  ko: {
    title: "서비스 소개",
    updated: "최종 업데이트: 2026년 5월 31일",
    lead: "이리와지지(ER&GG)는 이터널리턴 랭크 데이터를 바탕으로 캐릭터 메타, 무기 선택, 3인 조합 흐름을 읽기 쉽게 정리하는 비공식 분석 서비스입니다.",
    sections: [
      {
        title: "무엇을 제공하나요?",
        body: "단순 승률 목록만 보여주는 대신, 픽률, 승률, 평균 RP, 패치 전후 변화, 무기별 성과를 함께 비교합니다. 사용자는 특정 캐릭터가 강한지뿐 아니라 표본이 충분한지, 어떤 무기에서 성과가 나는지, 이전 패치 대비 흐름이 바뀌었는지를 한 화면에서 확인할 수 있습니다.",
      },
      {
        title: "데이터 출처",
        body: "게임 관련 원천 데이터와 이미지는 님블뉴런 Open API 및 공개 게임 리소스를 기반으로 합니다. ER&GG는 공식 서비스가 아니며, 수집된 경기 통계를 자체 집계 로직으로 가공해 분석 지표를 제공합니다.",
      },
      {
        title: "운영 원칙",
        body: "페이지는 실제 플레이어가 의사결정에 사용할 수 있는 정보에 초점을 둡니다. 패치가 바뀌면 오래된 결론을 그대로 유지하지 않고, 표본이 부족하거나 프리시즌처럼 왜곡 가능성이 큰 데이터는 통계 화면에서 제외하거나 별도로 안내합니다.",
      },
      {
        title: "문의와 정정 요청",
        body: "오류 제보, 데이터 이상, 기능 제안은 화면 오른쪽 아래 피드백 위젯으로 보낼 수 있습니다. 접수된 내용은 서비스 개선과 데이터 검증에 사용됩니다.",
      },
    ],
  },
  ja: {
    title: "ER&GGについて",
    updated: "最終更新: 2026年5月31日",
    lead: "ER&GGは、Eternal Returnのランクデータをもとにキャラクターメタ、武器選択、3人構成の流れを整理する非公式分析サービスです。",
    sections: [
      {
        title: "提供内容",
        body: "勝率だけでなく、ピック率、平均RP、パッチ前後の変化、武器別の成績を合わせて比較します。キャラクターが強いかどうかだけでなく、標本数が十分か、どの武器で成果が出ているかも確認できます。",
      },
      {
        title: "データソース",
        body: "ゲーム関連の元データと画像はNimble Neuron Open APIおよび公開ゲームリソースをもとにしています。ER&GGは公式サービスではなく、収集された試合統計を独自の集計ロジックで加工しています。",
      },
      {
        title: "運営方針",
        body: "ページはプレイヤーの判断に役立つ情報を優先します。パッチ更新後は古い結論を固定せず、標本が少ないデータやプレシーズンのように歪みやすいデータは除外または明示します。",
      },
      {
        title: "問い合わせ",
        body: "誤りの報告、データ異常、機能提案は画面右下のフィードバックウィジェットから送信できます。",
      },
    ],
  },
  default: {
    title: "About ER&GG",
    updated: "Last updated: May 31, 2026",
    lead: "ER&GG is an unofficial Eternal Return analytics service that explains character meta, weapon choices, and trio composition trends from ranked match data.",
    sections: [
      {
        title: "What this site provides",
        body: "The service compares pick rate, win rate, average RP, patch-over-patch movement, and weapon-specific performance instead of showing a flat win-rate list.",
      },
      {
        title: "Data source",
        body: "Game data and images are based on Nimble Neuron Open API and public game resources. ER&GG is not an official service.",
      },
      {
        title: "Editorial approach",
        body: "The analysis focuses on information that helps players make practical decisions. Low-sample or distorted preseason data is excluded or clearly labeled.",
      },
      {
        title: "Contact",
        body: "Bug reports, data issues, and feature requests can be sent through the feedback widget.",
      },
    ],
  },
};

function getCopy(locale: RouteLocale) {
  if (locale === "ko" || locale === "ja") return copy[locale];
  return copy.default;
}

export default function AboutPage({ locale }: { locale: RouteLocale }) {
  const content = getCopy(locale);

  return (
    <article className="prose-custom mx-auto max-w-3xl py-8">
      <h1 className="mb-4 text-xl font-bold text-[var(--color-foreground)]">{content.title}</h1>
      <p className="mb-8 text-xs text-[var(--color-muted-foreground)]">{content.updated}</p>
      <p className="mb-8 text-sm leading-relaxed text-[var(--color-muted-foreground)]">
        {content.lead}
      </p>

      <div className="space-y-8">
        {content.sections.map((section) => (
          <section key={section.title}>
            <h2 className="mb-3 text-base font-semibold text-[var(--color-foreground)]">
              {section.title}
            </h2>
            <p className="text-sm leading-relaxed text-[var(--color-muted-foreground)]">
              {section.body}
            </p>
          </section>
        ))}
      </div>

      <div className="mt-8 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
        <p className="text-sm leading-relaxed text-[var(--color-muted-foreground)]">
          <Link href="/methodology" className="text-[var(--color-primary)] hover:underline">
            Methodology
          </Link>
          {" / "}
          <Link href="/privacy" className="text-[var(--color-primary)] hover:underline">
            Privacy
          </Link>
          {" / "}
          <Link href="/terms" className="text-[var(--color-primary)] hover:underline">
            Terms
          </Link>
        </p>
      </div>
    </article>
  );
}
