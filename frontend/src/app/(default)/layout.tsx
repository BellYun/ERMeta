import type { Metadata } from "next";
import "../globals.css";
import type { ReactNode } from "react";
import { AppFrame } from "@/components/AppFrame";
import FeedbackWidget from "@/components/features/FeedbackWidget";
import { L10nProvider } from "@/components/L10nProvider";
import { RootDocumentExtras } from "@/components/RootDocumentExtras";
import { DEFAULT_ROUTE_LOCALE } from "@/i18n/routing";
import { DEFAULT_LANGUAGE } from "@/lib/detectLanguage";
import { buildDefaultSiteMetadata, buildWebsiteStructuredData } from "@/lib/siteMetadata";
import { HTML_LANG_BY_LANGUAGE, loadIntlMessages } from "@/lib/staticIntl";

export async function generateMetadata(): Promise<Metadata> {
  return buildDefaultSiteMetadata();
}

export default async function DefaultLayout({ children }: { children: ReactNode }) {
  const initialMessages = await loadIntlMessages(DEFAULT_LANGUAGE);
  const structuredData = await buildWebsiteStructuredData(DEFAULT_LANGUAGE, DEFAULT_ROUTE_LOCALE);

  return (
    <html lang={HTML_LANG_BY_LANGUAGE[DEFAULT_LANGUAGE] ?? "ko"}>
      <body>
        <L10nProvider
          initialMessages={initialMessages}
          initialLanguage={DEFAULT_LANGUAGE}
          lockInitialLanguage
        >
          <AppFrame shellId="default-ko-shell" messages={initialMessages} currentPatch="">
            {children}
          </AppFrame>
          <FeedbackWidget />
        </L10nProvider>
        <RootDocumentExtras />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(structuredData),
          }}
        />
      </body>
    </html>
  );
}
