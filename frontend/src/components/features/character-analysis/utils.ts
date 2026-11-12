import {
  buildCharacterStatsResponse,
  selectCharacterStatRows,
  type CharacterStatsResponse,
} from "@/lib/characterStatsShared";
import { fetchSeasonSnapshot, type SnapshotStatRow } from "@/lib/seasonSnapshot";
import { expandCumulativeTier } from "@/utils/tier";

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

type CharacterSnapshot = Record<
  string,
  { rows: SnapshotStatRow[]; gamesByTier: Record<string, number> }
>;

const characterRequests = new Map<number, Promise<CharacterSnapshot | null>>();
const MAX_CACHED_CHARACTERS = 8;

function readCharacterStats(characterCode: number) {
  const cached = characterRequests.get(characterCode);
  if (cached) {
    characterRequests.delete(characterCode);
    characterRequests.set(characterCode, cached);
    return cached;
  }

  const request = fetchSeasonSnapshot<CharacterSnapshot>(
    "character-stats/" + characterCode + ".json"
  ).catch((error) => {
    if (characterRequests.get(characterCode) === request) characterRequests.delete(characterCode);
    throw error;
  });
  characterRequests.set(characterCode, request);
  if (characterRequests.size > MAX_CACHED_CHARACTERS) {
    const oldest = characterRequests.keys().next().value;
    if (oldest != null) characterRequests.delete(oldest);
  }
  return request;
}

export async function fetchStats(
  characterCode: number,
  patchVersion: string,
  tier: string
): Promise<CharacterStatsResponse | null> {
  try {
    const patch = (await readCharacterStats(characterCode))?.[patchVersion];
    const rows = selectCharacterStatRows(patch?.rows ?? [], tier);
    const grandTotal = expandCumulativeTier(tier).reduce(
      (total, baseTier) => total + (patch?.gamesByTier[baseTier] ?? 0),
      0
    );
    return buildCharacterStatsResponse(rows, characterCode, patchVersion, tier, grandTotal);
  } catch {
    return null;
  }
}

export async function fetchStatsHistory(characterCode: number, patches: string[], tier: string) {
  return Promise.all(patches.map((patch) => fetchStats(characterCode, patch, tier)));
}
