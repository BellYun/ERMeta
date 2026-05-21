"use client";

import { useEffect, useRef } from "react";

const ADSENSE_CLIENT = process.env.NEXT_PUBLIC_ADSENSE_CLIENT;

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
    if (!ADSENSE_CLIENT || pushed.current) return;
    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
      pushed.current = true;
    } catch {
      // adsbygoogle may not be loaded yet; loader script will retry on script load
    }
  }, []);

  if (!ADSENSE_CLIENT) return null;

  return (
    <ins
      className={`adsbygoogle block ${className ?? ""}`}
      style={{ display: "block", minHeight, width: "100%" }}
      data-ad-client={ADSENSE_CLIENT}
      data-ad-slot={slot}
      data-ad-format={format}
      data-ad-layout={layout}
      data-ad-layout-key={layoutKey}
      data-full-width-responsive={responsive ? "true" : "false"}
    />
  );
}
