import type { CharacterRankingData } from "@/app/api/character/mithril-rp-ranking/route"
import type { Tier } from "@/lib/design-tokens"

export function computeMetaScores(rankings: CharacterRankingData[]): Map<number, number> {
  const n = rankings.length
  if (n === 0) return new Map()

  const vals = (fn: (r: CharacterRankingData) => number) => rankings.map(fn)

  const mean = (arr: number[]) => arr.reduce((s, v) => s + v, 0) / arr.length
  const std = (arr: number[], m: number) =>
    Math.sqrt(arr.reduce((s, v) => s + (v - m) ** 2, 0) / arr.length)

  const winRates = vals((r) => r.winRate)
  const top3Rates = vals((r) => r.top3Rate)
  const avgRPs = vals((r) => r.averageRP)

  const winMean = mean(winRates),   winStd = std(winRates, winMean)
  const top3Mean = mean(top3Rates), top3Std = std(top3Rates, top3Mean)
  const rpMean = mean(avgRPs),      rpStd = std(avgRPs, rpMean)

  const scores = new Map<number, number>()
  for (const r of rankings) {
    const zWin  = winStd  > 0 ? (r.winRate    - winMean)  / winStd  : 0
    const zTop3 = top3Std > 0 ? (r.top3Rate   - top3Mean) / top3Std : 0
    const zRP   = rpStd   > 0 ? (r.averageRP  - rpMean)   / rpStd   : 0
    scores.set(r.characterNum * 1000 + r.bestWeapon, zWin * 0.40 + zTop3 * 0.35 + zRP * 0.25)
  }
  return scores
}

export function assignTier(score: number): Tier {
  if (score >= 1.0)  return "S"
  if (score >= 0.3)  return "A"
  if (score >= -0.3) return "B"
  if (score >= -1.0) return "C"
  return "D"
}
