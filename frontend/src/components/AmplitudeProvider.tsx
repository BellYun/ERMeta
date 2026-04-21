"use client";

import { useEffect } from "react";
import { analytics, type SessionSource } from "@/lib/analytics";

const PATCH_DAY_WINDOW_MS = 3 * 24 * 60 * 60 * 1000; // D0 ~ D3

/** referrer 호스트 → session_source 매핑 (pm/amplitude-event-design.md §5.2) */
function classifySessionSource(): SessionSource {
  if (typeof document === "undefined") return "direct";
  const ref = document.referrer;
  if (!ref) return "direct";
  try {
    const host = new URL(ref).hostname.toLowerCase();
    if (host.includes(window.location.hostname)) return "internal";
    if (
      host.includes("google") ||
      host.includes("naver") ||
      host.includes("bing") ||
      host.includes("daum")
    ) {
      return "organic_search";
    }
    if (
      host.includes("fmkorea") ||
      host.includes("dcinside") ||
      host.includes("inven") ||
      host.includes("reddit")
    ) {
      return "community";
    }
    if (
      host.includes("twitter") ||
      host.includes("x.com") ||
      host.includes("facebook") ||
      host.includes("instagram") ||
      host.includes("youtube") ||
      host.includes("t.co")
    ) {
      return "social";
    }
    return "direct";
  } catch {
    return "direct";
  }
}

async function detectIsPatchDay(): Promise<boolean> {
  try {
    const res = await fetch("/api/patches/history?limit=1", { cache: "default" });
    if (!res.ok) return false;
    const data = (await res.json()) as { latestStartDate?: string | null };
    if (!data.latestStartDate) return false;
    const releasedAt = new Date(data.latestStartDate).getTime();
    if (Number.isNaN(releasedAt)) return false;
    return Date.now() - releasedAt <= PATCH_DAY_WINDOW_MS;
  } catch {
    return false;
  }
}

export function AmplitudeProvider() {
  useEffect(() => {
    import("@amplitude/analytics-browser")
      .then((amplitude) => {
        amplitude.init("2559c76a80449aaf8aa57b624f7b66a5", {
          autocapture: true,
        });
      })
      .catch((err) => {
        console.error("[Amplitude] init failed:", err);
      });

    // Session Properties — init 직후 1회
    const entryPath = window.location.pathname;
    const isMobileViewport = window.matchMedia("(max-width: 768px)").matches;
    const sessionSource = classifySessionSource();
    const appVersion =
      process.env.NEXT_PUBLIC_APP_VERSION ??
      process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA ??
      "unknown";

    const params = new URLSearchParams(window.location.search);
    const isShareLanding = params.get("utm_source") === "ergg_share";
    const effectiveSessionSource = isShareLanding ? "internal" : sessionSource;

    detectIsPatchDay().then((isPatchDay) => {
      analytics.setSessionProperties({
        session_source: effectiveSessionSource,
        is_patch_day: isPatchDay,
        app_version: appVersion,
        entry_page_path: entryPath,
        is_mobile_viewport: isMobileViewport,
      });
    });

    if (isShareLanding) {
      const parseAlly = (raw: string | null): number | null => {
        if (!raw) return null;
        const n = Number.parseInt(raw, 10);
        return Number.isFinite(n) && n > 0 ? n : null;
      };
      const campaign = params.get("utm_campaign");
      const medium = params.get("utm_medium");
      analytics.synergyLinkLanded({
        landingPath: entryPath,
        ally1Code: parseAlly(params.get("ally1")),
        ally2Code: parseAlly(params.get("ally2")),
        scope: campaign === "synergy" || campaign === "synergy_detail" ? campaign : null,
        method: medium === "native" || medium === "clipboard" ? medium : null,
      });
    }
  }, []);

  return null;
}
