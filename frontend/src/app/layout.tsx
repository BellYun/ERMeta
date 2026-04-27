import { readFileSync } from "fs";
import { join } from "path";
import { Analytics } from "@vercel/analytics/next";
import type { Metadata } from "next";
import { Geist } from "next/font/google";
import { cookies, headers } from "next/headers";
import "./globals.css";
import Script from "next/script";
import { AmplitudeLoader } from "@/components/AmplitudeLoader";
import FeedbackWidget from "@/components/features/FeedbackWidget";
import { GoogleAnalytics } from "@/components/GoogleAnalytics";
import { L10nProvider } from "@/components/L10nProvider";
import { Header } from "@/components/layout/Header";
import { MobileTabBar } from "@/components/layout/MobileTabBar";
import { WebVitalsReporter } from "@/components/WebVitalsReporter";
import {
  DEFAULT_LANGUAGE,
  LANGUAGE_COOKIE,
  resolveLanguage,
  type SupportedLanguage,
} from "@/lib/detectLanguage";

function loadL10n(language: SupportedLanguage): Record<string, string> | undefined {
  try {
    const filePath = join(process.cwd(), `public/l10n/${language}.json`);
    const raw = readFileSync(filePath, "utf-8");
    return JSON.parse(raw);
  } catch {
    if (language !== DEFAULT_LANGUAGE) {
      // 결정된 언어 파일이 없으면 한국어로 폴백
      try {
        const fallback = join(process.cwd(), `public/l10n/${DEFAULT_LANGUAGE}.json`);
        return JSON.parse(readFileSync(fallback, "utf-8"));
      } catch {
        return undefined;
      }
    }
    return undefined;
  }
}

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL ?? "https://erwagg.com";

const HTML_LANG_BY_LANGUAGE: Record<SupportedLanguage, string> = {
  Korean: "ko",
  English: "en",
  Japanese: "ja",
  ChineseSimplified: "zh-Hans",
  ChineseTraditional: "zh-Hant",
  Spanish: "es",
  French: "fr",
  German: "de",
  Russian: "ru",
  Vietnamese: "vi",
  Thai: "th",
};

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(BASE_URL),
  title: {
    default: "이리와지지 | 이터널리턴 메타 분석 - ER&GG",
    template: "%s | 이리와지지 ER&GG",
  },
  description:
    "이리와지지(ER&GG) - 이터널리턴(Eternal Return) 캐릭터 티어, 3인 조합 추천, 승률·픽률·평균 RP 통계 분석 서비스. 다이아~상위 1000위 데이터 기반.",
  keywords: [
    "이리와지지",
    "이리와GG",
    "ERGG",
    "ER&GG",
    "이터널리턴",
    "Eternal Return",
    "이터널리턴 티어표",
    "이터널리턴 메타",
    "이터널리턴 조합 추천",
    "이터널리턴 캐릭터 분석",
    "이터널리턴 승률",
    "이터널리턴 픽률",
    "이터널리턴 RP",
    "이터널리턴 통계",
  ],
  authors: [{ name: "이리와지지 ER&GG" }],
  creator: "ER&GG",
  openGraph: {
    type: "website",
    locale: "ko_KR",
    url: BASE_URL,
    siteName: "이리와지지 ER&GG",
    title: "이리와지지 | 이터널리턴 메타 분석 - ER&GG",
    description:
      "이리와지지(ER&GG) - 이터널리턴 캐릭터 티어, 3인 조합 추천, 승률·픽률·평균 RP 통계 분석 서비스.",
  },
  twitter: {
    card: "summary_large_image",
    title: "이리와지지 | 이터널리턴 메타 분석 - ER&GG",
    description:
      "이리와지지(ER&GG) - 이터널리턴 캐릭터 티어, 3인 조합 추천, 승률·픽률·평균 RP 통계 분석 서비스.",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-snippet": -1,
      "max-image-preview": "large",
    },
  },
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/icon", type: "image/png", sizes: "48x48" },
    ],
    apple: "/apple-icon",
  },
  alternates: {
    canonical: BASE_URL,
  },
  verification: {
    google: "LvphMHW2n7maCTUH68mpsXDmFexrs_KFI0hz10hxAVI",
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const cookieStore = await cookies();
  const headerStore = await headers();
  const cookieLang = cookieStore.get(LANGUAGE_COOKIE)?.value;
  const acceptLanguage = headerStore.get("accept-language");
  const language = resolveLanguage(cookieLang, acceptLanguage);
  const initialL10n = loadL10n(language);
  const htmlLang = HTML_LANG_BY_LANGUAGE[language] ?? "ko";

  return (
    <html lang={htmlLang} className={geistSans.variable}>
      <body>
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[100] focus:px-3 focus:py-2 focus:rounded-md focus:bg-[var(--color-primary)] focus:text-white focus:shadow-lg focus:outline-none"
        >
          본문으로 건너뛰기
        </a>
        <L10nProvider initialL10n={initialL10n} initialLanguage={language}>
          <Header />
          <main id="main" className="max-w-6xl mx-auto px-3 sm:px-4 pt-4 sm:pt-5 pb-20 sm:pb-6">
            {children}
          </main>
          <MobileTabBar />
        </L10nProvider>
        <footer className="border-t border-[var(--color-border)] bg-[var(--color-surface)]">
          <div className="max-w-6xl mx-auto px-4 py-5 flex flex-col gap-2.5 text-[11px] text-[var(--color-muted-foreground)] leading-relaxed">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <a
                href="/terms"
                className="min-h-[44px] sm:min-h-0 flex items-center hover:text-[var(--color-foreground)] transition-colors touch-manipulation"
              >
                이용약관
              </a>
              <span className="text-[var(--color-border)]">&middot;</span>
              <a
                href="/privacy"
                className="min-h-[44px] sm:min-h-0 flex items-center hover:text-[var(--color-foreground)] transition-colors touch-manipulation"
              >
                개인정보처리방침
              </a>
              <span className="text-[var(--color-border)]">&middot;</span>
              <a
                href="/updates"
                className="min-h-[44px] sm:min-h-0 flex items-center hover:text-[var(--color-foreground)] transition-colors touch-manipulation"
              >
                업데이트 내역
              </a>
              <span className="text-[var(--color-border)]">&middot;</span>
              <a
                href="/sitemap.xml"
                className="min-h-[44px] sm:min-h-0 flex items-center hover:text-[var(--color-foreground)] transition-colors touch-manipulation"
              >
                사이트맵
              </a>
            </div>
            <p>
              본 서비스는 님블뉴런의 Open API를 활용하여 제작되었습니다. 게임 관련 이미지 및
              데이터의 저작권은 (주)님블뉴런에 있습니다.
            </p>
            <p>
              본 사이트는 님블뉴런의 공식 서비스가 아니며, 이용 중 발생하는 문제에 대해 회사는
              책임지지 않습니다.
            </p>
            <p className="text-[var(--color-foreground)]/60">
              &copy; {new Date().getFullYear()} ER&GG
            </p>
          </div>
        </footer>
        <FeedbackWidget />
        <Analytics />
        <AmplitudeLoader />
        <WebVitalsReporter />
        <GoogleAnalytics />
        {process.env.NEXT_PUBLIC_SENTRY_DSN && (
          <Script
            src={`https://js.sentry-cdn.com/${process.env.NEXT_PUBLIC_SENTRY_DSN.match(/\/\/(.+?)@/)?.[1]}.min.js`}
            crossOrigin="anonymous"
            strategy="afterInteractive"
          />
        )}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "WebSite",
              name: "이리와지지 ER&GG",
              url: BASE_URL,
              description:
                "이터널리턴(Eternal Return) 캐릭터 티어, 3인 조합 추천, 통계 분석 서비스",
              inLanguage: "ko-KR",
              potentialAction: {
                "@type": "SearchAction",
                target: `${BASE_URL}/character/{character_code}`,
                "query-input": "required name=character_code",
              },
            }),
          }}
        />
      </body>
    </html>
  );
}
