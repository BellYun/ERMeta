import { unstable_cache } from "next/cache";
import { loadHomeMetaSnapshot } from "@/lib/homeMetaSnapshot";
import { seasonSnapshot } from "@/lib/seasonSnapshot";
import { readSnapshotStatRows } from "@/lib/server/seasonSnapshot";
import {
  createEmptyHomeMetaStats,
  HOME_META_TARGET_PATCH,
  type HomeMetaStats,
} from "./homeMetaShared";
import { getPatchPageRevalidate, isPatchPageTestFixtureMode } from "./patchPageCache";

function fetchHomeMetaStats(patchVersion: string): Promise<HomeMetaStats> {
  return loadHomeMetaSnapshot(patchVersion, readSnapshotStatRows);
}

export async function getCachedHomeMetaStats(patchVersion: string): Promise<HomeMetaStats> {
  return unstable_cache(
    async () => fetchHomeMetaStats(patchVersion),
    ["home-meta-stats-v10-12-6-comparison", seasonSnapshot.version, patchVersion],
    {
      revalidate: patchVersion === HOME_META_TARGET_PATCH ? 1800 : 21600,
      tags: ["home-meta-stats", `home-meta-stats:${patchVersion}`],
    }
  )();
}

// 상세 페이지의 티어 표시가 홈의 짧은 TTL을 상속하지 않도록 독립 캐시를 사용한다.
export async function getCharacterPageMetaStats(patchVersion: string): Promise<HomeMetaStats> {
  return unstable_cache(
    () => fetchHomeMetaStats(patchVersion),
    ["character-page-meta-v1", seasonSnapshot.version, patchVersion],
    {
      revalidate: 21600,
      tags: ["home-meta-stats", `home-meta-stats:${patchVersion}`],
    }
  )();
}

// 홈의 30분 캐시와 분리해 상세 페이지의 ISR 주기가 짧아지는 것을 방지한다.
export async function getPatchPageMetaStats(patchVersion: string): Promise<HomeMetaStats> {
  if (isPatchPageTestFixtureMode()) return createEmptyHomeMetaStats(patchVersion);
  return unstable_cache(
    async () => fetchHomeMetaStats(patchVersion),
    [
      "patch-page-meta-strict-v1",
      process.env.VERCEL_GIT_COMMIT_SHA ?? "local",
      seasonSnapshot.version,
      patchVersion,
    ],
    {
      revalidate: getPatchPageRevalidate(patchVersion),
      tags: [`patch-page:${patchVersion}`],
    }
  )();
}
