import type { Tier } from "@/lib/design-tokens";

export interface PerformanceTierStats {
  winRate: number;
  top3Rate?: number;
  averageRank: number;
  averageRP: number;
}

export interface SampledPerformanceTierStats extends PerformanceTierStats {
  totalGames: number;
}

export const PERFORMANCE_TIER_MIN_GAMES = 10;
export const COMBO_TIER_WEIGHTS = {
  winRate: 0.2,
  survival: 0.3,
  averageRP: 0.5,
} as const;

function getPerformanceZScores(stat: PerformanceTierStats) {
  const zWin = (stat.winRate - 12.5) / 3.5;
  const zSurvival =
    stat.top3Rate !== undefined ? (stat.top3Rate - 37.5) / 7.0 : (4.5 - stat.averageRank) / 1.5;
  const zRP = stat.averageRP / 15.0;

  return { zWin, zSurvival, zRP };
}

export function computePerformanceTierScore(stat: PerformanceTierStats): number {
  // 1~8등 배틀로얄 기댓값 기준 정규화
  //   기대 승률      = 1/8 = 12.5%  (σ ≈ 3.5%p)
  //   기대 상위3위율 = 3/8 = 37.5%  (σ ≈ 7%p)
  //   기대 평균순위  = 4.5           (σ ≈ 1.5)
  const { zWin, zSurvival, zRP } = getPerformanceZScores(stat);

  // 승률 40%, 생존력(상위3위율·평균순위) 35%, 평균 RP 25%
  return zWin * 0.4 + zSurvival * 0.35 + zRP * 0.25;
}

export function computeComboTierScore(stat: PerformanceTierStats): number {
  const { zWin, zSurvival, zRP } = getPerformanceZScores(stat);

  return (
    zWin * COMBO_TIER_WEIGHTS.winRate +
    zSurvival * COMBO_TIER_WEIGHTS.survival +
    zRP * COMBO_TIER_WEIGHTS.averageRP
  );
}

function assignTierFromScore(score: number): Tier {
  if (score >= 1.0) return "S";
  if (score >= 0.3) return "A";
  if (score >= -0.3) return "B";
  if (score >= -1.0) return "C";
  return "D";
}

export function assignPerformanceTier(stat: PerformanceTierStats): Tier {
  return assignTierFromScore(computePerformanceTierScore(stat));
}

export function assignComboTier(stat: PerformanceTierStats): Tier {
  return assignTierFromScore(computeComboTierScore(stat));
}

export function comparePerformanceTierStats(
  a: SampledPerformanceTierStats,
  b: SampledPerformanceTierStats
): number {
  const aHasEnoughGames = a.totalGames >= PERFORMANCE_TIER_MIN_GAMES;
  const bHasEnoughGames = b.totalGames >= PERFORMANCE_TIER_MIN_GAMES;

  if (aHasEnoughGames !== bHasEnoughGames) return aHasEnoughGames ? -1 : 1;
  if (!aHasEnoughGames) return b.totalGames - a.totalGames;

  const scoreDifference = computeComboTierScore(b) - computeComboTierScore(a);
  return scoreDifference || b.totalGames - a.totalGames;
}
