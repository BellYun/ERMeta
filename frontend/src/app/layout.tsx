import { Analytics } from "@vercel/analytics/next";
import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";
import Script from "next/script";
import type { ReactNode } from "react";
import { AmplitudeLoader } from "@/components/AmplitudeLoader";
import { AppFrame } from "@/components/AppFrame";
import FeedbackWidget from "@/components/features/FeedbackWidget";
import { GoogleAnalytics } from "@/components/GoogleAnalytics";
import { L10nProvider } from "@/components/L10nProvider";
import { RootShellRouter } from "@/components/RootShellRouter";
import { WebVitalsReporter } from "@/components/WebVitalsReporter";
import { DEFAULT_LANGUAGE } from "@/lib/detectLanguage";
import { buildDefaultAlternates } from "@/lib/seoLocales";
import { loadL10nRecord } from "@/lib/serverL10n";
import {
  getMessage,
  HTML_LANG_BY_LANGUAGE,
  loadIntlMessages,
  OG_LOCALE_BY_LANGUAGE,
  STRUCTURED_DATA_LANGUAGE_BY_LANGUAGE,
} from "@/lib/staticIntl";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL ?? "https://erwagg.com";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export async function generateMetadata(): Promise<Metadata> {
  const language = DEFAULT_LANGUAGE;
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
    alternates: buildDefaultAlternates("/"),
    verification: {
      google: "LvphMHW2n7maCTUH68mpsXDmFexrs_KFI0hz10hxAVI",
    },
  };
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  const language = DEFAULT_LANGUAGE;
  const initialL10n = loadL10nRecord(language);
  const htmlLang = HTML_LANG_BY_LANGUAGE[language] ?? "ko";
  const messages = await loadIntlMessages(language);
  const currentPatch = "";

  return (
    <html lang={htmlLang} className={geistSans.variable}>
      <body>
        <RootShellRouter
          defaultShell={
            <L10nProvider
              initialL10n={initialL10n}
              initialMessages={messages}
              initialLanguage={language}
            >
              <AppFrame
                shellId="default-site-shell"
                messages={messages}
                currentPatch={currentPatch}
              >
                {children}
              </AppFrame>
            </L10nProvider>
          }
          feedbackWidget={
            <div id="default-feedback-widget">
              <FeedbackWidget />
            </div>
          }
        >
          {children}
        </RootShellRouter>
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
