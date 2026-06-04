"use client";

import { usePathname } from "next/navigation";
import Script from "next/script";

const ADSENSE_CLIENT = process.env.NEXT_PUBLIC_ADSENSE_CLIENT;
const CONTENT_PATH_PREFIXES = [
  "/",
  "/about",
  "/methodology",
  "/character/",
  "/patches",
  "/season10-recap",
];

function stripLocale(pathname: string) {
  return pathname.replace(/^\/(?:ko|en|ja|zh-Hans|zh-Hant)(?=\/|$)/, "") || "/";
}

function canLoadAds(pathname: string) {
  const normalized = stripLocale(pathname);
  if (normalized.includes("/preview")) return false;
  if (normalized === "/") return true;
  return CONTENT_PATH_PREFIXES.some((prefix) => prefix !== "/" && normalized.startsWith(prefix));
}

export function AdSenseScript() {
  const pathname = usePathname();
  if (!ADSENSE_CLIENT) return null;
  if (!canLoadAds(pathname)) return null;

  return (
    <Script
      id="adsense-loader"
      async
      src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADSENSE_CLIENT}`}
      crossOrigin="anonymous"
      strategy="afterInteractive"
    />
  );
}
