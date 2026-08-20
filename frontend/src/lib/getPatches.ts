import { unstable_cache } from "next/cache";
import { getVisibleStatsPatchVersions, isVisibleStatsPatchVersion } from "@/data/patch-notes";
import {
  filterReadyStatsPatchVersions,
  HOME_BASE_TIERS,
  HOME_META_TARGET_PATCH,
} from "@/lib/homeMetaShared";
import { createServerClient } from "@/lib/supabase";

/**
 * 활성 패치 목록은 변경 빈도가 낮아서 요청 간 캐시로 묶는다.
 * 같은 프로세스 내 재요청은 Next Data Cache가 재사용하고,
 * 1시간 뒤 자동 재검증되도록 둔다.
 */
export const getPatches = unstable_cache(
  async (): Promise<string[]> => {
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
  },
  ["patches", "patch-notes-v9-12-2-sample-gate-x8"],
  {
    revalidate: 900,
    tags: ["patches"],
  }
);
