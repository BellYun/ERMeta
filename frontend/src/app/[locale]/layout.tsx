import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { AppFrame } from "@/components/AppFrame";
import FeedbackWidget from "@/components/features/FeedbackWidget";
import { L10nProvider } from "@/components/L10nProvider";
import { ROUTE_LOCALES, LANGUAGE_BY_ROUTE_LOCALE, isRouteLocale } from "@/i18n/routing";
import { loadL10nRecord } from "@/lib/serverL10n";
import { loadIntlMessages } from "@/lib/staticIntl";

interface LocaleLayoutProps {
  children: ReactNode;
  params: Promise<{ locale: string }>;
}

export function generateStaticParams() {
  return ROUTE_LOCALES.map((locale) => ({ locale }));
}

export default async function LocaleLayout({ children, params }: LocaleLayoutProps) {
  const { locale } = await params;

  if (!isRouteLocale(locale)) {
    notFound();
  }

  const language = LANGUAGE_BY_ROUTE_LOCALE[locale];
  const initialL10n = loadL10nRecord(language);
  const initialMessages = await loadIntlMessages(language);

  return (
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
  );
}
