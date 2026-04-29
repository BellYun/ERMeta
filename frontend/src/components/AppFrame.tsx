import type { ReactNode } from "react";
import { Header } from "@/components/layout/Header";
import { MobileTabBar } from "@/components/layout/MobileTabBar";
import { Navigation } from "@/components/layout/Navigation";
import { Link } from "@/i18n/navigation";
import { getMessage, type IntlMessages } from "@/lib/staticIntl";

interface AppFrameProps {
  children: ReactNode;
  messages: IntlMessages;
  currentPatch?: string;
  shellId?: string;
  seoLocaleShell?: boolean;
  mainId?: string;
}

export function AppFrame({
  children,
  messages,
  currentPatch = "",
  shellId,
  seoLocaleShell = false,
  mainId = "main",
}: AppFrameProps) {
  return (
    <div
      id={shellId}
      data-seo-locale-shell={seoLocaleShell ? "" : undefined}
      className="app-shell min-h-screen lg:p-4"
    >
      <a
        href={`#${mainId}`}
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[100] focus:px-3 focus:py-2 focus:rounded-md focus:bg-[var(--color-primary)] focus:text-white focus:shadow-lg focus:outline-none"
      >
        {getMessage(messages, "layout.skipToMain")}
      </a>
      <aside className="hidden lg:fixed lg:inset-y-4 lg:left-4 lg:z-40 lg:block lg:w-[220px] xl:w-[228px] lg:overflow-hidden lg:rounded-[30px] lg:border lg:border-[var(--color-border)] lg:bg-[rgba(8,13,27,0.92)] lg:shadow-[0_40px_90px_-60px_rgba(0,0,0,0.92)]">
        <Navigation currentPatch={currentPatch} />
      </aside>

      <div className="min-h-screen overflow-hidden lg:ml-[236px] xl:ml-[244px] lg:min-h-[calc(100vh-2rem)] lg:rounded-[30px] lg:border lg:border-[var(--color-border)] lg:bg-[rgba(6,10,22,0.88)] lg:shadow-[0_44px_100px_-64px_rgba(0,0,0,0.88)]">
        <div className="min-w-0 flex flex-col">
          <Header currentPatch={currentPatch} />
          <main
            id={mainId}
            className="flex-1 px-3 pt-4 pb-28 sm:px-4 sm:pt-5 sm:pb-20 lg:px-6 lg:pt-5 lg:pb-8"
          >
            {children}
          </main>
          <footer className="border-t border-[var(--color-border)] bg-[rgba(10,15,29,0.84)]">
            <div className="px-4 py-5 lg:px-6 flex flex-col gap-2.5 text-[11px] text-[var(--color-muted-foreground)] leading-relaxed">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                <Link
                  href="/terms"
                  className="min-h-[44px] sm:min-h-0 flex items-center hover:text-[var(--color-foreground)] transition-colors touch-manipulation"
                >
                  {getMessage(messages, "layout.terms")}
                </Link>
                <span className="text-[var(--color-border)]">&middot;</span>
                <Link
                  href="/privacy"
                  className="min-h-[44px] sm:min-h-0 flex items-center hover:text-[var(--color-foreground)] transition-colors touch-manipulation"
                >
                  {getMessage(messages, "layout.privacy")}
                </Link>
                <span className="text-[var(--color-border)]">&middot;</span>
                <Link
                  href="/updates"
                  className="min-h-[44px] sm:min-h-0 flex items-center hover:text-[var(--color-foreground)] transition-colors touch-manipulation"
                >
                  {getMessage(messages, "layout.updates")}
                </Link>
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
                {getMessage(messages, "layout.copyright").replace(
                  "{year}",
                  String(new Date().getFullYear())
                )}
              </p>
            </div>
          </footer>
        </div>
      </div>

      <MobileTabBar />
    </div>
  );
}
