"use client";

import { useLocale } from "next-intl";
import { useEffect, useRef } from "react";
import { ADSENSE_CLIENT, ADSENSE_PREVIEW } from "@/components/ads/adsenseConfig";
import type { RouteLocale } from "@/i18n/routing";
import { analytics, type AdSlotName } from "@/lib/analytics";

declare global {
  interface Window {
    adsbygoogle?: Array<Record<string, unknown>>;
  }
}

interface AdSlotProps {
  slot: string;
  slotName: AdSlotName;
  format?: "auto" | "fluid" | "rectangle" | "horizontal" | "vertical";
  layout?: string;
  layoutKey?: string;
  responsive?: boolean;
  className?: string;
  minHeight?: number;
}

const AD_LABEL: Record<RouteLocale, string> = {
  ko: "광고",
  en: "Ad",
  ja: "広告",
  "zh-Hans": "广告",
  "zh-Hant": "廣告",
};

export function AdSlot({
  slot,
  slotName,
  format = "auto",
  layout,
  layoutKey,
  responsive = true,
  className,
  minHeight = 100,
}: AdSlotProps) {
  const locale = useLocale() as RouteLocale;
  const label = AD_LABEL[locale] ?? AD_LABEL.ko;
  const rootRef = useRef<HTMLDivElement | null>(null);
  const insRef = useRef<HTMLModElement | null>(null);
  const pushedElement = useRef<HTMLModElement | null>(null);
  const renderedTracked = useRef(false);
  const viewedTracked = useRef(false);

  useEffect(() => {
    const element = insRef.current;
    if (ADSENSE_PREVIEW || !ADSENSE_CLIENT || !slot || !element) return;
    if (pushedElement.current === element) return;
    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
      pushedElement.current = element;
    } catch {
      // adsbygoogle may not be loaded yet; loader script will retry on script load
    }
  }, [slot]);

  useEffect(() => {
    if (!slot || renderedTracked.current) return;
    renderedTracked.current = true;
    analytics.adSlotRendered({ slotName, adSlotId: slot });
  }, [slot, slotName]);

  useEffect(() => {
    if (!slot || viewedTracked.current) return;
    const element = rootRef.current;
    if (!element || typeof IntersectionObserver === "undefined") return;

    let viewTimer: ReturnType<typeof setTimeout> | null = null;

    const clearViewTimer = () => {
      if (!viewTimer) return;
      clearTimeout(viewTimer);
      viewTimer = null;
    };

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry || viewedTracked.current) return;
        if (entry.isIntersecting && entry.intersectionRatio >= 0.5) {
          if (viewTimer) return;
          viewTimer = setTimeout(() => {
            viewedTracked.current = true;
            analytics.adSlotViewed({ slotName, adSlotId: slot });
            observer.disconnect();
          }, 1000);
        } else {
          clearViewTimer();
        }
      },
      { threshold: [0, 0.5, 1] }
    );

    observer.observe(element);

    return () => {
      clearViewTimer();
      observer.disconnect();
    };
  }, [slot, slotName]);

  if (ADSENSE_PREVIEW) {
    return (
      <div
        ref={rootRef}
        className={`ad-placement ad-placement-preview ${className ?? ""}`}
        style={{ minHeight }}
      >
        <span className="ad-placement-label">{label}</span>
        <div className="ad-placement-preview-box" aria-hidden="true" />
      </div>
    );
  }

  if (!ADSENSE_CLIENT || !slot) return null;

  return (
    <div ref={rootRef} className={`ad-placement ${className ?? ""}`} style={{ minHeight }}>
      <span className="ad-placement-label">{label}</span>
      <ins
        key={`${slotName}:${slot}`}
        ref={insRef}
        className="adsbygoogle block"
        style={{ display: "block", minHeight, width: "100%" }}
        data-ad-client={ADSENSE_CLIENT}
        data-ad-slot={slot}
        data-ad-format={format}
        data-ad-layout={layout}
        data-ad-layout-key={layoutKey}
        data-full-width-responsive={responsive ? "true" : "false"}
      />
    </div>
  );
}
