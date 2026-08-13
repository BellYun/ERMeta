import type { Metadata } from "next";
import type { RouteLocale } from "@/i18n/routing";

export const metadata: Metadata = {
  title: "데이터 방법론",
  description: "이리와지지(ER&GG)의 통계 집계 기준, 티어 산출 방식, 표본 처리 원칙",
  robots: { index: true, follow: true },
};

const copy = {
  ko: {
    title: "데이터 방법론",
    updated: "최종 업데이트: 2026년 5월 31일",
    lead: "ER&GG의 분석 페이지는 경기 결과를 그대로 나열하지 않고, 패치와 티어 조건에 맞춰 다시 집계한 뒤 플레이어가 해석하기 쉬운 지표로 변환합니다.",
    sections: [
      {
        title: "집계 기준",
        items: [
          "패치 버전, 랭크 티어, 실험체, 무기 조합을 기준으로 경기 수와 성과 지표를 묶습니다.",
          "기본 메타 화면은 최신 통계용 패치를 우선 사용하며, 프리시즌처럼 왜곡 가능성이 큰 패치는 별도 제외합니다.",
          "상위 티어 필터는 단일 티어뿐 아니라 누적 티어 그룹을 사용해 표본 안정성을 확보합니다.",
        ],
      },
      {
        title: "주요 지표 해석",
        items: [
          "승률은 해당 실험체 또는 무기 선택이 1위를 기록한 비율입니다. 이터널리턴 스쿼드 환경에서는 12.5% 전후를 기준선으로 해석합니다.",
          "평균 RP는 한 경기당 랭크 포인트 기대값입니다. 승률이 높아도 평균 RP가 낮으면 실전 랭크 상승 효율은 제한적일 수 있습니다.",
          "픽률은 전체 표본에서 해당 선택이 차지하는 비율입니다. 픽률이 낮은 고승률 선택은 표본 위험을 함께 봐야 합니다.",
        ],
      },
      {
        title: "패치 비교",
        items: [
          "패치 비교는 동일 실험체와 동일 무기 조건에서 이전 패치 대비 승률, 평균 RP, 픽률 변화를 확인합니다.",
          "버프 직후의 상승은 패치 효과와 플레이어 숙련도 변화가 함께 섞일 수 있으므로, 단일 지표보다 여러 지표를 함께 봅니다.",
          "실험체 패치 노트와 통계 변화를 같은 화면에 배치해 숫자의 원인을 추적할 수 있게 합니다.",
        ],
      },
      {
        title: "한계",
        items: [
          "공개 API와 수집 주기에 따라 최신 경기 일부가 반영되지 않을 수 있습니다.",
          "표본이 작은 실험체, 무기, 조합은 실제 성능보다 높거나 낮게 보일 수 있습니다.",
          "통계는 의사결정 참고 자료이며, 패치 직후에는 하루 단위로 해석이 달라질 수 있습니다.",
        ],
      },
    ],
  },
  ja: {
    title: "データ方法論",
    updated: "最終更新: 2026年5月31日",
    lead: "ER&GGの分析ページは、試合結果をそのまま並べるのではなく、パッチとランク条件に合わせて再集計し、解釈しやすい指標に変換します。",
    sections: [
      {
        title: "集計基準",
        items: [
          "パッチ、ランク帯、キャラクター、武器の組み合わせを基準に試合数と成績を集計します。",
          "通常のメタ画面は最新の統計対象パッチを優先し、プレシーズンのように歪みやすいデータは除外します。",
          "上位ランクのフィルターでは累積ランクグループを使い、標本の安定性を高めます。",
        ],
      },
      {
        title: "主要指標",
        items: [
          "勝率は対象キャラクターまたは武器選択が1位になった割合です。",
          "平均RPは1試合あたりのランクポイント期待値です。",
          "ピック率は全体標本の中でその選択が占める割合です。低ピック高勝率の選択は標本リスクも確認します。",
        ],
      },
      {
        title: "パッチ比較",
        items: [
          "同じキャラクターと武器条件で、前パッチ比の勝率、平均RP、ピック率の変化を確認します。",
          "バフ直後の上昇はパッチ効果と熟練度変化が混ざるため、複数指標を合わせて見ます。",
          "パッチノートと統計変化を同じ画面に配置し、数字の理由を追いやすくします。",
        ],
      },
      {
        title: "制限事項",
        items: [
          "公開APIと収集周期により、最新試合の一部が反映されない場合があります。",
          "標本が少ないキャラクター、武器、構成は実際の性能より高く、または低く見える場合があります。",
          "統計は判断材料であり、パッチ直後は解釈が日ごとに変わることがあります。",
        ],
      },
    ],
  },
  default: {
    title: "Data Methodology",
    updated: "Last updated: May 31, 2026",
    lead: "ER&GG aggregates ranked match data by patch and tier, then converts it into practical indicators for character and composition analysis.",
    sections: [
      {
        title: "Aggregation",
        items: [
          "Matches are grouped by patch, rank tier, character, and weapon.",
          "Preseason or distorted patches may be excluded from default statistical views.",
          "Cumulative tier groups are used where useful to improve sample stability.",
        ],
      },
      {
        title: "Metrics",
        items: [
          "Win rate means first-place finish rate for the selected character or weapon.",
          "Average RP estimates ranked-point gain per match.",
          "Pick rate shows sample share and should be read together with sample size.",
        ],
      },
      {
        title: "Limitations",
        items: [
          "Recent matches may not appear immediately because of API and collection timing.",
          "Small-sample characters, weapons, and compositions can be noisy.",
          "Stats are decision-support material, not a guarantee of in-game outcome.",
        ],
      },
    ],
  },
};

function getCopy(locale: RouteLocale) {
  if (locale === "ko" || locale === "ja") return copy[locale];
  return copy.default;
}

export default function MethodologyPage({ locale }: { locale: RouteLocale }) {
  const content = getCopy(locale);

  return (
    <article className="mx-auto flex max-w-3xl flex-col gap-5 py-8">
      <header className="dashboard-panel p-4">
        <span className="dashboard-kicker">{content.updated}</span>
        <h1 className="dashboard-section-title mt-2 text-xl font-bold text-[var(--color-foreground)]">
          {content.title}
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-[var(--color-muted-foreground)]">
          {content.lead}
        </p>
      </header>

      <div className="grid gap-3">
        {content.sections.map((section) => (
          <section key={section.title} className="metric-card p-4">
            <h2 className="dashboard-section-title mb-3 text-base font-semibold text-[var(--color-foreground)]">
              {section.title}
            </h2>
            <ul className="space-y-2 text-sm leading-relaxed text-[var(--color-muted-foreground)]">
              {section.items.map((item) => (
                <li key={item} className="flex items-start gap-2">
                  <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--color-accent)]" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </article>
  );
}
