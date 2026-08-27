"use client";

import { useLocale } from "next-intl";
import { type CSSProperties, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ADSENSE_CHANNELS,
  ADSENSE_CLIENT,
  ADSENSE_PREVIEW,
  type AdSlotReservation,
} from "@/components/ads/adsenseConfig";
import type { RouteLocale } from "@/i18n/routing";
import { markAdSlotState } from "@/lib/adPerformance";
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
type TrackedAdSlotStatus = Exclude<AdSlotStatus, "reserved">;
const AD_REQUEST_ROOT_MARGIN = "800px 0px";

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
  const statusTracked = useRef<Set<TrackedAdSlotStatus>>(new Set());
  const renderedAt = useRef<number | null>(null);
  const requestedAt = useRef<number | null>(null);
  const filledAt = useRef<number | null>(null);
  const [status, setStatus] = useState<AdSlotStatus>("reserved");
  const slotKey = `${slotName}:${slot}`;
  const reservedStyle = useMemo(
    () => getReservationStyle(reservation, minHeight),
    [minHeight, reservation]
  );

  const trackStatus = useCallback(
    (nextStatus: TrackedAdSlotStatus) => {
      if (!slot || statusTracked.current.has(nextStatus)) return;
      statusTracked.current.add(nextStatus);
      const currentTime = performance.now();
      if (nextStatus === "requested" && requestedAt.current === null) {
        requestedAt.current = currentTime;
      }
      if (nextStatus === "filled" && filledAt.current === null) {
        filledAt.current = currentTime;
      }
      markAdSlotState(slotKey, nextStatus);
      analytics.adSlotStateChanged({
        slotName,
        adSlotId: slot,
        status: nextStatus,
        reservedHeight: getCurrentReservedHeight(reservation, minHeight),
        reservedWidth: reservation?.width ?? null,
        elapsedSinceRenderMs:
          renderedAt.current === null ? undefined : currentTime - renderedAt.current,
        requestToStateMs:
          requestedAt.current === null ? undefined : currentTime - requestedAt.current,
      });
    },
    [minHeight, reservation, slot, slotKey, slotName]
  );

  const requestSlot = useCallback(() => {
    const element = insRef.current;
    if (ADSENSE_PREVIEW || !ADSENSE_CLIENT || !slot || !element) return;
    if (pushedElement.current === element) return;
    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
      pushedElement.current = element;
      setStatus("requested");
      trackStatus("requested");
    } catch {
      // A queued adsbygoogle command is normally accepted before the loader finishes.
    }
  }, [slot, trackStatus]);

  useEffect(() => {
    if (!slot || renderedTracked.current) return;
    renderedTracked.current = true;
    renderedAt.current = performance.now();
    markAdSlotState(slotKey, "rendered");
    analytics.adSlotRendered({
      slotName,
      adSlotId: slot,
      reservedHeight: getCurrentReservedHeight(reservation, minHeight),
      reservedWidth: reservation?.width ?? null,
    });
  }, [minHeight, reservation, slot, slotKey, slotName]);

  useEffect(() => {
    if (ADSENSE_PREVIEW || !ADSENSE_CLIENT || !slot) return;
    const element = rootRef.current;
    if (!element) return;
    if (typeof IntersectionObserver === "undefined") {
      const timeoutId = setTimeout(requestSlot, 0);
      return () => clearTimeout(timeoutId);
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting) return;
        requestSlot();
        observer.disconnect();
      },
      { rootMargin: AD_REQUEST_ROOT_MARGIN, threshold: 0 }
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, [requestSlot, slot]);

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

    updateStatus();

    return () => observer.disconnect();
  }, [slot, trackStatus]);

  useEffect(() => {
    if (status !== "requested") return;
    const element = insRef.current;
    if (!element) return;

    const timeoutId = setTimeout(() => {
      if (element.getAttribute("data-ad-status")) return;
      if (element.querySelector("iframe")) return;
      setStatus("timeout");
      trackStatus("timeout");
    }, 10_000);

    return () => clearTimeout(timeoutId);
  }, [status, trackStatus]);

  useEffect(() => {
    if (!slot || status !== "filled" || viewedTracked.current) return;
    const element = insRef.current;
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
            const currentTime = performance.now();
            viewedTracked.current = true;
            markAdSlotState(slotKey, "viewable");
            analytics.adSlotViewed({
              slotName,
              adSlotId: slot,
              reservedHeight: getCurrentReservedHeight(reservation, minHeight),
              reservedWidth: reservation?.width ?? null,
              renderToViewableMs:
                renderedAt.current === null ? undefined : currentTime - renderedAt.current,
              fillToViewableMs:
                filledAt.current === null ? undefined : currentTime - filledAt.current,
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
  }, [minHeight, reservation, slot, slotKey, slotName, status]);

  if (ADSENSE_PREVIEW) {
    return (
      <div
        ref={rootRef}
        className={`ad-placement ad-placement-preview ${className ?? ""}`}
        style={reservedStyle}
        data-ad-slot-name={slotName}
        data-ad-slot-key={slotKey}
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
      data-ad-slot-key={slotKey}
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
        data-ad-channel={ADSENSE_CHANNELS[slotName] || undefined}
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
