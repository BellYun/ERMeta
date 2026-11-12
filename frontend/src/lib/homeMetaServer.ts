import { unstable_cache } from "next/cache";
import { loadHomeMetaSnapshot } from "@/lib/homeMetaSnapshot";
import { seasonSnapshot } from "@/lib/seasonSnapshot";
import { readSnapshotStatRows } from "@/lib/server/seasonSnapshot";
import { createEmptyHomeMetaStats, type HomeMetaStats } from "./homeMetaShared";
import { isPatchPageTestFixtureMode } from "./patchPageCache";

export async function getCachedHomeMetaStats(patchVersion: string): Promise<HomeMetaStats> {
  return unstable_cache(
    () => loadHomeMetaSnapshot(patchVersion, readSnapshotStatRows),
    [
      "home-meta-snapshot",
      process.env.VERCEL_GIT_COMMIT_SHA ?? "local",
      seasonSnapshot.version,
      patchVersion,
    ],
    { revalidate: false }
  )();
}

export async function getPatchPageMetaStats(patchVersion: string): Promise<HomeMetaStats> {
  if (isPatchPageTestFixtureMode()) return createEmptyHomeMetaStats(patchVersion);
  return getCachedHomeMetaStats(patchVersion);
}
