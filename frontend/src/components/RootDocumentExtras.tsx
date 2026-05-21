import { Analytics } from "@vercel/analytics/next";
import Script from "next/script";
import { AdSenseScript } from "@/components/ads/AdSenseScript";
import { AmplitudeLoader } from "@/components/AmplitudeLoader";
import { GoogleAnalytics } from "@/components/GoogleAnalytics";
import { WebVitalsReporter } from "@/components/WebVitalsReporter";

export function RootDocumentExtras() {
  return (
    <>
      <Analytics />
      <AmplitudeLoader />
      <WebVitalsReporter />
      <GoogleAnalytics />
      <AdSenseScript />
      {process.env.NEXT_PUBLIC_SENTRY_DSN && (
        <Script
          src={`https://js.sentry-cdn.com/${process.env.NEXT_PUBLIC_SENTRY_DSN.match(/\/\/(.+?)@/)?.[1]}.min.js`}
          crossOrigin="anonymous"
          strategy="lazyOnload"
        />
      )}
    </>
  );
}
