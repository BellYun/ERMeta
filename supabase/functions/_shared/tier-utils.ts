/**
 * 티어 그룹 분류 유틸리티
 * ermangho/frontend/src/utils/tier.ts 로직을 Deno용으로 이식
 */

export enum TierGroup {
  DIAMOND_BELOW = "DIAMOND_BELOW",
  PLATINUM = "PLATINUM",
  DIAMOND = "DIAMOND",
  METEORITE = "METEORITE",
  MITHRIL = "MITHRIL",
  IN1000 = "IN1000",
}

// 시즌 초반 표본 확보를 위해 플래티넘부터 수집한다.
export const MIN_COLLECT_TIER = TierGroup.PLATINUM;
export const MIN_COLLECT_MMR = 3600;

// 플래티넘 이상 지표 수집 대상 티어 (IN1000 제거됨)
export const COLLECT_TIERS: readonly TierGroup[] = [
  TierGroup.PLATINUM,
  TierGroup.DIAMOND,
  TierGroup.METEORITE,
  TierGroup.MITHRIL,
];

/**
 * MMR이 속하는 모든 티어 그룹 반환
 *
 * - DIAMOND_BELOW: MMR < 3600  (수집 제외)
 * - PLATINUM: 3600 <= MMR < 5000
 * - DIAMOND: 5000 <= MMR < 6400
 * - METEORITE: 6400 <= MMR < 7600
 * - MITHRIL: MMR >= 7600
 *
 * IN1000은 시즌 초 컷이 낮아 노이즈가 커서 수집에서 제외함.
 */
export function getAllTierGroupsFromMMR(
  mmr: number | null | undefined,
  _rank1000MMR: number | null = null
): TierGroup[] {
  if (mmr === null || mmr === undefined || mmr < 0) return [];

  const groups: TierGroup[] = [];

  if (mmr < MIN_COLLECT_MMR) {
    groups.push(TierGroup.DIAMOND_BELOW);
    return groups;
  }
  if (mmr < 5000) {
    groups.push(TierGroup.PLATINUM);
    return groups;
  }
  if (mmr < 6400) {
    groups.push(TierGroup.DIAMOND);
    return groups;
  }
  if (mmr < 7600) {
    groups.push(TierGroup.METEORITE);
    return groups;
  }

  groups.push(TierGroup.MITHRIL);
  return groups;
}

/**
 * 최소 수집 티어(현재 플래티넘) 이상만 반환한다.
 */
export function getCollectableTiers(
  mmr: number | null | undefined,
  rank1000MMR: number | null = null
): TierGroup[] {
  return getAllTierGroupsFromMMR(mmr, rank1000MMR).filter((tier) =>
    COLLECT_TIERS.includes(tier)
  );
}
