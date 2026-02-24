/**
 * 메타 분석 유틸리티 함수
 * - 트렌드 스코어 계산
 * - 메타 변동 분석
 */

export interface MetaChanges {
  winRate: {
    current: number;
    previous: number;
    delta: number;
    percentChange: number;
  };
  pickRate: {
    current: number;
    previous: number;
    delta: number;
    percentChange: number;
  };
  averageRP: {
    current: number;
    previous: number;
    delta: number;
    percentChange: number;
  };
}

export interface TrendWeights {
  winRate: number;
  pickRate: number;
  averageRP: number;
}

const DEFAULT_WEIGHTS: TrendWeights = {
  winRate: 0.4,   // 승률 가중치 40%
  pickRate: 0.3,  // 픽률 가중치 30%
  averageRP: 0.3, // 평균 RP 가중치 30%
};

/**
 * 트렌드 스코어 계산
 * @param changes 메타 변화 데이터
 * @param weights 가중치 (선택사항)
 * @returns -100 ~ 100 사이의 트렌드 스코어
 */
export function calculateTrendScore(
  changes: MetaChanges,
  weights: TrendWeights = DEFAULT_WEIGHTS
): number {
  // 정규화: 승률 변화를 -100 ~ 100 범위로 변환
  // 예: 승률 5% 증가 → 정규화 값 약 50
  const normalizedWinRate = (changes.winRate.delta / 10) * 100;

  // 정규화: 픽률 변화를 -100 ~ 100 범위로 변환
  // 예: 픽률 3% 증가 → 정규화 값 약 30
  const normalizedPickRate = (changes.pickRate.delta / 10) * 100;

  // 정규화: 평균 RP 변화를 -100 ~ 100 범위로 변환
  // 예: 평균 RP 10 증가 → 정규화 값 약 20
  const normalizedRP = (changes.averageRP.delta / 50) * 100;

  // 가중 평균 계산
  const score =
    normalizedWinRate * weights.winRate +
    normalizedPickRate * weights.pickRate +
    normalizedRP * weights.averageRP;

  // -100 ~ 100 범위로 제한
  return Math.max(-100, Math.min(100, score));
}

/**
 * 트렌드 상태 결정
 * @param trendScore 트렌드 스코어
 * @returns 'rising' | 'falling' | 'stable'
 */
export function getTrendStatus(
  trendScore: number
): 'rising' | 'falling' | 'stable' {
  if (trendScore > 5) return 'rising';
  if (trendScore < -5) return 'falling';
  return 'stable';
}

/**
 * 메타 변화 계산
 * @param current 현재 통계
 * @param previous 이전 통계
 * @returns MetaChanges 객체
 */
export function calculateMetaChanges(
  current: {
    winRate: number;
    pickRate: number;
    averageRP: number;
  },
  previous: {
    winRate: number;
    pickRate: number;
    averageRP: number;
  }
): MetaChanges {
  const winRateDelta = current.winRate - previous.winRate;
  const pickRateDelta = current.pickRate - previous.pickRate;
  const averageRPDelta = current.averageRP - previous.averageRP;

  return {
    winRate: {
      current: current.winRate,
      previous: previous.winRate,
      delta: winRateDelta,
      percentChange: previous.winRate > 0
        ? (winRateDelta / previous.winRate) * 100
        : 0,
    },
    pickRate: {
      current: current.pickRate,
      previous: previous.pickRate,
      delta: pickRateDelta,
      percentChange: previous.pickRate > 0
        ? (pickRateDelta / previous.pickRate) * 100
        : 0,
    },
    averageRP: {
      current: current.averageRP,
      previous: previous.averageRP,
      delta: averageRPDelta,
      percentChange: previous.averageRP > 0
        ? (averageRPDelta / previous.averageRP) * 100
        : 0,
    },
  };
}

/**
 * 떡상/떡락 여부 판단
 * @param trendScore 트렌드 스코어
 * @param threshold 임계값 (기본 20)
 * @returns true면 떡상/떡락
 */
export function isSignificantChange(
  trendScore: number,
  threshold: number = 20
): boolean {
  return Math.abs(trendScore) >= threshold;
}
