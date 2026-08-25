import type { Tier } from "@/lib/design-tokens";
import type { CharacterRankingData } from "@/lib/ranking";

export const META_SCORE_WEIGHTS = {
  averageRP: 0.4,
  top3Rate: 0.2,
  winRate: 0.2,
  pickRate: 0.2,
} as const;

export function getMetaRankingKey(
  ranking: Pick<CharacterRankingData, "characterNum" | "bestWeapon">
): number {
  return ranking.characterNum * 1000 + ranking.bestWeapon;
}

export function computeMetaScores(rankings: CharacterRankingData[]): Map<number, number> {
  const n = rankings.length;
  if (n === 0) return new Map();

  const vals = (fn: (r: CharacterRankingData) => number): number[] => rankings.map(fn);

  const mean = (arr: number[]): number => arr.reduce((s, v) => s + v, 0) / arr.length;
  const std = (arr: number[], m: number): number =>
    Math.sqrt(arr.reduce((s, v) => s + (v - m) ** 2, 0) / arr.length);

  const winRates = vals((r) => r.winRate);
  const top3Rates = vals((r) => r.top3Rate);
  const avgRPs = vals((r) => r.averageRP);
  const pickRates = vals((r) => r.pickRate);

  const winMean = mean(winRates),
    winStd = std(winRates, winMean);
  const top3Mean = mean(top3Rates),
    top3Std = std(top3Rates, top3Mean);
  const rpMean = mean(avgRPs),
    rpStd = std(avgRPs, rpMean);
  const pickMean = mean(pickRates),
    pickStd = std(pickRates, pickMean);

  const scores = new Map<number, number>();
  for (const r of rankings) {
    const zWin = winStd > 0 ? (r.winRate - winMean) / winStd : 0;
    const zTop3 = top3Std > 0 ? (r.top3Rate - top3Mean) / top3Std : 0;
    const zRP = rpStd > 0 ? (r.averageRP - rpMean) / rpStd : 0;
    const zPick = pickStd > 0 ? (r.pickRate - pickMean) / pickStd : 0;
    scores.set(
      getMetaRankingKey(r),
      zRP * META_SCORE_WEIGHTS.averageRP +
        zTop3 * META_SCORE_WEIGHTS.top3Rate +
        zWin * META_SCORE_WEIGHTS.winRate +
        zPick * META_SCORE_WEIGHTS.pickRate
    );
  }
  return scores;
}

export function assignTier(score: number): Tier {
  if (score >= 0.8) return "S";
  if (score >= 0.3) return "A";
  if (score >= -0.3) return "B";
  if (score >= -1.0) return "C";
  return "D";
}

export function sortRankingsByMetaScore(
  rankings: CharacterRankingData[],
  scores = computeMetaScores(rankings)
): CharacterRankingData[] {
  return [...rankings].sort((a, b) => {
    const scoreDifference =
      (scores.get(getMetaRankingKey(b)) ?? 0) - (scores.get(getMetaRankingKey(a)) ?? 0);
    return scoreDifference || a.rank - b.rank;
  });
}

export function computeMetaRankPositions(
  rankings: CharacterRankingData[],
  include?: (ranking: CharacterRankingData) => boolean
): Map<number, number> {
  const sorted = sortRankingsByMetaScore(rankings);
  const filtered = include ? sorted.filter(include) : sorted;

  return new Map(filtered.map((ranking, index) => [getMetaRankingKey(ranking), index + 1]));
}

export function computeCharacterMetaTiers(
  rankings: CharacterRankingData[],
  characterNum: number
): Record<string, Tier> {
  const scores = computeMetaScores(rankings);

  return Object.fromEntries(
    rankings.flatMap((ranking) => {
      if (ranking.characterNum !== characterNum) return [];

      const score = scores.get(getMetaRankingKey(ranking));
      return score === undefined ? [] : [[String(ranking.bestWeapon), assignTier(score)]];
    })
  );
}
