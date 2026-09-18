/** 12.4+ totals store mmrGainInGame, before entry cost and Gambit. */
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

export function getAverageRP(totalRP: number, totalGames: number, patchVersion: string, tier: string): number {
  if (totalGames <= 0) return 0;
  const mean = totalRP / totalGames;
  return usesEarnedRP(patchVersion) ? mean - (FIXED_ENTRY_COST[tier] ?? 0) : mean;
}
