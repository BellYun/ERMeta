import { unstable_cache } from "next/cache";
import { getVisibleStatsPatchVersions, isVisibleStatsPatchVersion } from "@/data/patch-notes";
import {
  filterReadyStatsPatchVersions,
  HOME_BASE_TIERS,
  HOME_META_TARGET_PATCH,
} from "@/lib/homeMetaShared";
import { createServerClient } from "@/lib/supabase";

async function fetchPatches(): Promise<string[]> {
  try {
    const supabase = createServerClient();
    const [patchResult, collectionResult] = await Promise.all([
      supabase
        .from("PatchVersion")
        .select("version")
        .eq("isActive", true)
        .order("startDate", { ascending: false })
        .limit(10),
      supabase
        .from("v2_CharacterStats")
        .select("totalGames")
        .eq("patchVersion", HOME_META_TARGET_PATCH)
        .in("tier", HOME_BASE_TIERS),
    ]);

    const localPatchVersions = getVisibleStatsPatchVersions();
    const targetCollectedGames = collectionResult.error
      ? 0
      : (collectionResult.data ?? []).reduce((sum, row) => sum + Number(row.totalGames ?? 0), 0);

    if (!patchResult.error && patchResult.data && patchResult.data.length > 0) {
      const activePatchVersions = patchResult.data
        .map((p) => p.version)
        .filter(isVisibleStatsPatchVersion);
      return filterReadyStatsPatchVersions(
        Array.from(new Set([...localPatchVersions, ...activePatchVersions])),
        targetCollectedGames
      );
    }
    return filterReadyStatsPatchVersions(localPatchVersions, targetCollectedGames);
  } catch {
    return filterReadyStatsPatchVersions(getVisibleStatsPatchVersions(), 0);
  }
}

/** 기존 호출부는 새 패치의 표본 준비 여부를 5분마다 확인한다. */
export const getPatches = unstable_cache(
  fetchPatches,
  ["patches", "patch-notes-v14-12-7-sample-gate-x8"],
  { revalidate: 300, tags: ["patches"] }
);

// 상세 페이지가 5분 TTL을 상속하지 않도록 원본 조회부터 별도로 캐시한다.
// getPatches()를 감싸면 내부의 짧은 TTL이 다시 페이지 ISR에 전파된다.
export const getCharacterPagePatches = unstable_cache(
  fetchPatches,
  ["character-page-patches", "patch-notes-v14-12-7-sample-gate-x8"],
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
