"use client";

import { useEffect } from "react";
import { analytics } from "@/lib/analytics";

type VitalName = "LCP" | "INP" | "CLS" | "TTFB" | "FCP";

interface VitalMetric {
  name: VitalName;
  value: number;
  delta: number;
  id: string;
  rating: "good" | "needs-improvement" | "poor";
  navigationType?: string;
}

/**
 * Core Web Vitals 를 web-vitals 라이브러리로 수집하여 Amplitude 에 forward.
 * LCP/INP/CLS/TTFB/FCP 5종 구독. 각 metric 은 페이지 hidden 시점에 최종값 1회 fire.
 * SSR 안전: useEffect 내부에서만 동적 import 하며, dev 환경에서는 analytics layer 가 no-op.
 */
export function WebVitalsReporter() {
  useEffect(() => {
    let cancelled = false;

    const forward = (metric: VitalMetric) => {
      if (cancelled) return;
      analytics.webVitalReported({
        name: metric.name,
        value: metric.value,
        delta: metric.delta,
        id: metric.id,
        rating: metric.rating,
        navigationType: metric.navigationType,
      });
    };

    import("web-vitals")
      .then(({ onLCP, onINP, onCLS, onTTFB, onFCP }) => {
        if (cancelled) return;
        onLCP(forward);
        onINP(forward);
        onCLS(forward);
        onTTFB(forward);
        onFCP(forward);
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, []);

  return null;
}
