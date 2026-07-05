export type PlayStyleKey =
  | "snowball"
  | "tempo"
  | "stable"
  | "lateValue"
  | "volatile"
  | "climbVolatile"
  | "trap"
  | "balanced";
export type RiskKey = "low" | "medium" | "high";
export type ConfidenceKey = "low" | "medium" | "high";

export interface OperationProfile {
  key: PlayStyleKey;
  risk: RiskKey;
  confidence: ConfidenceKey;
  rpPercentile: number;
  winRatePercentile: number;
  rankPercentile: number;
}

export interface TrioMetricCombo {
  character1: number;
  weaponType1: number;
  character2: number;
  weaponType2: number;
  character3: number;
  weaponType3: number;
  totalGames: number;
  winRate: number;
  averageRP: number;
  averageRank: number;
}

interface TrioBenchmarks {
  averageRP: number[];
  winRate: number[];
  averageRank: number[];
}

const ER_NEUTRAL_WIN_RATE = 12.5;
const ER_STRONG_WIN_RATE = 16;
const ER_NEUTRAL_AVERAGE_RANK = 4.5;
const ER_STABLE_AVERAGE_RANK = 4;
const ER_STRONG_AVERAGE_RANK = 3.5;
const ER_POSITIVE_CLIMB_RP = 3;
const ER_STRONG_CLIMB_RP = 8;
const PROFILE_MIN_BENCHMARK_COMBOS = 10;
const PROFILE_FALLBACK_MIN_GAMES = 10;
const PROFILE_MEDIUM_CONFIDENCE_GAMES = 30;
const PROFILE_HIGH_CONFIDENCE_GAMES = 100;

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function upperBound(sorted: number[], value: number) {
  let low = 0;
  let high = sorted.length;
  while (low < high) {
    const mid = Math.floor((low + high) / 2);
    if (sorted[mid] <= value) low = mid + 1;
    else high = mid;
  }
  return low;
}

function lowerBound(sorted: number[], value: number) {
  let low = 0;
  let high = sorted.length;
  while (low < high) {
    const mid = Math.floor((low + high) / 2);
    if (sorted[mid] < value) low = mid + 1;
    else high = mid;
  }
  return low;
}

function percentile(sorted: number[], value: number, direction: "higher" | "lower") {
  if (sorted.length === 0) return 50;
  const raw =
    direction === "higher"
      ? (upperBound(sorted, value) / sorted.length) * 100
      : ((sorted.length - lowerBound(sorted, value)) / sorted.length) * 100;
  return Math.round(clamp(raw, 1, 99));
}

export function buildTrioInsightBenchmarks<T extends TrioMetricCombo>(
  combos: T[],
  minGames: number
): TrioBenchmarks {
  const primaryCombos = combos.filter((combo) => combo.totalGames >= minGames);
  const fallbackCombos = combos.filter(
    (combo) => combo.totalGames >= Math.min(minGames, PROFILE_FALLBACK_MIN_GAMES)
  );
  const eligibleCombos =
    primaryCombos.length >= PROFILE_MIN_BENCHMARK_COMBOS
      ? primaryCombos
      : fallbackCombos.length > 0
        ? fallbackCombos
        : combos;

  return {
    averageRP: eligibleCombos.map((combo) => combo.averageRP).sort((a, b) => a - b),
    winRate: eligibleCombos.map((combo) => combo.winRate).sort((a, b) => a - b),
    averageRank: eligibleCombos.map((combo) => combo.averageRank).sort((a, b) => a - b),
  };
}

export function getTrioOperationProfile(
  combo: TrioMetricCombo,
  benchmarks: TrioBenchmarks
): OperationProfile {
  const rpPercentile = percentile(benchmarks.averageRP, combo.averageRP, "higher");
  const winRatePercentile = percentile(benchmarks.winRate, combo.winRate, "higher");
  const rankPercentile = percentile(benchmarks.averageRank, combo.averageRank, "lower");
  const finishOverPlacement = winRatePercentile - rankPercentile;
  const placementOverFinish = rankPercentile - winRatePercentile;

  // 8팀 배틀로얄의 중립값(승률 12.5%, 평균 순위 4.5위)과
  // 같은 후보군 내 백분위를 함께 써서 패치별 지표 분포 변화에 대응한다.
  const isPositiveClimb =
    combo.averageRP >= ER_POSITIVE_CLIMB_RP || (combo.averageRP > 0 && rpPercentile >= 60);
  const isStrongClimb =
    (combo.averageRP >= ER_STRONG_CLIMB_RP && rpPercentile >= 55) ||
    (combo.averageRP > 0 && rpPercentile >= 80);
  const isAboveNeutralFinish = combo.winRate >= ER_NEUTRAL_WIN_RATE || winRatePercentile >= 55;
  const isStrongFinish =
    (combo.winRate >= ER_STRONG_WIN_RATE && winRatePercentile >= 55) ||
    (combo.winRate >= ER_NEUTRAL_WIN_RATE && winRatePercentile >= 80);
  const isStablePlacement =
    combo.averageRank <= ER_STABLE_AVERAGE_RANK ||
    (combo.averageRank <= ER_NEUTRAL_AVERAGE_RANK && rankPercentile >= 65);
  const isStrongPlacement =
    (combo.averageRank <= ER_STRONG_AVERAGE_RANK && rankPercentile >= 55) ||
    (combo.averageRank <= ER_NEUTRAL_AVERAGE_RANK && rankPercentile >= 80);
  const isWeakPlacement = combo.averageRank > ER_NEUTRAL_AVERAGE_RANK || rankPercentile <= 35;
  const isBelowNeutral =
    combo.averageRP <= 0 &&
    combo.winRate < ER_NEUTRAL_WIN_RATE &&
    combo.averageRank > ER_NEUTRAL_AVERAGE_RANK;
  const confidence: ConfidenceKey =
    combo.totalGames >= PROFILE_HIGH_CONFIDENCE_GAMES
      ? "high"
      : combo.totalGames >= PROFILE_MEDIUM_CONFIDENCE_GAMES
        ? "medium"
        : "low";

  let key: PlayStyleKey = "balanced";
  if (
    confidence === "high" &&
    isBelowNeutral &&
    rpPercentile <= 45 &&
    winRatePercentile <= 45 &&
    rankPercentile <= 45
  ) {
    key = "trap";
  } else if (isStrongClimb && isStrongFinish && (isStrongPlacement || isStablePlacement)) {
    key = "snowball";
  } else if (
    isStrongFinish &&
    (isWeakPlacement || (!isStablePlacement && finishOverPlacement >= 25))
  ) {
    key = "volatile";
  } else if (isStrongClimb && isWeakPlacement) {
    key = "climbVolatile";
  } else if (isStrongFinish && isPositiveClimb && !isWeakPlacement) {
    key = "tempo";
  } else if (
    isStrongPlacement &&
    isPositiveClimb &&
    (!isAboveNeutralFinish || placementOverFinish >= 15)
  ) {
    key = "lateValue";
  } else if (isStablePlacement && isPositiveClimb) {
    key = "stable";
  } else if (winRatePercentile >= 70 && rankPercentile <= 40) {
    key = "volatile";
  } else if (rpPercentile >= 70 && rankPercentile <= 40) {
    key = "climbVolatile";
  }

  const risk: RiskKey =
    key === "trap" ||
    key === "volatile" ||
    key === "climbVolatile" ||
    confidence === "low" ||
    (combo.averageRank > ER_NEUTRAL_AVERAGE_RANK && combo.averageRP < 0)
      ? "high"
      : confidence === "high" && isStablePlacement && isPositiveClimb
        ? "low"
        : "medium";

  return {
    key,
    risk,
    confidence,
    rpPercentile,
    winRatePercentile,
    rankPercentile,
  };
}
