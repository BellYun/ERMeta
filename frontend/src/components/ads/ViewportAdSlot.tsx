"use client";

import { type ComponentProps, useCallback, useSyncExternalStore } from "react";
import { AdSlot } from "@/components/ads/AdSlot";

interface ViewportAdSlotProps extends ComponentProps<typeof AdSlot> {
  minViewportWidth: number;
}

const getServerSnapshot = () => false;

export function getMinViewportWidthQuery(minViewportWidth: number) {
  return `(min-width: ${minViewportWidth}px)`;
}

export function ViewportAdSlot({ minViewportWidth, ...adSlotProps }: ViewportAdSlotProps) {
  const mediaQuery = getMinViewportWidthQuery(minViewportWidth);
  const subscribe = useCallback(
    (onStoreChange: () => void) => {
      const mediaQueryList = window.matchMedia(mediaQuery);
      mediaQueryList.addEventListener("change", onStoreChange);
      return () => mediaQueryList.removeEventListener("change", onStoreChange);
    },
    [mediaQuery]
  );
  const getSnapshot = useCallback(() => window.matchMedia(mediaQuery).matches, [mediaQuery]);
  const isViewportEligible = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  if (!isViewportEligible) return null;

  return <AdSlot {...adSlotProps} />;
}
