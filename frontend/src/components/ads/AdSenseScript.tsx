"use client";

import { usePathname } from "next/navigation";
import Script from "next/script";
import { useEffect, useRef } from "react";
import { ADSENSE_CLIENT, ADSENSE_PREVIEW } from "@/components/ads/adsenseConfig";
import { markAdScriptError, markAdScriptLoaded, markAdScriptScheduled } from "@/lib/adPerformance";
import { analytics } from "@/lib/analytics";

const CONTENT_PATH_PREFIXES = [
  "/",
  "/about",
  "/methodology",
  "/character/",
  "/patches",
  "/patch-analysis",
  "/synergy-detail",
];

function stripLocale(pathname: string) {
  return pathname.replace(/^\/(?:ko|en|ja|zh-Hans|zh-Hant)(?=\/|$)/, "") || "/";
}

export function canLoadAds(pathname: string) {
  const normalized = stripLocale(pathname);
  if (normalized.includes("/preview")) return false;
  if (normalized === "/") return true;
  return CONTENT_PATH_PREFIXES.some((prefix) => prefix !== "/" && normalized.startsWith(prefix));
}

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
