"use client";

import { useEffect, useMemo, useSyncExternalStore } from "react";
import {
  ADSENSE_CHANNELS,
  ADSENSE_SLOT_RESERVATIONS,
  ADSENSE_SLOTS,
} from "@/components/ads/adsenseConfig";
import { AdSlot } from "@/components/ads/AdSlot";
import {
  getCurrentAdPlacementAttribution,
  type AdPlacementAttribution,
} from "@/lib/adPlacementExperiment";
import { analytics } from "@/lib/analytics";

const subscribeToHydration = () => () => {};
const getClientSnapshot = () => true;
const getServerSnapshot = () => false;
const HOME_AD_VIEWPORT_QUERY = "(max-width: 1279px)";

const subscribeToEligibleViewport = (onStoreChange: () => void) => {
  const mediaQuery = window.matchMedia(HOME_AD_VIEWPORT_QUERY);
  mediaQuery.addEventListener("change", onStoreChange);
  return () => mediaQuery.removeEventListener("change", onStoreChange);
};

const getEligibleViewportSnapshot = () => window.matchMedia(HOME_AD_VIEWPORT_QUERY).matches;

function getInteraction(link: HTMLAnchorElement) {
  if (link.closest(".home-forecast-preview")) return "forecast" as const;
  if (link.closest(".home-entry__rankings")) return "rankings" as const;
  if (link.closest(".home-entry__team")) return "synergy" as const;
  return "other" as const;
}

function useHomeAdPlacementOutcome(attribution: AdPlacementAttribution | undefined) {
  useEffect(() => {
    if (!attribution || !window.matchMedia("(max-width: 1279px)").matches) return;

    const pageRoot = document.querySelector(".patch-home");
    if (!pageRoot) return;

    const pagePath = window.location.pathname;
    const startedAt = performance.now();
    let engaged = false;
    let exitTracked = false;

    const trackExit = (reason: "pagehide" | "component_unmount") => {
      if (exitTracked) return;
      exitTracked = true;
      analytics.homeAdPlacementExperimentExited({
        attribution,
        reason,
        engaged,
        durationMs: performance.now() - startedAt,
        pagePath,
      });
    };

    const handleClick = (event: Event) => {
      if (engaged || !(event.target instanceof Element)) return;
      const link = event.target.closest<HTMLAnchorElement>("a[href]");
      if (!link || !pageRoot.contains(link)) return;

      engaged = true;
      const destination = new URL(link.href, window.location.href);
      analytics.homeAdPlacementExperimentEngaged({
        attribution,
        interaction: getInteraction(link),
        destinationPath: `${destination.pathname}${destination.search}${destination.hash}`,
        elapsedMs: performance.now() - startedAt,
        pagePath,
      });
    };

    const handlePageHide = (event: PageTransitionEvent) => {
      if (!event.persisted) trackExit("pagehide");
    };

    pageRoot.addEventListener("click", handleClick, true);
    window.addEventListener("pagehide", handlePageHide);

    return () => {
      pageRoot.removeEventListener("click", handleClick, true);
      window.removeEventListener("pagehide", handlePageHide);
      trackExit("component_unmount");
    };
  }, [attribution]);
}

export function HomeAdPlacementSlot() {
  const hydrated = useSyncExternalStore(subscribeToHydration, getClientSnapshot, getServerSnapshot);
  const eligibleViewport = useSyncExternalStore(
    subscribeToEligibleViewport,
    getEligibleViewportSnapshot,
    getServerSnapshot
  );
  const attribution = useMemo(
    () => (hydrated ? getCurrentAdPlacementAttribution() : undefined),
    [hydrated]
  );
  useHomeAdPlacementOutcome(eligibleViewport ? attribution : undefined);

  const experimentChannel =
    attribution?.variant === "before_forecast"
      ? ADSENSE_CHANNELS.home_before_forecast
      : attribution?.variant === "after_forecast"
        ? ADSENSE_CHANNELS.home_after_forecast
        : "";

  if (!hydrated || !eligibleViewport) {
    return (
      <div
        className="home-data-ad home-entry__ad"
        style={{ height: ADSENSE_SLOT_RESERVATIONS.contentHorizontal.baseHeight }}
        aria-hidden="true"
      />
    );
  }

  return (
    <div className="home-entry__ad">
      <AdSlot
        slot={ADSENSE_SLOTS.homeRanking}
        slotName="home_ranking"
        channel={experimentChannel || ADSENSE_CHANNELS.home_ranking}
        experiment={attribution}
        className="home-data-ad px-3 py-2.5 sm:px-4"
        reservation={ADSENSE_SLOT_RESERVATIONS.contentHorizontal}
      />
    </div>
  );
}
