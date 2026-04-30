import type { Metadata } from "next";
import "../globals.css";
import type { ReactNode } from "react";
import { L10nProvider } from "@/components/L10nProvider";
import { RootDocumentExtras } from "@/components/RootDocumentExtras";
import { DEFAULT_LANGUAGE } from "@/lib/detectLanguage";
import { geistSans } from "@/lib/geistFont";
import { loadL10nRecord } from "@/lib/serverL10n";
import { buildDefaultSiteMetadata } from "@/lib/siteMetadata";
import { HTML_LANG_BY_LANGUAGE, loadIntlMessages } from "@/lib/staticIntl";

export async function generateMetadata(): Promise<Metadata> {
  return buildDefaultSiteMetadata();
}

export default async function MiscLayout({ children }: { children: ReactNode }) {
  const initialL10n = loadL10nRecord(DEFAULT_LANGUAGE);
  const initialMessages = await loadIntlMessages(DEFAULT_LANGUAGE);

  return (
    <html lang={HTML_LANG_BY_LANGUAGE[DEFAULT_LANGUAGE] ?? "ko"} className={geistSans.variable}>
      <body>
        <L10nProvider
          initialL10n={initialL10n}
          initialMessages={initialMessages}
          initialLanguage={DEFAULT_LANGUAGE}
          lockInitialLanguage
        >
          {children}
        </L10nProvider>
        <RootDocumentExtras />
      </body>
    </html>
  );
}
