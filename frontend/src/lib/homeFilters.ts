export const DEFAULT_HOME_TIER = "MITHRIL";

const HOME_TIERS = new Set(["DIAMOND", "METEORITE", "MITHRIL"]);

function getFirstParam(raw: string | string[] | undefined): string | null {
  if (Array.isArray(raw)) {
    return raw[0] ?? null;
  }
  return raw ?? null;
}

export function normalizeHomePatch(
  raw: string | string[] | undefined,
  patches: string[],
  fallbackPatch = patches[0] ?? ""
): string {
  const value = getFirstParam(raw);
  if (!value) return fallbackPatch;
  return patches.includes(value) ? value : fallbackPatch;
}

export function normalizeHomeTier(
  raw: string | string[] | undefined,
  fallbackTier = DEFAULT_HOME_TIER
): string {
  const value = getFirstParam(raw);
  if (!value) return fallbackTier;
  return HOME_TIERS.has(value) ? value : fallbackTier;
}

export function buildHomeFiltersQuery({
  currentQuery,
  patch,
  tier,
  defaultPatch,
  defaultTier = DEFAULT_HOME_TIER,
}: {
  currentQuery: string;
  patch: string;
  tier: string;
  defaultPatch: string;
  defaultTier?: string;
}): string {
  const params = new URLSearchParams(currentQuery);

  if (!patch || patch === defaultPatch) {
    params.delete("patch");
  } else {
    params.set("patch", patch);
  }

  if (!tier || tier === defaultTier) {
    params.delete("tier");
  } else {
    params.set("tier", tier);
  }

  return params.toString();
}
