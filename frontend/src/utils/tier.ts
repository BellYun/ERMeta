/**
 * MMR을 티어로 변환하는 유틸리티 함수
 */

export enum TierGroup {
  DIAMOND_BELOW = 'DIAMOND_BELOW',
  DIAMOND = 'DIAMOND',
  METEORITE = 'METEORITE',
  MITHRIL = 'MITHRIL',
  IN1000 = 'IN1000',
}

// 지표 노출용 티어 (DIAMOND_BELOW 제외)
export const METRICS_TIER_GROUPS: TierGroup[] = [
  TierGroup.DIAMOND,
  TierGroup.METEORITE,
  TierGroup.MITHRIL,
  TierGroup.IN1000,
];

export type Tier =
  | 'IRON'
  | 'BRONZE'
  | 'SILVER'
  | 'GOLD'
  | 'PLATINUM'
  | 'DIAMOND'
  | 'METEORITE'
  | 'MITHRIL';

interface TierRange {
  minMMR: number;
  maxMMR: number;
}

const tierMap: Record<Tier, TierRange> = {
  IRON: { minMMR: 0, maxMMR: 599 },
  BRONZE: { minMMR: 600, maxMMR: 1399 },
  SILVER: { minMMR: 1400, maxMMR: 2399 },
  GOLD: { minMMR: 2400, maxMMR: 3599 },
  PLATINUM: { minMMR: 3600, maxMMR: 4799 },
  DIAMOND: { minMMR: 5000, maxMMR: 6399 },
  METEORITE: { minMMR: 6400, maxMMR: 7199 },
  MITHRIL: { minMMR: 7200, maxMMR: 999999 },
};

/**
 * MMR 값을 받아서 티어를 반환
 */
export function getTierFromMMR(mmr: number | null | undefined): Tier | null {
  if (!mmr || mmr < 0) return null;

  for (const [tier, range] of Object.entries(tierMap)) {
    if (mmr >= range.minMMR && mmr <= range.maxMMR) {
      return tier as Tier;
    }
  }

  // MMR이 정의된 범위를 초과하면 최상위 티어(MITHRIL)로 처리
  return 'MITHRIL';
}

/**
 * 티어 문자열을 정규화 (대문자로 변환)
 */
export function normalizeTier(tier: string | null | undefined): Tier | null {
  if (!tier) return null;
  const upperTier = tier.toUpperCase() as Tier;
  return tierMap[upperTier] ? upperTier : null;
}

/**
 * MMR을 기준으로 티어 그룹 반환 (단일 그룹)
 *
 * - DIAMOND_BELOW: MMR < 5000
 * - DIAMOND: 5000 <= MMR < 6400
 * - METEORITE: 6400 <= MMR < 7200
 * - MITHRIL: MMR >= 7200
 */
export function getTierGroupFromMMR(mmrBefore: number | null | undefined): TierGroup | null {
  if (mmrBefore === null || mmrBefore === undefined || mmrBefore < 0) {
    return null;
  }

  const mmr = mmrBefore;

  // MITHRIL: MMR >= 7200
  if (mmr >= 7200) {
    return TierGroup.MITHRIL;
  }

  // DIAMOND: 5000 <= MMR < 6400
  if (mmr >= 5000 && mmr < 6400) {
    return TierGroup.DIAMOND;
  }

  // METEORITE: 6400 <= MMR < 7200
  if (mmr >= 6400) {
    return TierGroup.METEORITE;
  }

  // DIAMOND_BELOW: MMR < 5000
  return TierGroup.DIAMOND_BELOW;
}

/**
 * MMR이 속하는 모든 티어 그룹을 반환
 * @param mmrBefore MMR 값
 * @param rank1000MMR 1000등의 MMR 값 (선택사항, 제공되면 IN1000 그룹도 포함)
 * @returns 티어 그룹 배열 (하나 이상의 그룹 반환 가능)
 */
export function getAllTierGroupsFromMMR(
  mmrBefore: number | null | undefined,
  rank1000MMR: number | null | undefined = null
): TierGroup[] {
  if (mmrBefore === null || mmrBefore === undefined || mmrBefore < 0) {
    return [];
  }

  const mmr = mmrBefore;
  const groups: TierGroup[] = [];

  // IN1000: 1000등 MMR 이상인 경우 (rank1000MMR이 제공된 경우만)
  if (rank1000MMR !== null && rank1000MMR !== undefined && mmr >= rank1000MMR) {
    groups.push(TierGroup.IN1000);
  }

  // DIAMOND_BELOW: MMR < 5000
  if (mmr < 5000) {
    groups.push(TierGroup.DIAMOND_BELOW);
    return groups;
  }

  // DIAMOND: 5000 <= MMR < 6400
  if (mmr < 6400) {
    groups.push(TierGroup.DIAMOND);
    return groups;
  }

  // METEORITE: 6400 <= MMR < 7200
  if (mmr < 7200) {
    groups.push(TierGroup.METEORITE);
    return groups;
  }

  // MITHRIL: MMR >= 7200
  groups.push(TierGroup.MITHRIL);
  return groups;
}

/**
 * 티어 그룹이 특정 MMR에 해당하는지 확인
 * @param tierGroup 티어 그룹
 * @param mmr MMR 값
 * @param rank1000MMR 1000등의 MMR 값 (IN1000 체크용, 선택사항)
 */
export function isTierGroupMatch(
  tierGroup: TierGroup,
  mmr: number | null | undefined,
  rank1000MMR: number | null | undefined = null
): boolean {
  if (mmr === null || mmr === undefined || mmr < 0) {
    return false;
  }

  switch (tierGroup) {
    case TierGroup.IN1000:
      return rank1000MMR !== null && rank1000MMR !== undefined && mmr >= rank1000MMR;
    case TierGroup.MITHRIL:
      return mmr >= 7200; // 7200 이상 미스릴
    case TierGroup.METEORITE:
      return mmr >= 6400 && mmr < 7200; // 메테오라이트 구간
    case TierGroup.DIAMOND:
      return mmr >= 5000 && mmr < 6400;
    case TierGroup.DIAMOND_BELOW:
      return mmr < 5000;
    default:
      return false;
  }
}

/**
 * 매치에 참여한 모든 플레이어의 티어 그룹 반환 (중복 제거)
 * 각 플레이어가 속하는 모든 티어 그룹을 포함
 * @param participants 플레이어 배열
 * @param rank1000MMR 1000등의 MMR 값 (선택사항)
 */
export function getAllTierGroupsFromMatch(
  participants: Array<{ mmrBefore?: number | null }>,
  rank1000MMR: number | null | undefined = null
): TierGroup[] {
  const tierGroups = new Set<TierGroup>();

  for (const participant of participants) {
    const groups = getAllTierGroupsFromMMR(participant.mmrBefore, rank1000MMR);
    groups.forEach(group => tierGroups.add(group));
  }

  return Array.from(tierGroups);
}

/**
 * 문자열을 TierGroup enum으로 변환
 * API 쿼리 파라미터 등에서 사용
 */
export function parseTierGroup(value: string | null | undefined): TierGroup | null {
  if (!value) return null;
  
  // enum 값 목록 확인
  const validValues = Object.values(TierGroup);
  if (validValues.includes(value as TierGroup)) {
    const parsed = value as TierGroup;
    // 전반 지표에서는 DIAMOND_BELOW를 사용하지 않음
    if (parsed === TierGroup.DIAMOND_BELOW) {
      return null;
    }
    return parsed;
  }
  
  return null;
}
