import { unstable_cache } from "next/cache";
import { getVisibleStatsPatchVersions, isVisibleStatsPatchVersion } from "@/data/patch-notes";
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
      const { data, error } = await supabase
        .from("PatchVersion")
        .select("version")
        .eq("isActive", true)
        .order("startDate", { ascending: false })
        .limit(10);

      const localPatchVersions = getVisibleStatsPatchVersions();
      if (!error && data && data.length > 0) {
        const activePatchVersions = data.map((p) => p.version).filter(isVisibleStatsPatchVersion);
        return Array.from(new Set([...localPatchVersions, ...activePatchVersions]));
      }
      return localPatchVersions;
    } catch {
      return getVisibleStatsPatchVersions();
    }
  },
  ["patches", "patch-notes-v6-visible-from-11-7"],
  {
    revalidate: 21600,
    tags: ["patches"],
  }
);
