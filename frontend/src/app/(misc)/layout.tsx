import type { Metadata } from "next";
import "../globals.css";
import type { ReactNode } from "react";
import { FontStylesheetLinks } from "@/components/FontStylesheetLinks";
import { L10nProvider } from "@/components/L10nProvider";
import { RootDocumentExtras } from "@/components/RootDocumentExtras";
import { ThemeInitScript } from "@/components/ThemeInitScript";
import { DEFAULT_LANGUAGE } from "@/lib/detectLanguage";
import { geistSans } from "@/lib/geistFont";
import { loadL10nSeed } from "@/lib/serverL10n";
import { HTML_LANG_BY_LANGUAGE, loadIntlMessages } from "@/lib/staticIntl";

export async function generateMetadata(): Promise<Metadata> {
  return {
    robots: {
      index: false,
      follow: false,
      googleBot: {
        index: false,
        follow: false,
      },
    },
  };
}

export default async function MiscLayout({ children }: { children: ReactNode }) {
  const initialMessages = await loadIntlMessages(DEFAULT_LANGUAGE);
  const initialL10nSeed = loadL10nSeed(DEFAULT_LANGUAGE);

  return (
    <html
      lang={HTML_LANG_BY_LANGUAGE[DEFAULT_LANGUAGE] ?? "ko"}
      className={geistSans.variable}
      suppressHydrationWarning
    >
      <head>
        <FontStylesheetLinks />
        <ThemeInitScript />
      </head>
      <body>
        <L10nProvider
          initialL10nSeed={initialL10nSeed}
          initialMessages={initialMessages}
          initialLanguage={DEFAULT_LANGUAGE}
        >
          {children}
        </L10nProvider>
        <RootDocumentExtras />
      </body>
    </html>
  );
}
