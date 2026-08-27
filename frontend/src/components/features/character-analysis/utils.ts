import type { CharacterStatsResponse } from "@/app/api/character/stats/[characterCode]/route";

export function mergeSuccessfulPatchStats(
  current: (CharacterStatsResponse | null)[],
  patchCount: number,
  selectedPatchIndex: number,
  selectedResult: CharacterStatsResponse | null,
  previousResult: CharacterStatsResponse | null,
  includePreviousPatch: boolean
) {
  let merged = current;

  const writeResult = (index: number, result: CharacterStatsResponse | null) => {
    if (!result || index < 0 || index >= patchCount || merged[index] === result) return;
    if (merged === current) {
      merged = current.length === patchCount ? [...current] : Array(patchCount).fill(null);
    }
    merged[index] = result;
  };

  writeResult(selectedPatchIndex, selectedResult);
  if (includePreviousPatch) {
    writeResult(selectedPatchIndex + 1, previousResult);
  }

  return merged;
}

export async function fetchStats(
  characterCode: number,
  patchVersion: string,
  tier: string,
  baseUrl?: string
): Promise<CharacterStatsResponse | null> {
  try {
    const base = baseUrl ?? "";
    const res = await fetch(
      `${base}/api/character/stats/${characterCode}?tier=${tier}&patchVersion=${encodeURIComponent(patchVersion)}`
    );
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

export async function fetchStatsHistory(
  characterCode: number,
  patches: string[],
  tier: string,
  baseUrl?: string
): Promise<(CharacterStatsResponse | null)[] | null> {
  try {
    const base = baseUrl ?? "";
    const params = new URLSearchParams({
      tier,
      patchVersions: patches.join(","),
    });
    const res = await fetch(`${base}/api/character/stats-history/${characterCode}?${params}`);
    if (!res.ok) return null;

    const data = await res.json();
    if (!Array.isArray(data.stats)) return null;
    return data.stats;
  } catch {
    return null;
  }
}

export async function fetchPatches(baseUrl?: string): Promise<string[]> {
  try {
    const base = baseUrl ?? "";
    const res = await fetch(`${base}/api/patches/history?limit=10&includeInactive=true`);
    if (!res.ok) return [];
    const data = await res.json();
    return data.patches ?? [];
  } catch {
    return [];
  }
}
