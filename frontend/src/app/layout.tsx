import { readFileSync } from "fs";
import { join } from "path";
import { Analytics } from "@vercel/analytics/next";
import type { Metadata } from "next";
import { Geist } from "next/font/google";
import { cookies } from "next/headers";
import "./globals.css";
import Script from "next/script";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages, getTranslations } from "next-intl/server";
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
  SUPPORTED_LANGUAGES,
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

const OG_LOCALE_BY_LANGUAGE: Record<SupportedLanguage, string> = {
  Korean: "ko_KR",
  English: "en_US",
  Japanese: "ja_JP",
  ChineseSimplified: "zh_CN",
  ChineseTraditional: "zh_TW",
  Spanish: "es_ES",
  French: "fr_FR",
  German: "de_DE",
  Russian: "ru_RU",
  Vietnamese: "vi_VN",
  Thai: "th_TH",
};

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

const STRUCTURED_DATA_LANGUAGE_BY_LANGUAGE: Record<SupportedLanguage, string> = {
  Korean: "ko-KR",
  English: "en-US",
  Japanese: "ja-JP",
  ChineseSimplified: "zh-CN",
  ChineseTraditional: "zh-TW",
  Spanish: "es-ES",
  French: "fr-FR",
  German: "de-DE",
  Russian: "ru-RU",
  Vietnamese: "vi-VN",
  Thai: "th-TH",
};

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

async function getRequestLanguage(): Promise<SupportedLanguage> {
  const cookieStore = await cookies();
  const cookieLang = cookieStore.get(LANGUAGE_COOKIE)?.value;

  return cookieLang && (SUPPORTED_LANGUAGES as readonly string[]).includes(cookieLang)
    ? (cookieLang as SupportedLanguage)
    : DEFAULT_LANGUAGE;
}

export async function generateMetadata(): Promise<Metadata> {
  const language = await getRequestLanguage();
  const t = await getTranslations("rootMetadata");
  const titleDefault = t("defaultTitle");
  const description = t("description");
  const siteName = t("siteName");
  const author = t("author");
  const creator = t("creator");

  return {
    metadataBase: new URL(BASE_URL),
    title: {
      default: titleDefault,
      template: t("titleTemplate"),
    },
    description,
    keywords: [
      t("keywords.brand"),
      t("keywords.brandAlt"),
      t("keywords.app"),
      t("keywords.appSymbol"),
      t("keywords.gameKo"),
      t("keywords.gameEn"),
      t("keywords.tierList"),
      t("keywords.meta"),
      t("keywords.synergy"),
      t("keywords.characterAnalysis"),
      t("keywords.winRate"),
      t("keywords.pickRate"),
      t("keywords.rp"),
      t("keywords.stats"),
    ],
    authors: [{ name: author }],
    creator,
    openGraph: {
      type: "website",
      locale: OG_LOCALE_BY_LANGUAGE[language] ?? "en_US",
      url: BASE_URL,
      siteName,
      title: titleDefault,
      description,
    },
    twitter: {
      card: "summary_large_image",
      title: titleDefault,
      description,
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
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const language = await getRequestLanguage();
  const initialL10n = loadL10n(language);
  const htmlLang = HTML_LANG_BY_LANGUAGE[language] ?? "ko";
  const locale = await getLocale();
  const messages = await getMessages();
  const t = await getTranslations("layout");
  const metadataT = await getTranslations("rootMetadata");

  return (
    <html lang={htmlLang} className={geistSans.variable}>
      <body>
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[100] focus:px-3 focus:py-2 focus:rounded-md focus:bg-[var(--color-primary)] focus:text-white focus:shadow-lg focus:outline-none"
        >
          {t("skipToMain")}
        </a>
        <NextIntlClientProvider locale={locale} messages={messages}>
          <L10nProvider initialL10n={initialL10n} initialLanguage={language}>
            <Header />
            <main id="main" className="max-w-6xl mx-auto px-3 sm:px-4 pt-4 sm:pt-5 pb-20 sm:pb-6">
              {children}
            </main>
            <MobileTabBar />
          </L10nProvider>
        </NextIntlClientProvider>
        <footer className="border-t border-[var(--color-border)] bg-[var(--color-surface)]">
          <div className="max-w-6xl mx-auto px-4 py-5 flex flex-col gap-2.5 text-[11px] text-[var(--color-muted-foreground)] leading-relaxed">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <a
                href="/terms"
                className="min-h-[44px] sm:min-h-0 flex items-center hover:text-[var(--color-foreground)] transition-colors touch-manipulation"
              >
                {t("terms")}
              </a>
              <span className="text-[var(--color-border)]">&middot;</span>
              <a
                href="/privacy"
                className="min-h-[44px] sm:min-h-0 flex items-center hover:text-[var(--color-foreground)] transition-colors touch-manipulation"
              >
                {t("privacy")}
              </a>
              <span className="text-[var(--color-border)]">&middot;</span>
              <a
                href="/updates"
                className="min-h-[44px] sm:min-h-0 flex items-center hover:text-[var(--color-foreground)] transition-colors touch-manipulation"
              >
                {t("updates")}
              </a>
              <span className="text-[var(--color-border)]">&middot;</span>
              <a
                href="/sitemap.xml"
                className="min-h-[44px] sm:min-h-0 flex items-center hover:text-[var(--color-foreground)] transition-colors touch-manipulation"
              >
                {t("sitemap")}
              </a>
            </div>
            <p>{t("apiAttribution")}</p>
            <p>{t("disclaimer")}</p>
            <p className="text-[var(--color-foreground)]/60">
              {t("copyright", { year: new Date().getFullYear() })}
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
              name: metadataT("siteName"),
              url: BASE_URL,
              description: metadataT("structuredDescription"),
              inLanguage: STRUCTURED_DATA_LANGUAGE_BY_LANGUAGE[language] ?? "en-US",
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
