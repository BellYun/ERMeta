"use client";

import { useEffect, useRef } from "react";
import { ADSENSE_CLIENT, ADSENSE_PREVIEW } from "@/components/ads/adsenseConfig";

declare global {
  interface Window {
    adsbygoogle?: Array<Record<string, unknown>>;
  }
}

interface AdSlotProps {
  slot: string;
  format?: "auto" | "fluid" | "rectangle" | "horizontal" | "vertical";
  layout?: string;
  layoutKey?: string;
  responsive?: boolean;
  className?: string;
  minHeight?: number;
}

export function AdSlot({
  slot,
  format = "auto",
  layout,
  layoutKey,
  responsive = true,
  className,
  minHeight = 100,
}: AdSlotProps) {
  const pushed = useRef(false);

  useEffect(() => {
    if (ADSENSE_PREVIEW || !ADSENSE_CLIENT || !slot || pushed.current) return;
    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
      pushed.current = true;
    } catch {
      // adsbygoogle may not be loaded yet; loader script will retry on script load
    }
  }, [slot]);

  if (ADSENSE_PREVIEW) {
    return (
      <div className={`ad-placement ad-placement-preview ${className ?? ""}`} style={{ minHeight }}>
        <span className="ad-placement-label">Advertisement</span>
        <div className="ad-placement-preview-box">AdSense preview</div>
      </div>
    );
  }

  if (!ADSENSE_CLIENT || !slot) return null;

  return (
    <div className={`ad-placement ${className ?? ""}`} style={{ minHeight }}>
      <span className="ad-placement-label">Advertisement</span>
      <ins
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
