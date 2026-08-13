import type { Metadata } from "next";
import { Link } from "@/i18n/navigation";
import type { RouteLocale } from "@/i18n/routing";

export const metadata: Metadata = {
  title: "이용약관",
  description: "이리와지지(ER&GG) 서비스 이용약관",
  robots: { index: true, follow: true },
};

type TermsCopy = {
  title: string;
  effectiveDate: string;
  privacyLink: string;
  sections: {
    title: string;
    body?: string[];
    items?: string[];
    danger?: boolean;
    privacy?: boolean;
  }[];
};

const COPY: Record<RouteLocale, TermsCopy> = {
  ko: {
    title: "이용약관",
    effectiveDate: "시행일: 2026년 3월 12일",
    privacyLink: "개인정보처리방침",
    sections: [
      {
        title: "제1조 (목적)",
        body: [
          '본 약관은 이리와지지(ER&GG, 이하 "서비스")의 이용과 관련하여 서비스 운영자와 이용자 간의 권리, 의무 및 기타 필요한 사항을 규정함을 목적으로 합니다.',
        ],
      },
      {
        title: "제2조 (서비스의 내용)",
        body: [
          "서비스는 이터널리턴(Eternal Return) 게임의 공개 API 데이터를 기반으로 실험체 통계, 티어 분석, 조합 데이터 등의 정보를 제공합니다.",
        ],
        items: [
          "실험체별 승률, 픽률, 평균 RP 등 통계 정보",
          "패치별 메타 변동 분석 및 티어 산출",
          "3인 조합(Trio) 시너지 데이터",
          "상승 실험체 분석",
        ],
      },
      {
        title: "제3조 (비공식 서비스)",
        danger: true,
        body: [
          "본 서비스는 Nimble Neuron의 공식 서비스가 아닌 팬 제작 비공식 서비스입니다. 게임 관련 이미지, 실험체명, 아이템명 등의 권리는 Nimble Neuron에 있으며, 본 서비스는 Open API 이용 조건에 따라 운영됩니다.",
        ],
      },
      {
        title: "제4조 (데이터 정확성)",
        body: [
          "서비스에서 제공하는 통계 및 분석 정보는 공개 API 데이터를 기반으로 산출된 참고용 정보이며, 실제 게임 내 결과와 다를 수 있습니다. 운영자는 데이터의 정확성, 완전성, 최신성을 보장하지 않습니다.",
        ],
      },
      {
        title: "제5조 (면책 조항)",
        items: [
          "운영자는 서비스 이용으로 발생한 직접적, 간접적, 부수적, 결과적 손해에 대해 책임을 지지 않습니다.",
          "천재지변, 서버 장애, API 제공 중단 등 불가항력적 사유로 인한 서비스 중단에 대해 책임을 지지 않습니다.",
          "서비스는 무료로 제공되며, 사전 고지 없이 변경 또는 중단될 수 있습니다.",
          "이용자가 서비스를 통해 제3자와 분쟁이 발생한 경우, 운영자는 이에 관여하지 않습니다.",
        ],
      },
      {
        title: "제6조 (광고와 지적재산권)",
        body: [
          "서비스 운영을 위해 광고가 게재될 수 있습니다. 광고 클릭으로 발생하는 거래는 이용자와 광고주 간의 문제입니다.",
          "게임 관련 저작물의 권리는 Nimble Neuron에 귀속되며, 서비스의 UI, 분석 로직, 독자적 콘텐츠에 대한 권리는 운영자에게 귀속됩니다.",
        ],
      },
      {
        title: "제7조 (개인정보 보호)",
        privacy: true,
        body: ["이용자의 개인정보 보호에 관한 사항은 개인정보처리방침을 따릅니다."],
      },
      {
        title: "제8조 (약관 변경 및 준거법)",
        body: [
          "운영자는 필요한 경우 본 약관을 변경할 수 있으며, 변경된 약관은 서비스 내에 공지함으로써 효력이 발생합니다.",
          "본 약관의 해석 및 서비스 이용에 관한 분쟁은 대한민국 법률을 준거법으로 합니다.",
        ],
      },
    ],
  },
  en: {
    title: "Terms of Service",
    effectiveDate: "Effective date: March 12, 2026",
    privacyLink: "Privacy Policy",
    sections: [
      {
        title: "1. Purpose",
        body: [
          "These terms define the basic rights and responsibilities between ER&GG and users of the service.",
        ],
      },
      {
        title: "2. Service",
        body: ["ER&GG provides Eternal Return statistics and analysis based on public API data."],
        items: [
          "Character win rate, pick rate, average RP, and related metrics",
          "Patch-based meta analysis and tier calculations",
          "Three-character composition data",
          "Patch movement and rising-character analysis",
        ],
      },
      {
        title: "3. Unofficial service",
        danger: true,
        body: [
          "ER&GG is an unofficial fan-made service and is not operated by Nimble Neuron. Game images, character names, item names, and related materials belong to Nimble Neuron.",
        ],
      },
      {
        title: "4. Data accuracy",
        body: [
          "Statistics and analysis are reference information calculated from public API data. They may differ from in-game results, and ER&GG does not guarantee accuracy, completeness, or freshness.",
        ],
      },
      {
        title: "5. Disclaimer",
        items: [
          "ER&GG is not liable for direct, indirect, incidental, or consequential damages from using the service.",
          "ER&GG is not responsible for interruptions caused by outages, API changes, or force majeure events.",
          "The service is provided free of charge and may change or stop without prior notice.",
          "Disputes between users and third parties are outside ER&GG's responsibility.",
        ],
      },
      {
        title: "6. Ads and intellectual property",
        body: [
          "Ads may be shown to support service operation. Transactions after clicking ads are between the user and the advertiser.",
          "Rights to game assets belong to Nimble Neuron. Rights to ER&GG's UI, analysis logic, and original content belong to the operator.",
        ],
      },
      {
        title: "7. Privacy",
        privacy: true,
        body: ["Privacy-related matters are handled under the Privacy Policy."],
      },
      {
        title: "8. Changes and governing law",
        body: [
          "The operator may change these terms when necessary. Updated terms take effect when posted in the service.",
          "These terms are governed by the laws of the Republic of Korea.",
        ],
      },
    ],
  },
  ja: {
    title: "利用規約",
    effectiveDate: "施行日: 2026年3月12日",
    privacyLink: "プライバシーポリシー",
    sections: [
      {
        title: "1. 目的",
        body: [
          "本規約は、ER&GGの利用に関するサービス運営者と利用者の基本的な権利と責任を定めます。",
        ],
      },
      {
        title: "2. サービス内容",
        body: ["ER&GGは、Eternal Returnの公開APIデータに基づく統計と分析情報を提供します。"],
        items: [
          "キャラクターの勝率、ピック率、平均RPなどの指標",
          "パッチ別メタ分析とティア算出",
          "3人編成データ",
          "パッチ変動と上昇キャラクター分析",
        ],
      },
      {
        title: "3. 非公式サービス",
        danger: true,
        body: [
          "ER&GGはNimble Neuronが運営する公式サービスではなく、ファン制作の非公式サービスです。ゲーム画像、キャラクター名、アイテム名などの権利はNimble Neuronに帰属します。",
        ],
      },
      {
        title: "4. データの正確性",
        body: [
          "統計と分析は公開APIデータから算出した参考情報です。実際のゲーム結果と異なる場合があり、正確性、完全性、最新性を保証するものではありません。",
        ],
      },
      {
        title: "5. 免責",
        items: [
          "サービス利用によって生じた損害について、運営者は責任を負いません。",
          "障害、API変更、不可抗力による中断について責任を負いません。",
          "サービスは無料で提供され、予告なく変更または停止される場合があります。",
          "利用者と第三者の間で発生した紛争には関与しません。",
        ],
      },
      {
        title: "6. 広告と知的財産権",
        body: [
          "運営のため広告を表示する場合があります。広告クリック後の取引は利用者と広告主の間で行われます。",
          "ゲーム関連素材の権利はNimble Neuronに、ER&GGのUI、分析ロジック、独自コンテンツの権利は運営者に帰属します。",
        ],
      },
      {
        title: "7. プライバシー",
        privacy: true,
        body: ["プライバシーに関する事項はプライバシーポリシーに従います。"],
      },
      {
        title: "8. 変更と準拠法",
        body: [
          "運営者は必要に応じて本規約を変更できます。変更後の規約はサービス内で掲示された時点で効力を持ちます。",
          "本規約は大韓民国の法律に準拠します。",
        ],
      },
    ],
  },
  "zh-Hans": {
    title: "使用条款",
    effectiveDate: "生效日期：2026年3月12日",
    privacyLink: "隐私政策",
    sections: [
      { title: "1. 目的", body: ["本条款规定 ER&GG 与用户在使用服务时的基本权利和责任。"] },
      {
        title: "2. 服务内容",
        body: ["ER&GG 基于 Eternal Return 公开 API 数据提供统计与分析信息。"],
        items: [
          "角色胜率、选取率、平均 RP 等指标",
          "按版本进行 Meta 分析与梯度计算",
          "三人阵容数据",
          "版本变化和上升角色分析",
        ],
      },
      {
        title: "3. 非官方服务",
        danger: true,
        body: [
          "ER&GG 是粉丝制作的非官方服务，并非 Nimble Neuron 运营的官方服务。游戏图片、角色名、道具名等相关权利归 Nimble Neuron 所有。",
        ],
      },
      {
        title: "4. 数据准确性",
        body: [
          "统计和分析是根据公开 API 数据计算的参考信息，可能与游戏内结果不同。ER&GG 不保证其准确性、完整性或实时性。",
        ],
      },
      {
        title: "5. 免责声明",
        items: [
          "ER&GG 不对因使用服务产生的直接或间接损失负责。",
          "因故障、API 变更或不可抗力导致的服务中断，ER&GG 不承担责任。",
          "服务免费提供，可能在不提前通知的情况下变更或停止。",
          "用户与第三方之间发生的纠纷不属于 ER&GG 的责任范围。",
        ],
      },
      {
        title: "6. 广告与知识产权",
        body: [
          "服务可能展示广告以支持运营。点击广告后的交易由用户与广告主自行处理。",
          "游戏相关素材权利归 Nimble Neuron 所有，ER&GG 的 UI、分析逻辑和原创内容权利归运营者所有。",
        ],
      },
      { title: "7. 隐私", privacy: true, body: ["隐私相关事项按照隐私政策处理。"] },
      {
        title: "8. 条款变更与适用法律",
        body: [
          "运营者可在必要时修改本条款。更新后的条款在服务内公布后生效。",
          "本条款适用大韩民国法律。",
        ],
      },
    ],
  },
  "zh-Hant": {
    title: "使用條款",
    effectiveDate: "生效日期：2026年3月12日",
    privacyLink: "隱私權政策",
    sections: [
      { title: "1. 目的", body: ["本條款規定 ER&GG 與使用者在使用服務時的基本權利與責任。"] },
      {
        title: "2. 服務內容",
        body: ["ER&GG 基於 Eternal Return 公開 API 資料提供統計與分析資訊。"],
        items: [
          "角色勝率、選取率、平均 RP 等指標",
          "按版本進行 Meta 分析與梯度計算",
          "三人陣容資料",
          "版本變化與上升角色分析",
        ],
      },
      {
        title: "3. 非官方服務",
        danger: true,
        body: [
          "ER&GG 是粉絲製作的非官方服務，並非 Nimble Neuron 營運的官方服務。遊戲圖片、角色名、道具名等相關權利歸 Nimble Neuron 所有。",
        ],
      },
      {
        title: "4. 資料準確性",
        body: [
          "統計與分析是根據公開 API 資料計算的參考資訊，可能與遊戲內結果不同。ER&GG 不保證其準確性、完整性或即時性。",
        ],
      },
      {
        title: "5. 免責聲明",
        items: [
          "ER&GG 不對因使用服務產生的直接或間接損失負責。",
          "因故障、API 變更或不可抗力導致的服務中斷，ER&GG 不承擔責任。",
          "服務免費提供，可能在不提前通知的情況下變更或停止。",
          "使用者與第三方之間發生的糾紛不屬於 ER&GG 的責任範圍。",
        ],
      },
      {
        title: "6. 廣告與智慧財產權",
        body: [
          "服務可能展示廣告以支援營運。點擊廣告後的交易由使用者與廣告主自行處理。",
          "遊戲相關素材權利歸 Nimble Neuron 所有，ER&GG 的 UI、分析邏輯與原創內容權利歸營運者所有。",
        ],
      },
      { title: "7. 隱私", privacy: true, body: ["隱私相關事項依照隱私權政策處理。"] },
      {
        title: "8. 條款變更與適用法律",
        body: [
          "營運者可在必要時修改本條款。更新後的條款在服務內公布後生效。",
          "本條款適用大韓民國法律。",
        ],
      },
    ],
  },
};

export default function TermsPage({ locale = "ko" }: { locale?: RouteLocale }) {
  const copy = COPY[locale] ?? COPY.ko;

  return (
    <article className="mx-auto flex max-w-3xl flex-col gap-3 py-8">
      <header className="dashboard-panel mb-2 p-4">
        <span className="dashboard-kicker">{copy.effectiveDate}</span>
        <h1 className="dashboard-section-title mt-2 text-xl font-bold text-[var(--color-foreground)]">
          {copy.title}
        </h1>
      </header>

      {copy.sections.map((section) => (
        <section key={section.title} className="metric-card p-4">
          <h2 className="dashboard-section-title mb-3 text-base font-semibold text-[var(--color-foreground)]">
            {section.title}
          </h2>
          <div
            className={
              section.danger
                ? "rounded-md border border-[var(--color-danger)]/30 bg-[var(--color-danger)]/5 p-3"
                : undefined
            }
          >
            {section.body?.map((paragraph) => (
              <p
                key={paragraph}
                className="mb-3 text-sm leading-relaxed text-[var(--color-muted-foreground)] last:mb-0"
              >
                {section.privacy ? (
                  <>
                    {paragraph}{" "}
                    <Link
                      href="/privacy"
                      className="font-semibold text-[var(--color-accent-foreground)] hover:underline"
                    >
                      {copy.privacyLink}
                    </Link>
                  </>
                ) : (
                  paragraph
                )}
              </p>
            ))}
          </div>
          {section.items ? (
            <div className="mt-3 rounded-md border border-[var(--color-border)] bg-[var(--color-surface-2)] p-3">
              <ul className="space-y-1.5 text-sm leading-relaxed text-[var(--color-muted-foreground)]">
                {section.items.map((item) => (
                  <li key={item} className="flex items-start gap-2">
                    <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--color-accent)]" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </section>
      ))}
    </article>
  );
}
