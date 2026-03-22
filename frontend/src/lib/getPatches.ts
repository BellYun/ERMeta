import { cache } from "react"
import { createServerClient } from "@/lib/supabase"

/**
 * React.cache() 래핑 — 동일 요청(렌더 사이클) 내 중복 fetch 자동 제거
 *
 * page.tsx의 여러 async Server Component가 각각 getPatches()를 호출해도
 * 실제 Supabase 쿼리는 1회만 실행됩니다.
 */
export const getPatches = cache(async (): Promise<string[]> => {
  try {
    const supabase = createServerClient()
    const { data, error } = await supabase
      .from("PatchVersion")
      .select("version")
      .eq("isActive", true)
      .order("startDate", { ascending: false })
      .limit(10)

    if (!error && data && data.length > 0) {
      return data.map((p) => p.version)
    }
    return []
  } catch {
    return []
  }
})
