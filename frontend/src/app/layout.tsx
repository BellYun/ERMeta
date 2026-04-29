import { readFileSync } from "fs";
import { join } from "path";
import { Analytics } from "@vercel/analytics/next";
import type { Metadata } from "next";
import { Geist } from "next/font/google";
import { cookies } from "next/headers";
import "./globals.css";
import Script from "next/script";
import { NextIntlClientProvider } from "next-intl";
import { AmplitudeLoader } from "@/components/AmplitudeLoader";
import FeedbackWidget from "@/components/features/FeedbackWidget";
import { GoogleAnalytics } from "@/components/GoogleAnalytics";
import { L10nProvider } from "@/components/L10nProvider";
import { Header } from "@/components/layout/Header";
import { MobileTabBar } from "@/components/layout/MobileTabBar";
import { Navigation } from "@/components/layout/Navigation";
import { WebVitalsReporter } from "@/components/WebVitalsReporter";
import {
  DEFAULT_LANGUAGE,
  LANGUAGE_COOKIE,
  SUPPORTED_LANGUAGES,
  type SupportedLanguage,
} from "@/lib/detectLanguage";
import { getPatches } from "@/lib/getPatches";

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

type IntlMessages = Record<string, unknown>;

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function mergeMessages(base: IntlMessages, overlay: IntlMessages): IntlMessages {
  const merged: IntlMessages = { ...base };

  for (const [key, value] of Object.entries(overlay)) {
    const current = merged[key];
    if (isPlainObject(current) && isPlainObject(value)) {
      merged[key] = mergeMessages(current, value);
      continue;
    }
    merged[key] = value;
  }

  return merged;
}

function getMessage(messages: IntlMessages, path: string): string {
  const value = path.split(".").reduce<unknown>((acc, key) => {
    if (!isPlainObject(acc)) return undefined;
    return acc[key];
  }, messages);

  return typeof value === "string" ? value : path;
}

function formatMessage(
  messages: IntlMessages,
  path: string,
  values?: Record<string, string | number>
): string {
  const template = getMessage(messages, path);
  if (!values) return template;
  return template.replace(/\{(\w+)\}/g, (_, key) => String(values[key] ?? `{${key}}`));
}

async function loadIntlMessages(language: SupportedLanguage): Promise<IntlMessages> {
  const locale = HTML_LANG_BY_LANGUAGE[language] ?? "ko";
  const baseMessages = (await import("../../messages/en.json")).default as IntlMessages;

  if (locale === "en") {
    return baseMessages;
  }

  try {
    const localeMessages = (await import(`../../messages/${locale}.json`)).default as IntlMessages;
    return mergeMessages(baseMessages, localeMessages);
  } catch {
    return baseMessages;
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
  Indonesian: "id_ID",
  Italian: "it_IT",
  Polish: "pl_PL",
  Portuguese: "pt_BR",
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
  Indonesian: "id",
  Italian: "it",
  Polish: "pl",
  Portuguese: "pt",
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
  Indonesian: "id-ID",
  Italian: "it-IT",
  Polish: "pl-PL",
  Portuguese: "pt-BR",
  Russian: "ru-RU",
  Vietnamese: "vi-VN",
  Thai: "th-TH",
};

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

// 루트 셸은 쿠키 기반 언어 결정에 의존하므로 정적 prerender 대신 요청 시 렌더링한다.
export const dynamic = "force-dynamic";

async function getRequestLanguage(): Promise<SupportedLanguage> {
  let cookieLang: string | undefined;
  try {
    const cookieStore = await cookies();
    cookieLang = cookieStore.get(LANGUAGE_COOKIE)?.value;
  } catch {
    // Static prerender/build 단계에는 request cookie store가 없을 수 있다.
    cookieLang = undefined;
  }

  return cookieLang && (SUPPORTED_LANGUAGES as readonly string[]).includes(cookieLang)
    ? (cookieLang as SupportedLanguage)
    : DEFAULT_LANGUAGE;
}

export async function generateMetadata(): Promise<Metadata> {
  const language = await getRequestLanguage();
  const messages = await loadIntlMessages(language);
  const titleDefault = getMessage(messages, "rootMetadata.defaultTitle");
  const description = getMessage(messages, "rootMetadata.description");
  const siteName = getMessage(messages, "rootMetadata.siteName");
  const author = getMessage(messages, "rootMetadata.author");
  const creator = getMessage(messages, "rootMetadata.creator");

  return {
    metadataBase: new URL(BASE_URL),
    title: {
      default: titleDefault,
      template: getMessage(messages, "rootMetadata.titleTemplate"),
    },
    description,
    keywords: [
      getMessage(messages, "rootMetadata.keywords.brand"),
      getMessage(messages, "rootMetadata.keywords.brandAlt"),
      getMessage(messages, "rootMetadata.keywords.app"),
      getMessage(messages, "rootMetadata.keywords.appSymbol"),
      getMessage(messages, "rootMetadata.keywords.gameKo"),
      getMessage(messages, "rootMetadata.keywords.gameEn"),
      getMessage(messages, "rootMetadata.keywords.tierList"),
      getMessage(messages, "rootMetadata.keywords.meta"),
      getMessage(messages, "rootMetadata.keywords.synergy"),
      getMessage(messages, "rootMetadata.keywords.characterAnalysis"),
      getMessage(messages, "rootMetadata.keywords.winRate"),
      getMessage(messages, "rootMetadata.keywords.pickRate"),
      getMessage(messages, "rootMetadata.keywords.rp"),
      getMessage(messages, "rootMetadata.keywords.stats"),
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
  const locale = htmlLang;
  const messages = await loadIntlMessages(language);
  const patches = await getPatches();
  const currentPatch = patches[0] ?? "";

  return (
    <html lang={htmlLang} className={geistSans.variable}>
      <body>
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[100] focus:px-3 focus:py-2 focus:rounded-md focus:bg-[var(--color-primary)] focus:text-white focus:shadow-lg focus:outline-none"
        >
          {getMessage(messages, "layout.skipToMain")}
        </a>
        <NextIntlClientProvider locale={locale} messages={messages}>
          <L10nProvider initialL10n={initialL10n} initialLanguage={language}>
            <div className="app-shell min-h-screen lg:p-4">
              <aside className="hidden lg:fixed lg:inset-y-4 lg:left-4 lg:z-40 lg:block lg:w-[220px] xl:w-[228px] lg:overflow-hidden lg:rounded-[30px] lg:border lg:border-[var(--color-border)] lg:bg-[rgba(8,13,27,0.92)] lg:shadow-[0_40px_90px_-60px_rgba(0,0,0,0.92)]">
                <Navigation currentPatch={currentPatch} />
              </aside>

              <div className="min-h-screen overflow-hidden lg:ml-[236px] xl:ml-[244px] lg:min-h-[calc(100vh-2rem)] lg:rounded-[30px] lg:border lg:border-[var(--color-border)] lg:bg-[rgba(6,10,22,0.88)] lg:shadow-[0_44px_100px_-64px_rgba(0,0,0,0.88)]">
                <div className="min-w-0 flex flex-col">
                  <Header currentPatch={currentPatch} />
                  <main
                    id="main"
                    className="flex-1 px-3 pt-4 pb-28 sm:px-4 sm:pt-5 sm:pb-20 lg:px-6 lg:pt-5 lg:pb-8"
                  >
                    {children}
                  </main>
                  <footer className="border-t border-[var(--color-border)] bg-[rgba(10,15,29,0.84)]">
                    <div className="px-4 py-5 lg:px-6 flex flex-col gap-2.5 text-[11px] text-[var(--color-muted-foreground)] leading-relaxed">
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                        <a
                          href="/terms"
                          className="min-h-[44px] sm:min-h-0 flex items-center hover:text-[var(--color-foreground)] transition-colors touch-manipulation"
                        >
                          {getMessage(messages, "layout.terms")}
                        </a>
                        <span className="text-[var(--color-border)]">&middot;</span>
                        <a
                          href="/privacy"
                          className="min-h-[44px] sm:min-h-0 flex items-center hover:text-[var(--color-foreground)] transition-colors touch-manipulation"
                        >
                          {getMessage(messages, "layout.privacy")}
                        </a>
                        <span className="text-[var(--color-border)]">&middot;</span>
                        <a
                          href="/updates"
                          className="min-h-[44px] sm:min-h-0 flex items-center hover:text-[var(--color-foreground)] transition-colors touch-manipulation"
                        >
                          {getMessage(messages, "layout.updates")}
                        </a>
                        <span className="text-[var(--color-border)]">&middot;</span>
                        <a
                          href="/sitemap.xml"
                          className="min-h-[44px] sm:min-h-0 flex items-center hover:text-[var(--color-foreground)] transition-colors touch-manipulation"
                        >
                          {getMessage(messages, "layout.sitemap")}
                        </a>
                      </div>
                      <p>{getMessage(messages, "layout.apiAttribution")}</p>
                      <p>{getMessage(messages, "layout.disclaimer")}</p>
                      <p className="text-[var(--color-foreground)]/60">
                        {formatMessage(messages, "layout.copyright", {
                          year: new Date().getFullYear(),
                        })}
                      </p>
                    </div>
                  </footer>
                </div>
              </div>
            </div>
            <MobileTabBar />
          </L10nProvider>
        </NextIntlClientProvider>
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
              name: getMessage(messages, "rootMetadata.siteName"),
              url: BASE_URL,
              description: getMessage(messages, "rootMetadata.structuredDescription"),
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
