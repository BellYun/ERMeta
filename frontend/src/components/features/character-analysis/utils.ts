import type { Tier } from "@/lib/design-tokens"
import { TierGroup } from "@/utils/tier"
import type { CharacterStatsResponse } from "@/app/api/character/stats/[characterCode]/route"

export function assignCharTier(stat: {
  winRate: number
  top3Rate?: number
  averageRank: number
  averageRP: number
}): Tier {
  // 1~8등 배틀로얄 기댓값 기준 정규화
  //   기대 승률      = 1/8 = 12.5%  (σ ≈ 3.5%p)
  //   기대 상위3위율 = 3/8 = 37.5%  (σ ≈ 7%p)
  //   기대 평균순위  = 4.5           (σ ≈ 1.5)
  const zWin = (stat.winRate - 12.5) / 3.5

  // top3Rate 우선, 없으면(무기별 통계) averageRank로 대체 (낮을수록 좋으므로 부호 반전)
  const zSurvival =
    stat.top3Rate !== undefined
      ? (stat.top3Rate - 37.5) / 7.0
      : (4.5 - stat.averageRank) / 1.5

  const zRP = stat.averageRP / 15.0

  // 승률 40%, 생존력(상위3위율·평균순위) 35%, 평균RP 25%
  const score = zWin * 0.40 + zSurvival * 0.35 + zRP * 0.25

  if (score >= 1.0)  return "S"
  if (score >= 0.3)  return "A"
  if (score >= -0.3) return "B"
  if (score >= -1.0) return "C"
  return "D"
}

export async function fetchStats(
  characterCode: number,
  patchVersion: string,
  tier: TierGroup,
  baseUrl?: string
): Promise<CharacterStatsResponse | null> {
  try {
    const base = baseUrl ?? ""
    const res = await fetch(
      `${base}/api/character/stats/${characterCode}?tier=${tier}&patchVersion=${encodeURIComponent(patchVersion)}`
    )
    if (!res.ok) return null
    return res.json()
  } catch {
    return null
  }
}

export async function fetchPatches(baseUrl?: string): Promise<string[]> {
  try {
    const base = baseUrl ?? ""
    const res = await fetch(
      `${base}/api/patches/history?limit=10&includeInactive=true`
    )
    if (!res.ok) return []
    const data = await res.json()
    return data.patches ?? []
  } catch {
    return []
  }
}
