export const AD_PLACEMENT_EXPERIMENT = "home_ad_placement_v1";
export const AD_PLACEMENT_STORAGE_KEY = "ergg:home-ad-placement:v1:variant";

export type AdPlacementVariant = "control" | "optimized";
export type AdPlacementMode = "off" | "experiment" | AdPlacementVariant;
export type AdPlacementAssignmentSource = "off" | "experiment" | "forced";
export type AdPlacementName = "after_ranking" | "before_filters";

export interface AdPlacementStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export interface AdPlacementAssignment {
  variant: AdPlacementVariant;
  source: AdPlacementAssignmentSource;
}

export interface AdPlacementAttribution {
  experiment: typeof AD_PLACEMENT_EXPERIMENT;
  variant: AdPlacementVariant;
  placement: AdPlacementName;
  assignmentSource: Exclude<AdPlacementAssignmentSource, "off">;
}

export function isAdPlacementVariant(value: unknown): value is AdPlacementVariant {
  return value === "control" || value === "optimized";
}

export function resolveAdPlacementMode(
  configured: string | undefined,
  nodeEnv: string | undefined
): AdPlacementMode {
  if (
    configured === "off" ||
    configured === "experiment" ||
    configured === "control" ||
    configured === "optimized"
  ) {
    return configured;
  }

  if (configured) return "off";
  return nodeEnv === "production" ? "experiment" : "optimized";
}

export function getOrCreateAdPlacementVariant(
  storage: AdPlacementStorage | null,
  randomBucket: number
): AdPlacementVariant {
  if (storage) {
    try {
      const stored = storage.getItem(AD_PLACEMENT_STORAGE_KEY);
      if (isAdPlacementVariant(stored)) return stored;
    } catch {
      // Storage can be unavailable in private or restricted browsing contexts.
    }
  }

  const variant: AdPlacementVariant = randomBucket < 0.5 ? "control" : "optimized";

  if (storage) {
    try {
      storage.setItem(AD_PLACEMENT_STORAGE_KEY, variant);
    } catch {
      // The page-level assignment remains valid when persistence is unavailable.
    }
  }

  return variant;
}

export function resolveAdPlacementAssignment(
  storage: AdPlacementStorage | null,
  mode: AdPlacementMode,
  randomBucket: number
): AdPlacementAssignment {
  if (mode === "off") return { variant: "control", source: "off" };
  if (mode === "control" || mode === "optimized") {
    return { variant: mode, source: "forced" };
  }
  return {
    variant: getOrCreateAdPlacementVariant(storage, randomBucket),
    source: "experiment",
  };
}

export function getAdPlacementName(variant: AdPlacementVariant): AdPlacementName {
  return variant === "optimized" ? "before_filters" : "after_ranking";
}

export function getCurrentAdPlacementAttribution(): AdPlacementAttribution | undefined {
  if (typeof document === "undefined") return undefined;

  const variant = document.documentElement.dataset.adPlacementVariant;
  const source = document.documentElement.dataset.adPlacementSource;
  if (!isAdPlacementVariant(variant) || (source !== "experiment" && source !== "forced")) {
    return undefined;
  }

  return {
    experiment: AD_PLACEMENT_EXPERIMENT,
    variant,
    placement: getAdPlacementName(variant),
    assignmentSource: source,
  };
}
