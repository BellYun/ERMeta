import { STATS_EXCLUDED_PATCHES, getStatsPatchVersions } from "@/data/patch-notes";
import {
  HOME_BASE_TIERS,
  HOME_META_COMPARISON_PATCH,
  HOME_META_TARGET_PATCH,
  type HomeBaseTier,
  type HomeMetaStats,
} from "@/lib/homeMetaShared";
import { fetchSnapshotStatRows, seasonSnapshot, type SnapshotStatRow } from "@/lib/seasonSnapshot";

export async function loadHomeMetaSnapshot(
  patchVersion: string,
  loadRows: (patch: string) => Promise<SnapshotStatRow[]> = fetchSnapshotStatRows
): Promise<HomeMetaStats> {
  const versions = Array.from(
    new Set([...getStatsPatchVersions(), ...seasonSnapshot.patches.map(({ version }) => version)])
  );
  const index = versions.indexOf(patchVersion);
  const previousPatch =
    patchVersion === HOME_META_TARGET_PATCH
      ? HOME_META_COMPARISON_PATCH
      : index >= 0
        ? (versions.slice(index + 1).find((version) => !STATS_EXCLUDED_PATCHES.has(version)) ??
          null)
        : null;
  const [current, previous] = await Promise.all([
    loadRows(patchVersion),
    previousPatch ? loadRows(previousPatch) : Promise.resolve([]),
  ]);
  const isBaseTier = (tier: string): tier is HomeBaseTier =>
    (HOME_BASE_TIERS as string[]).includes(tier);
  const rows = [...current, ...previous].flatMap((row) =>
    isBaseTier(row.tier) ? [{ ...row, tier: row.tier, bestWeapon: row.bestWeapon ?? 0 }] : []
  );

  return {
    patchVersion,
    previousPatch,
    collectedGames: current.reduce(
      (total, row) => total + (isBaseTier(row.tier) ? row.totalGames : 0),
      0
    ),
    rows,
  };
}
