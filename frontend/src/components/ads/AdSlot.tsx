"use client";

import { useLocale } from "next-intl";
import { type CSSProperties, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ADSENSE_CLIENT,
  ADSENSE_PREVIEW,
  type AdSlotReservation,
} from "@/components/ads/adsenseConfig";
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
  reservation?: AdSlotReservation;
  minHeight?: number;
}

const AD_LABEL: Record<RouteLocale, string> = {
  ko: "광고",
  en: "Ad",
  ja: "広告",
  "zh-Hans": "广告",
  "zh-Hant": "廣告",
};

type AdSlotStatus = "reserved" | "requested" | "filled" | "unfilled" | "timeout";

type AdSlotStyle = CSSProperties & {
  "--ad-reserved-height": string;
  "--ad-reserved-height-sm": string;
  "--ad-reserved-height-lg": string;
  "--ad-reserved-width"?: string;
};

function getReservationStyle(
  reservation: AdSlotReservation | undefined,
  fallbackHeight: number
): AdSlotStyle {
  const baseHeight = reservation?.baseHeight ?? fallbackHeight;
  const smHeight = reservation?.smHeight ?? baseHeight;
  const lgHeight = reservation?.lgHeight ?? smHeight;

  return {
    "--ad-reserved-height": `${baseHeight}px`,
    "--ad-reserved-height-sm": `${smHeight}px`,
    "--ad-reserved-height-lg": `${lgHeight}px`,
    "--ad-reserved-width": reservation?.width ? `${reservation.width}px` : undefined,
  };
}

function getCurrentReservedHeight(
  reservation: AdSlotReservation | undefined,
  fallbackHeight: number
) {
  if (typeof window === "undefined") return reservation?.baseHeight ?? fallbackHeight;
  if (window.matchMedia("(min-width: 1024px)").matches) {
    return (
      reservation?.lgHeight ?? reservation?.smHeight ?? reservation?.baseHeight ?? fallbackHeight
    );
  }
  if (window.matchMedia("(min-width: 640px)").matches) {
    return reservation?.smHeight ?? reservation?.baseHeight ?? fallbackHeight;
  }
  return reservation?.baseHeight ?? fallbackHeight;
}

export function AdSlot({
  slot,
  slotName,
  format = "auto",
  layout,
  layoutKey,
  responsive = true,
  className,
  reservation,
  minHeight = 100,
}: AdSlotProps) {
  const locale = useLocale() as RouteLocale;
  const label = AD_LABEL[locale] ?? AD_LABEL.ko;
  const rootRef = useRef<HTMLDivElement | null>(null);
  const insRef = useRef<HTMLModElement | null>(null);
  const pushedElement = useRef<HTMLModElement | null>(null);
  const renderedTracked = useRef(false);
  const viewedTracked = useRef(false);
  const statusTracked = useRef<Set<AdSlotStatus>>(new Set());
  const [status, setStatus] = useState<AdSlotStatus>("reserved");
  const reservedHeight = getCurrentReservedHeight(reservation, minHeight);
  const reservedStyle = useMemo(
    () => getReservationStyle(reservation, minHeight),
    [minHeight, reservation]
  );

  const trackStatus = useCallback(
    (nextStatus: AdSlotStatus) => {
      if (!slot || statusTracked.current.has(nextStatus)) return;
      statusTracked.current.add(nextStatus);
      analytics.adSlotStateChanged({
        slotName,
        adSlotId: slot,
        status: nextStatus,
        reservedHeight,
        reservedWidth: reservation?.width ?? null,
      });
    },
    [reservation?.width, reservedHeight, slot, slotName]
  );

  useEffect(() => {
    const element = insRef.current;
    if (ADSENSE_PREVIEW || !ADSENSE_CLIENT || !slot || !element) return;
    if (pushedElement.current === element) return;
    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
      pushedElement.current = element;
      trackStatus("requested");
    } catch {
      // adsbygoogle may not be loaded yet; loader script will retry on script load
    }
  }, [slot, trackStatus]);

  useEffect(() => {
    if (ADSENSE_PREVIEW || !ADSENSE_CLIENT || !slot) return;
    const element = insRef.current;
    if (!element || typeof MutationObserver === "undefined") return;

    const updateStatus = () => {
      const adStatus = element.getAttribute("data-ad-status");
      const nextStatus = adStatus === "filled" || adStatus === "unfilled" ? adStatus : null;
      if (!nextStatus) return;
      setStatus(nextStatus);
      trackStatus(nextStatus);
    };

    const observer = new MutationObserver(updateStatus);
    observer.observe(element, { attributes: true, attributeFilter: ["data-ad-status"] });

    const timeoutId = setTimeout(() => {
      if (element.getAttribute("data-ad-status")) return;
      if (element.querySelector("iframe")) return;
      setStatus("timeout");
      trackStatus("timeout");
    }, 6000);

    return () => {
      observer.disconnect();
      clearTimeout(timeoutId);
    };
  }, [slot, trackStatus]);

  useEffect(() => {
    if (!slot || renderedTracked.current) return;
    renderedTracked.current = true;
    analytics.adSlotRendered({
      slotName,
      adSlotId: slot,
      reservedHeight,
      reservedWidth: reservation?.width ?? null,
    });
  }, [reservation?.width, reservedHeight, slot, slotName]);

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
            analytics.adSlotViewed({
              slotName,
              adSlotId: slot,
              reservedHeight,
              reservedWidth: reservation?.width ?? null,
            });
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
  }, [reservation?.width, reservedHeight, slot, slotName]);

  if (ADSENSE_PREVIEW) {
    return (
      <div
        ref={rootRef}
        className={`ad-placement ad-placement-preview ${className ?? ""}`}
        style={reservedStyle}
        data-ad-slot-name={slotName}
        data-ad-slot-status="preview"
      >
        <span className="ad-placement-label">{label}</span>
        <div className="ad-placement-preview-box" aria-hidden="true" />
      </div>
    );
  }

  if (!ADSENSE_CLIENT || !slot) return null;

  const showFallback = status === "unfilled" || status === "timeout";

  return (
    <div
      ref={rootRef}
      className={`ad-placement ${className ?? ""}`}
      style={reservedStyle}
      data-ad-slot-name={slotName}
      data-ad-slot-status={status}
    >
      <span className="ad-placement-label">{label}</span>
      <ins
        key={`${slotName}:${slot}`}
        ref={insRef}
        className="adsbygoogle block"
        style={{ display: "block", minHeight: 0, width: "100%", height: "100%" }}
        data-ad-client={ADSENSE_CLIENT}
        data-ad-slot={slot}
        data-ad-format={format}
        data-ad-layout={layout}
        data-ad-layout-key={layoutKey}
        data-full-width-responsive={responsive ? "true" : "false"}
      />
      {showFallback ? (
        <div className="ad-placement-fallback" aria-hidden="true">
          {label}
        </div>
      ) : null}
    </div>
  );
}
