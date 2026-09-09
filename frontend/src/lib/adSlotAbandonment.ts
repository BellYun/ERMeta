export type ObservedAdStatus = "missing" | "filled" | "unfilled" | "other";
export type AdSlotRequestAgeBucket = "under_3s" | "3s_to_10s" | "10s_plus";

const TERMINAL_AD_SLOT_STATUSES = ["filled", "unfilled", "timeout"] as const;

export function shouldTrackAdSlotAbandonment(
  trackedStatuses: ReadonlySet<string>,
  alreadyTracked: boolean
) {
  if (alreadyTracked || !trackedStatuses.has("requested")) return false;
  return !TERMINAL_AD_SLOT_STATUSES.some((status) => trackedStatuses.has(status));
}

export function getObservedAdState(element: HTMLElement | null): {
  hasIframe: boolean;
  observedAdStatus: ObservedAdStatus;
} {
  const adStatus = element?.getAttribute("data-ad-status");
  const observedAdStatus =
    adStatus === "filled" || adStatus === "unfilled" ? adStatus : adStatus ? "other" : "missing";

  return {
    hasIframe: Boolean(element?.querySelector("iframe")),
    observedAdStatus,
  };
}

export function getAdSlotRequestAgeBucket(elapsedMs: number): AdSlotRequestAgeBucket {
  if (elapsedMs < 3_000) return "under_3s";
  if (elapsedMs < 10_000) return "3s_to_10s";
  return "10s_plus";
}

export function getDocumentVisibility(
  visibilityState: string | undefined
): "visible" | "hidden" | "prerender" | "unknown" {
  if (
    visibilityState === "visible" ||
    visibilityState === "hidden" ||
    visibilityState === "prerender"
  ) {
    return visibilityState;
  }
  return "unknown";
}
