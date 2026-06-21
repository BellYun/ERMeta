import type { Metadata } from "next";
import type { RouteLocale } from "@/i18n/routing";

export const metadata: Metadata = {
  title: "개인정보처리방침",
  description: "이리와지지(ER&GG) 개인정보처리방침",
  robots: { index: true, follow: true },
};

type PrivacyCopy = {
  title: string;
  effectiveDate: string;
  sections: {
    title: string;
    body?: string[];
    items?: string[];
  }[];
};

const COPY: Record<RouteLocale, PrivacyCopy> = {
  ko: {
    title: "개인정보처리방침",
    effectiveDate: "시행일: 2026년 5월 28일",
    sections: [
      {
        title: "1. 개인정보의 수집 및 이용 목적",
        body: [
          '이리와지지(ER&GG, 이하 "서비스")는 별도의 회원가입 절차 없이 이용할 수 있으며, 원칙적으로 이용자의 개인정보를 수집하지 않습니다. 다만, 서비스 개선 및 이용 통계 분석을 위해 아래와 같은 정보가 자동으로 수집될 수 있습니다.',
        ],
      },
      {
        title: "2. 자동 수집 정보",
        items: [
          "방문 페이지 URL, 유입 경로(Referrer)",
          "브라우저 종류, 운영체제, 화면 해상도",
          "방문 일시, 체류 시간, 페이지 조회 수",
          "IP 주소 (익명화 처리)",
          "쿠키 식별자",
        ],
      },
      {
        title: "3. 쿠키 및 분석 도구",
        body: [
          "서비스는 방문 및 성능 통계, 트래픽 분석, 사용자 행동 분석을 위해 Vercel, Google, Amplitude 등의 도구를 사용할 수 있습니다.",
          "이용자는 브라우저 설정을 통해 쿠키 저장을 거부할 수 있으며, 이 경우 서비스 이용에는 영향이 없습니다.",
        ],
      },
      {
        title: "4. 광고 및 제3자 광고 쿠키",
        body: [
          "서비스 운영비 충당을 위해 Google AdSense 광고가 표시될 수 있습니다. Google 및 광고 파트너는 광고 게재와 성과 측정을 위해 쿠키를 사용할 수 있습니다.",
          "맞춤 광고 설정은 adssettings.google.com 및 Google 광고 정책 페이지에서 확인할 수 있습니다.",
        ],
      },
      {
        title: "5. 보유 및 파기",
        body: [
          "자동 수집된 이용 통계 데이터는 수집일로부터 최대 26개월간 보관 후 자동 삭제됩니다. 별도로 수집하는 개인정보는 없으므로 회원 탈퇴 절차는 해당하지 않습니다.",
        ],
      },
      {
        title: "6. 제3자 제공 및 이용자의 권리",
        body: [
          "서비스는 이용자의 개인정보를 제3자에게 제공하지 않습니다. 다만 익명화된 통계 데이터가 분석 도구 제공사 서버로 전송될 수 있습니다.",
          "이용자는 쿠키 삭제, 쿠키 차단, 분석 도구의 opt-out 기능을 사용할 수 있습니다. 개인정보 관련 문의는 서비스 내 피드백 위젯을 이용해 주세요.",
        ],
      },
    ],
  },
  en: {
    title: "Privacy Policy",
    effectiveDate: "Effective date: May 28, 2026",
    sections: [
      {
        title: "1. Purpose of collection and use",
        body: [
          "ER&GG can be used without account registration. As a rule, the service does not collect personally identifiable information. Some technical information may be collected automatically to improve the service and measure usage.",
        ],
      },
      {
        title: "2. Automatically collected data",
        items: [
          "Visited page URLs and referrers",
          "Browser, operating system, and screen information",
          "Visit time, session duration, and page views",
          "Anonymized IP address",
          "Cookie identifiers",
        ],
      },
      {
        title: "3. Cookies and analytics",
        body: [
          "The service may use tools from Vercel, Google, and Amplitude for performance metrics, traffic analysis, and product analytics.",
          "You can block or delete cookies in your browser settings. Blocking cookies does not prevent normal use of the service.",
        ],
      },
      {
        title: "4. Ads and third-party cookies",
        body: [
          "The service may display Google AdSense ads. Google and advertising partners may use cookies to deliver ads and measure performance.",
          "Personalized ad settings are available at adssettings.google.com and in Google's advertising policy pages.",
        ],
      },
      {
        title: "5. Retention",
        body: [
          "Automatically collected analytics data is retained for up to 26 months and then deleted automatically. Because ER&GG does not operate user accounts, account deletion procedures do not apply.",
        ],
      },
      {
        title: "6. Third-party sharing and user rights",
        body: [
          "ER&GG does not sell or provide personal information to third parties. Anonymized analytics data may be sent to analytics providers.",
          "You may delete cookies, block cookies, or use analytics opt-out features. For privacy questions, use the feedback widget in the service.",
        ],
      },
    ],
  },
  ja: {
    title: "プライバシーポリシー",
    effectiveDate: "施行日: 2026年5月28日",
    sections: [
      {
        title: "1. 収集と利用目的",
        body: [
          "ER&GGは会員登録なしで利用できます。原則として個人を特定できる情報は収集しませんが、サービス改善と利用状況の把握のため、一部の技術情報が自動的に収集される場合があります。",
        ],
      },
      {
        title: "2. 自動収集される情報",
        items: [
          "閲覧ページURLと参照元",
          "ブラウザ、OS、画面情報",
          "訪問時刻、滞在時間、ページビュー",
          "匿名化されたIPアドレス",
          "Cookie識別子",
        ],
      },
      {
        title: "3. Cookieと分析ツール",
        body: [
          "サービスはパフォーマンス計測、トラフィック分析、利用行動分析のため、Vercel、Google、Amplitudeなどのツールを使用する場合があります。",
          "Cookieはブラウザ設定で削除またはブロックできます。Cookieを無効にしても通常の利用は可能です。",
        ],
      },
      {
        title: "4. 広告と第三者Cookie",
        body: [
          "運営費のためGoogle AdSense広告を表示する場合があります。Googleおよび広告パートナーは広告配信と効果測定のためCookieを使用することがあります。",
          "パーソナライズ広告の設定は adssettings.google.com およびGoogleの広告ポリシーページで確認できます。",
        ],
      },
      {
        title: "5. 保管期間",
        body: [
          "自動収集された分析データは最大26か月保管された後、自動的に削除されます。ユーザーアカウントを運用していないため、退会手続きはありません。",
        ],
      },
      {
        title: "6. 第三者提供と利用者の権利",
        body: [
          "ER&GGは個人情報を第三者へ販売または提供しません。匿名化された分析データが分析ツール提供者へ送信される場合があります。",
          "利用者はCookieの削除、ブロック、分析ツールのopt-out機能を利用できます。問い合わせはサービス内フィードバックから送信してください。",
        ],
      },
    ],
  },
  "zh-Hans": {
    title: "隐私政策",
    effectiveDate: "生效日期：2026年5月28日",
    sections: [
      {
        title: "1. 收集与使用目的",
        body: [
          "ER&GG 无需注册即可使用。原则上，本服务不收集可识别个人身份的信息，但为了改进服务和统计使用情况，可能会自动收集部分技术信息。",
        ],
      },
      {
        title: "2. 自动收集的信息",
        items: [
          "访问页面 URL 与来源",
          "浏览器、操作系统和屏幕信息",
          "访问时间、停留时间和页面浏览量",
          "匿名化 IP 地址",
          "Cookie 标识符",
        ],
      },
      {
        title: "3. Cookie 与分析工具",
        body: [
          "本服务可能使用 Vercel、Google、Amplitude 等工具进行性能统计、流量分析和产品分析。",
          "你可以在浏览器设置中删除或阻止 Cookie。阻止 Cookie 不会影响服务的正常使用。",
        ],
      },
      {
        title: "4. 广告与第三方 Cookie",
        body: [
          "本服务可能展示 Google AdSense 广告。Google 及广告合作伙伴可能使用 Cookie 投放广告并衡量效果。",
          "个性化广告设置可在 adssettings.google.com 以及 Google 广告政策页面中查看。",
        ],
      },
      {
        title: "5. 保留期限",
        body: [
          "自动收集的分析数据最多保留 26 个月，之后会自动删除。由于 ER&GG 不运营用户账号，因此不适用账号注销流程。",
        ],
      },
      {
        title: "6. 第三方共享与用户权利",
        body: [
          "ER&GG 不会向第三方出售或提供个人信息。匿名化的分析数据可能会发送给分析工具提供商。",
          "你可以删除 Cookie、阻止 Cookie，或使用分析工具的 opt-out 功能。隐私相关问题可通过服务内反馈入口发送。",
        ],
      },
    ],
  },
  "zh-Hant": {
    title: "隱私權政策",
    effectiveDate: "生效日期：2026年5月28日",
    sections: [
      {
        title: "1. 蒐集與使用目的",
        body: [
          "ER&GG 無需註冊即可使用。原則上，本服務不蒐集可識別個人身分的資訊，但為了改善服務與統計使用情況，可能會自動蒐集部分技術資訊。",
        ],
      },
      {
        title: "2. 自動蒐集的資訊",
        items: [
          "瀏覽頁面 URL 與來源",
          "瀏覽器、作業系統與螢幕資訊",
          "造訪時間、停留時間與頁面瀏覽量",
          "匿名化 IP 位址",
          "Cookie 識別碼",
        ],
      },
      {
        title: "3. Cookie 與分析工具",
        body: [
          "本服務可能使用 Vercel、Google、Amplitude 等工具進行效能統計、流量分析與產品分析。",
          "你可以在瀏覽器設定中刪除或阻止 Cookie。阻止 Cookie 不會影響服務的正常使用。",
        ],
      },
      {
        title: "4. 廣告與第三方 Cookie",
        body: [
          "本服務可能展示 Google AdSense 廣告。Google 與廣告合作夥伴可能使用 Cookie 投放廣告並衡量成效。",
          "個人化廣告設定可在 adssettings.google.com 以及 Google 廣告政策頁面中查看。",
        ],
      },
      {
        title: "5. 保留期限",
        body: [
          "自動蒐集的分析資料最多保留 26 個月，之後會自動刪除。由於 ER&GG 不營運使用者帳號，因此不適用帳號註銷流程。",
        ],
      },
      {
        title: "6. 第三方共享與使用者權利",
        body: [
          "ER&GG 不會向第三方出售或提供個人資訊。匿名化的分析資料可能會傳送給分析工具提供商。",
          "你可以刪除 Cookie、阻止 Cookie，或使用分析工具的 opt-out 功能。隱私相關問題可透過服務內回饋入口傳送。",
        ],
      },
    ],
  },
};

export default function PrivacyPage({ locale = "ko" }: { locale?: RouteLocale }) {
  const copy = COPY[locale] ?? COPY.ko;

  return (
    <article className="prose-custom mx-auto max-w-3xl py-8">
      <h1 className="dashboard-section-title mb-6 text-xl font-bold text-[var(--color-foreground)]">
        {copy.title}
      </h1>
      <p className="mb-8 text-xs text-[var(--color-muted-foreground)]">{copy.effectiveDate}</p>

      {copy.sections.map((section) => (
        <section key={section.title} className="mb-8">
          <h2 className="dashboard-section-title mb-3 text-base font-semibold text-[var(--color-foreground)]">
            {section.title}
          </h2>
          {section.body?.map((paragraph) => (
            <p
              key={paragraph}
              className="mb-3 text-sm leading-relaxed text-[var(--color-muted-foreground)] last:mb-0"
            >
              {paragraph}
            </p>
          ))}
          {section.items ? (
            <div className="metric-card p-4">
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
