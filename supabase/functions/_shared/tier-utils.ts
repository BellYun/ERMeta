/**
 * 티어 그룹 분류 유틸리티
 * ermangho/frontend/src/utils/tier.ts 로직을 Deno용으로 이식
 */

export enum TierGroup {
  DIAMOND_BELOW = "DIAMOND_BELOW",
  DIAMOND = "DIAMOND",
  METEORITE = "METEORITE",
  MITHRIL = "MITHRIL",
  IN1000 = "IN1000",
}

// 다이아 이상 지표 수집 대상 티어
export const COLLECT_TIERS: TierGroup[] = [
  TierGroup.DIAMOND,
  TierGroup.METEORITE,
  TierGroup.MITHRIL,
  TierGroup.IN1000,
];

/**
 * MMR이 속하는 모든 티어 그룹 반환
 */
export function getAllTierGroupsFromMMR(
  mmr: number | null | undefined,
  rank1000MMR: number | null = null
): TierGroup[] {
  if (mmr === null || mmr === undefined || mmr < 0) return [];

  const groups: TierGroup[] = [];

  // IN1000
  if (rank1000MMR !== null && mmr >= rank1000MMR) {
    groups.push(TierGroup.IN1000);
  }

  if (mmr < 5000) {
    groups.push(TierGroup.DIAMOND_BELOW);
    return groups;
  }
  if (mmr < 6400) {
    groups.push(TierGroup.DIAMOND);
    return groups;
  }
  if (mmr < 7200) {
    groups.push(TierGroup.METEORITE);
    return groups;
  }

  groups.push(TierGroup.MITHRIL);
  return groups;
}

/**
 * 수집 대상 티어만 필터 (DIAMOND_BELOW 제외)
 */
export function getCollectableTiers(
  mmr: number | null | undefined,
  rank1000MMR: number | null = null
): TierGroup[] {
  return getAllTierGroupsFromMMR(mmr, rank1000MMR).filter(
    (t) => t !== TierGroup.DIAMOND_BELOW
  );
}
