"use client";

import { usePathname } from "next/navigation";
import Script from "next/script";
import { useEffect, useRef } from "react";
import { ADSENSE_CLIENT, ADSENSE_PREVIEW } from "@/components/ads/adsenseConfig";
import { markAdScriptError, markAdScriptLoaded, markAdScriptScheduled } from "@/lib/adPerformance";
import { canLoadAds } from "@/lib/adRoutes";
import { analytics } from "@/lib/analytics";

export { canLoadAds } from "@/lib/adRoutes";

export function AdSenseScript() {
  const pathname = usePathname();
  const trackedStates = useRef(new Set<"scheduled" | "loaded" | "error">());
  const shouldLoad = !ADSENSE_PREVIEW && Boolean(ADSENSE_CLIENT) && canLoadAds(pathname);

  useEffect(() => {
    if (!shouldLoad || trackedStates.current.has("scheduled")) return;
    trackedStates.current.add("scheduled");
    markAdScriptScheduled();
    analytics.adScriptStateChanged({ state: "scheduled" });
  }, [shouldLoad]);

  if (!shouldLoad) return null;

  return (
    <Script
      id="adsense-loader"
      async
      src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADSENSE_CLIENT}`}
      crossOrigin="anonymous"
      strategy="lazyOnload"
      onLoad={() => {
        if (trackedStates.current.has("loaded")) return;
        trackedStates.current.add("loaded");
        markAdScriptLoaded();
        analytics.adScriptStateChanged({ state: "loaded" });
      }}
      onError={() => {
        if (trackedStates.current.has("error")) return;
        trackedStates.current.add("error");
        markAdScriptError();
        analytics.adScriptStateChanged({ state: "error" });
      }}
    />
  );
}
