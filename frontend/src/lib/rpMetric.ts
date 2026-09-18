/** 12.4+ DB totals contain mmrGainInGame: earned RP before entry cost and Gambit. */
const FIXED_ENTRY_COST: Record<string, number> = {
  DIAMOND: 45,
  DIAMOND_PLUS: 45,
  METEORITE: 53,
  METEORITE_PLUS: 53,
  MITHRIL: 58,
  MITHRIL_PLUS: 58,
  IN1000: 58,
  IN1000_PLUS: 58,
};

export function usesEarnedRP(patchVersion: string): boolean {
  const match = /^(\d+)\.(\d+)$/.exec(patchVersion);
  if (!match) return false;
  const major = Number(match[1]);
  const minor = Number(match[2]);
  return major > 12 || (major === 12 && minor >= 4);
}

export function hasComparableRP(currentPatch: string, previousPatch: string | null): boolean {
  return previousPatch !== null && usesEarnedRP(currentPatch) === usesEarnedRP(previousPatch);
}

/** Apply the selected analysis scope's fee once, after all tier rows have been pooled. */
export function getAverageRP(
  totalRP: number,
  totalGames: number,
  patchVersion: string,
  analysisTier: string,
  membersPerGame = 1
): number {
  if (totalGames <= 0) return 0;
  const earnedOrNetRP = totalRP / totalGames / membersPerGame;
  return usesEarnedRP(patchVersion)
    ? earnedOrNetRP - (FIXED_ENTRY_COST[analysisTier] ?? 0)
    : earnedOrNetRP;
}

export function getFixedEntryCost(patchVersion: string, analysisTier: string): number {
  return usesEarnedRP(patchVersion) ? (FIXED_ENTRY_COST[analysisTier] ?? 0) : 0;
}
