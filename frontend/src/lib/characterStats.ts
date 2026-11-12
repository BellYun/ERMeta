import "server-only";

import { unstable_cache } from "next/cache";
import {
  buildCharacterStatsResponse,
  selectCharacterStatRows,
  type CharacterStatsResponse,
} from "@/lib/characterStatsShared";
import { seasonSnapshot } from "@/lib/seasonSnapshot";
import { readSnapshotStatRows } from "@/lib/server/seasonSnapshot";

export type { CharacterStatsResponse, WeaponStatItem } from "@/lib/characterStatsShared";

async function fetchCharacterStatRowsServer(patchVersion: string, tier: string) {
  return selectCharacterStatRows(await readSnapshotStatRows(patchVersion), tier);
}

export async function fetchCharacterStatsServer(
  characterCode: number,
  patchVersion: string,
  tier: string
): Promise<CharacterStatsResponse> {
  const allRows = await fetchCharacterStatRowsServer(patchVersion, tier);
  return buildCharacterStatsResponse(allRows, characterCode, patchVersion, tier);
}

async function getCachedCharacterStatRows(patchVersion: string, tier: string) {
  return unstable_cache(
    async () => fetchCharacterStatRowsServer(patchVersion, tier),
    ["character-stats-rows", seasonSnapshot.version, patchVersion, tier],
    {
      revalidate: 43200,
      tags: [
        "character-stats:rows",
        `character-stats:patch:${patchVersion}`,
        `character-stats:tier:${tier}`,
      ],
    }
  )();
}

export async function getCachedCharacterStats(
  characterCode: number,
  patchVersion: string,
  tier: string
): Promise<CharacterStatsResponse | null> {
  try {
    const allRows = await getCachedCharacterStatRows(patchVersion, tier);
    return buildCharacterStatsResponse(allRows, characterCode, patchVersion, tier);
  } catch {
    return null;
  }
}
