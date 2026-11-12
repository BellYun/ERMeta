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

/** 기존 호출부는 새 패치의 표본 준비 여부를 5분마다 확인한다. */
export const getPatches = unstable_cache(
  fetchPatches,
  [
    "patches",
    "patch-notes-v14-12-7-sample-gate-x8",
    MAX_PUBLIC_PATCH_VERSION,
    seasonSnapshot.version,
  ],
  { revalidate: 300, tags: ["patches"] }
);

// 홈·랭킹은 30분마다 갱신한다. API의 5분 TTL을 페이지 ISR에 전파하지 않는다.
export const getHomePagePatches = unstable_cache(
  fetchPatches,
  [
    "home-page-patches",
    "patch-notes-v14-12-7-sample-gate-x8",
    MAX_PUBLIC_PATCH_VERSION,
    seasonSnapshot.version,
  ],
  { revalidate: 1800, tags: ["patches"] }
);

// 상세 페이지가 5분 TTL을 상속하지 않도록 원본 조회부터 별도로 캐시한다.
// getPatches()를 감싸면 내부의 짧은 TTL이 다시 페이지 ISR에 전파된다.
export const getCharacterPagePatches = unstable_cache(
  fetchPatches,
  [
    "character-page-patches",
    "patch-notes-v14-12-7-sample-gate-x8",
    MAX_PUBLIC_PATCH_VERSION,
    seasonSnapshot.version,
  ],
  { revalidate: 21600, tags: ["patches"] }
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
