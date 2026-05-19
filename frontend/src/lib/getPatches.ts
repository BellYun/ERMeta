import { unstable_cache } from "next/cache";
import { STATS_EXCLUDED_PATCHES } from "@/data/patch-notes";
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

      if (!error && data && data.length > 0) {
        return data.map((p) => p.version).filter((v) => !STATS_EXCLUDED_PATCHES.has(v));
      }
      return [];
    } catch {
      return [];
    }
  },
  ["patches"],
  {
    revalidate: 3600,
    tags: ["patches"],
  }
);
