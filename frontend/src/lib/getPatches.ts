import { unstable_cache } from "next/cache";
import { getVisibleStatsPatchVersions, isVisibleStatsPatchVersion } from "@/data/patch-notes";
import {
  filterReadyStatsPatchVersions,
  HOME_BASE_TIERS,
  HOME_META_TARGET_PATCH,
} from "@/lib/homeMetaShared";
import { MAX_PUBLIC_PATCH_VERSION } from "@/lib/publicPatchVersion";
import { seasonSnapshot } from "@/lib/seasonSnapshot";
import { readSnapshotStatRows } from "@/lib/server/seasonSnapshot";

async function fetchPatches(): Promise<string[]> {
  const patches = seasonSnapshot.patches
    .filter((patch) => patch.isActive)
    .map((patch) => patch.version)
    .filter(isVisibleStatsPatchVersion);
  const rows = await readSnapshotStatRows(HOME_META_TARGET_PATCH);
  const collectedGames = rows.reduce(
    (sum, row) => sum + ((HOME_BASE_TIERS as string[]).includes(row.tier) ? row.totalGames : 0),
    0
  );
  return filterReadyStatsPatchVersions(
    Array.from(new Set([...getVisibleStatsPatchVersions(), ...patches])),
    collectedGames
  );
}

export const getPatches = unstable_cache(
  fetchPatches,
  [
    "public-patches",
    process.env.VERCEL_GIT_COMMIT_SHA ?? "local",
    MAX_PUBLIC_PATCH_VERSION,
    seasonSnapshot.version,
  ],
  { revalidate: false }
);

/** New characters have no ranked history before their release patch. */
export function selectCharacterPatches(characterCode: number, patches: string[]): string[] {
  if (characterCode !== 91) return patches;
  return [
    ...new Set([
      "12.5",
      ...patches.filter((patch) => patch.localeCompare("12.5", undefined, { numeric: true }) >= 0),
    ]),
  ].sort((a, b) => b.localeCompare(a, undefined, { numeric: true }));
}
