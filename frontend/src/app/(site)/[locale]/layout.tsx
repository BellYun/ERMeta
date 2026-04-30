import type { Metadata } from "next";
import { notFound } from "next/navigation";
import "../../globals.css";
import type { ReactNode } from "react";
import { AppFrame } from "@/components/AppFrame";
import FeedbackWidget from "@/components/features/FeedbackWidget";
import { L10nProvider } from "@/components/L10nProvider";
import { RootDocumentExtras } from "@/components/RootDocumentExtras";
import { LANGUAGE_BY_ROUTE_LOCALE, ROUTE_LOCALES, isRouteLocale } from "@/i18n/routing";
import { geistSans } from "@/lib/geistFont";
import { loadL10nRecord } from "@/lib/serverL10n";
import { buildSiteMetadata, buildWebsiteStructuredData } from "@/lib/siteMetadata";
import { HTML_LANG_BY_LANGUAGE, loadIntlMessages } from "@/lib/staticIntl";

interface LocaleLayoutProps {
  children: ReactNode;
  params: Promise<{ locale: string }>;
}

export function generateStaticParams() {
  return ROUTE_LOCALES.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }: LocaleLayoutProps): Promise<Metadata> {
  const { locale } = await params;

  if (!isRouteLocale(locale)) {
    notFound();
  }

  return buildSiteMetadata(LANGUAGE_BY_ROUTE_LOCALE[locale], locale);
}

export default async function LocaleLayout({ children, params }: LocaleLayoutProps) {
  const { locale } = await params;

  if (!isRouteLocale(locale)) {
    notFound();
  }

  const language = LANGUAGE_BY_ROUTE_LOCALE[locale];
  const initialL10n = loadL10nRecord(language);
  const initialMessages = await loadIntlMessages(language);
  const htmlLang = HTML_LANG_BY_LANGUAGE[language] ?? "ko";
  const structuredData = await buildWebsiteStructuredData(language, locale);

  return (
    <html lang={htmlLang} className={geistSans.variable}>
      <body>
        <L10nProvider
          initialL10n={initialL10n}
          initialMessages={initialMessages}
          initialLanguage={language}
          lockInitialLanguage
        >
          <AppFrame shellId={`locale-shell-${locale}`} messages={initialMessages} currentPatch="">
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
