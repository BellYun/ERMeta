"use client";

import { useEffect } from "react";
import type { MetricWithAttribution } from "web-vitals";
import {
  getResourceHost,
  isAdResourceUrl,
  startAdPerformanceMonitoring,
} from "@/lib/adPerformance";
import { analytics } from "@/lib/analytics";

function roundTiming(value: number | undefined) {
  return value === undefined ? undefined : Math.round(value * 10) / 10;
}

function generateMetricTarget(node: Node | null) {
  if (!(node instanceof Element)) return undefined;
  const adSlot = node.closest<HTMLElement>("[data-ad-slot-name]");
  const slotName = adSlot?.dataset.adSlotName;
  return slotName ? `ad_slot:${slotName}` : undefined;
}

function getAttributionProperties(metric: MetricWithAttribution) {
  if (metric.name === "INP") {
    const { attribution } = metric;
    const longestScript = attribution.longestScript;
    const sourceUrl = longestScript?.entry.sourceURL;
    return {
      attribution_target: attribution.interactionTarget,
      attribution_load_state: attribution.loadState,
      inp_interaction_type: attribution.interactionType,
      inp_input_delay_ms: roundTiming(attribution.inputDelay),
      inp_processing_duration_ms: roundTiming(attribution.processingDuration),
      inp_presentation_delay_ms: roundTiming(attribution.presentationDelay),
      inp_longest_script_host: getResourceHost(sourceUrl),
      inp_longest_script_is_ad: sourceUrl ? isAdResourceUrl(sourceUrl) : null,
      inp_longest_script_subpart: longestScript?.subpart,
      inp_longest_script_intersection_ms: roundTiming(longestScript?.intersectingDuration),
      inp_total_script_ms: roundTiming(attribution.totalScriptDuration),
      inp_total_style_layout_ms: roundTiming(attribution.totalStyleAndLayoutDuration),
      inp_total_paint_ms: roundTiming(attribution.totalPaintDuration),
      inp_total_unattributed_ms: roundTiming(attribution.totalUnattributedDuration),
    };
  }

  if (metric.name === "LCP") {
    const { attribution } = metric;
    return {
      attribution_target: attribution.target,
      lcp_resource_host: getResourceHost(attribution.url),
      lcp_resource_is_ad: attribution.url ? isAdResourceUrl(attribution.url) : null,
      lcp_ttfb_ms: roundTiming(attribution.timeToFirstByte),
      lcp_resource_load_delay_ms: roundTiming(attribution.resourceLoadDelay),
      lcp_resource_load_duration_ms: roundTiming(attribution.resourceLoadDuration),
      lcp_element_render_delay_ms: roundTiming(attribution.elementRenderDelay),
    };
  }

  if (metric.name === "CLS") {
    const { attribution } = metric;
    const target = attribution.largestShiftTarget;
    return {
      attribution_target: target,
      attribution_load_state: attribution.loadState,
      cls_largest_shift_is_ad: target?.startsWith("ad_slot:") ?? false,
      cls_largest_shift_time_ms: roundTiming(attribution.largestShiftTime),
      cls_largest_shift_value: roundTiming(attribution.largestShiftValue),
    };
  }

  if (metric.name === "FCP") {
    return {
      attribution_load_state: metric.attribution.loadState,
      fcp_ttfb_ms: roundTiming(metric.attribution.timeToFirstByte),
      fcp_first_byte_to_fcp_ms: roundTiming(metric.attribution.firstByteToFCP),
    };
  }

  return {
    ttfb_waiting_ms: roundTiming(metric.attribution.waitingDuration),
    ttfb_cache_ms: roundTiming(metric.attribution.cacheDuration),
    ttfb_dns_ms: roundTiming(metric.attribution.dnsDuration),
    ttfb_connection_ms: roundTiming(metric.attribution.connectionDuration),
    ttfb_request_ms: roundTiming(metric.attribution.requestDuration),
  };
}

/**
 * Core Web Vitals 를 web-vitals 라이브러리로 수집하여 Amplitude 에 forward.
 * LCP/INP/CLS/TTFB/FCP 5종 구독. 각 metric 은 페이지 hidden 시점에 최종값 1회 fire.
 * SSR 안전: useEffect 내부에서만 동적 import 하며, dev 환경에서는 analytics layer 가 no-op.
 */
export function WebVitalsReporter() {
  useEffect(() => {
    let cancelled = false;
    const pagePath = window.location.pathname;
    startAdPerformanceMonitoring();

    const forward = (metric: MetricWithAttribution) => {
      if (cancelled) return;
      analytics.webVitalReported({
        name: metric.name,
        value: metric.value,
        delta: metric.delta,
        id: metric.id,
        rating: metric.rating,
        navigationType: metric.navigationType,
        pagePath,
        attribution: getAttributionProperties(metric),
      });
    };

    import("web-vitals/attribution")
      .then(({ onLCP, onINP, onCLS, onTTFB, onFCP }) => {
        if (cancelled) return;
        const options = { generateTarget: generateMetricTarget };
        onLCP(forward, options);
        onINP(forward, { ...options, includeProcessedEventEntries: false });
        onCLS(forward, options);
        onTTFB(forward, options);
        onFCP(forward, options);
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, []);

  return null;
}
