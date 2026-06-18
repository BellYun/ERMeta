import Link from "next/link";
import type { ReactNode } from "react";
import { ADSENSE_SLOTS, canRenderAdSlot } from "@/components/ads/adsenseConfig";
import { AdSlot } from "@/components/ads/AdSlot";
import { Header } from "@/components/layout/Header";
import type { RouteLocale } from "@/i18n/routing";
import { localizeRoutePath } from "@/lib/seoLocales";
import { getMessage, type IntlMessages } from "@/lib/staticIntl";

interface AppFrameProps {
  children: ReactNode;
  messages: IntlMessages;
  currentPatch?: string;
  patchAnalysisPatch?: string;
  shellId?: string;
  seoLocaleShell?: boolean;
  routeLocale?: RouteLocale;
  mainId?: string;
}

export function AppFrame({
  children,
  messages,
  currentPatch = "",
  patchAnalysisPatch = "",
  shellId,
  seoLocaleShell = false,
  routeLocale,
  mainId = "main",
}: AppFrameProps) {
  const showLeftRailAd = canRenderAdSlot(ADSENSE_SLOTS.siteRailLeft);
  const showRightRailAd = canRenderAdSlot(ADSENSE_SLOTS.siteRailRight);
  const showRailAds = showLeftRailAd || showRightRailAd;
  const footerHref = (pathname: string) =>
    routeLocale ? localizeRoutePath(pathname, routeLocale) : pathname;

  return (
    <div
      id={shellId}
      data-seo-locale-shell={seoLocaleShell ? "" : undefined}
      className="app-shell min-h-screen"
    >
      <a
        href={`#${mainId}`}
        className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-[100] focus:rounded-md focus:bg-[var(--color-primary)] focus:px-3 focus:py-2 focus:text-white focus:outline-none"
      >
        {getMessage(messages, "layout.skipToMain")}
      </a>
      <div className="min-h-screen overflow-hidden bg-[var(--color-background)]">
        <div className="min-w-0 flex flex-col">
          <Header currentPatch={currentPatch} patchAnalysisPatch={patchAnalysisPatch} />
          <div
            className={
              showRailAds
                ? "mx-auto grid w-full max-w-[1720px] grid-cols-1 gap-4 px-3 pt-4 pb-8 sm:px-4 sm:pt-5 sm:pb-10 lg:px-6 lg:pt-5 lg:pb-8 2xl:grid-cols-[160px_minmax(0,1fr)_160px]"
                : "mx-auto w-full max-w-[1440px] px-3 pt-4 pb-8 sm:px-4 sm:pt-5 sm:pb-10 lg:px-6 lg:pt-5 lg:pb-8"
            }
          >
            {showRailAds ? (
              <aside className="hidden 2xl:block" aria-label="Left advertisement">
                {showLeftRailAd ? (
                  <div className="fixed top-[8.5rem] left-[max(1.5rem,calc((100vw-1720px)/2+1.5rem))] z-20 w-40">
                    <AdSlot
                      slot={ADSENSE_SLOTS.siteRailLeft}
                      slotName="site_rail_left"
                      format="vertical"
                      responsive={false}
                      className="rounded-lg border border-[var(--color-border)] bg-white px-2 py-2"
                      minHeight={600}
                    />
                  </div>
                ) : null}
              </aside>
            ) : null}
            <main id={mainId} className="min-w-0 flex-1">
              {children}
            </main>
            {showRailAds ? (
              <aside className="hidden 2xl:block" aria-label="Right advertisement">
                {showRightRailAd ? (
                  <div className="fixed top-[8.5rem] right-[max(1.5rem,calc((100vw-1720px)/2+1.5rem))] z-20 w-40">
                    <AdSlot
                      slot={ADSENSE_SLOTS.siteRailRight}
                      slotName="site_rail_right"
                      format="vertical"
                      responsive={false}
                      className="rounded-lg border border-[var(--color-border)] bg-white px-2 py-2"
                      minHeight={600}
                    />
                  </div>
                ) : null}
              </aside>
            ) : null}
          </div>
          <footer className="border-t border-[var(--color-border)] bg-white">
            <div className="mx-auto flex w-full max-w-[1440px] flex-col gap-2.5 px-4 py-5 text-[11px] leading-relaxed text-[var(--color-muted-foreground)] lg:px-6">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                <Link
                  href={footerHref("/about")}
                  className="min-h-[44px] sm:min-h-0 flex items-center hover:text-[var(--color-foreground)] transition-colors touch-manipulation"
                >
                  {getMessage(messages, "layout.about")}
                </Link>
                <span className="text-[var(--color-border)]">&middot;</span>
                <Link
                  href={footerHref("/methodology")}
                  className="min-h-[44px] sm:min-h-0 flex items-center hover:text-[var(--color-foreground)] transition-colors touch-manipulation"
                >
                  {getMessage(messages, "layout.methodology")}
                </Link>
                <span className="text-[var(--color-border)]">&middot;</span>
                <Link
                  href={footerHref("/terms")}
                  className="min-h-[44px] sm:min-h-0 flex items-center hover:text-[var(--color-foreground)] transition-colors touch-manipulation"
                >
                  {getMessage(messages, "layout.terms")}
                </Link>
                <span className="text-[var(--color-border)]">&middot;</span>
                <Link
                  href={footerHref("/privacy")}
                  className="min-h-[44px] sm:min-h-0 flex items-center hover:text-[var(--color-foreground)] transition-colors touch-manipulation"
                >
                  {getMessage(messages, "layout.privacy")}
                </Link>
                <span className="text-[var(--color-border)]">&middot;</span>
                <Link
                  href={footerHref("/updates")}
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
    </div>
  );
}
