import { getAverageRP } from "@/lib/rpMetric";
import type { SnapshotStatRow } from "@/lib/seasonSnapshot";
import { collapseWeaponAgnosticRows } from "@/lib/weaponAgnostic";
import { expandCumulativeTier } from "@/utils/tier";

interface StatRow {
  characterNum: number;
  bestWeapon: number | null;
  totalGames: number;
  totalWins: number;
  totalRP: number;
  totalTop3: number;
  averageRank: number;
}

export interface CharacterStatsResponse {
  characterNum: number;
  patchVersion: string;
  tier: string;
  totalGames: number;
  pickRate: number;
  winRate: number;
  averageRank: number;
  averageRP: number;
  top3Rate: number;
  weapons: WeaponStatItem[];
}

export interface WeaponStatItem {
  bestWeapon: number | null;
  totalGames: number;
  pickRate: number;
  winRate: number;
  averageRank: number;
  averageRP: number;
}

function buildEmptyResponse(
  characterCode: number,
  patchVersion: string,
  tier: string
): CharacterStatsResponse {
  return {
    characterNum: characterCode,
    patchVersion,
    tier,
    totalGames: 0,
    pickRate: 0,
    winRate: 0,
    averageRank: 0,
    averageRP: 0,
    top3Rate: 0,
    weapons: [],
  };
}

function aggregateAcrossTiers(rows: StatRow[]): StatRow[] {
  const map = new Map<string, StatRow & { _rankSum: number }>();
  for (const row of rows) {
    const key = `${row.characterNum}|${row.bestWeapon ?? "null"}`;
    const games = row.totalGames ?? 0;
    const existing = map.get(key);
    if (!existing) {
      map.set(key, {
        characterNum: row.characterNum,
        bestWeapon: row.bestWeapon,
        totalGames: games,
        totalWins: row.totalWins ?? 0,
        totalRP: row.totalRP ?? 0,
        totalTop3: row.totalTop3 ?? 0,
        averageRank: row.averageRank ?? 0,
        _rankSum: (row.averageRank ?? 0) * games,
      });
    } else {
      existing.totalGames += games;
      existing.totalWins += row.totalWins ?? 0;
      existing.totalRP += row.totalRP ?? 0;
      existing.totalTop3 += row.totalTop3 ?? 0;
      existing._rankSum += (row.averageRank ?? 0) * games;
    }
  }
  return Array.from(map.values()).map(({ _rankSum, ...rest }) => ({
    ...rest,
    averageRank: rest.totalGames > 0 ? _rankSum / rest.totalGames : 0,
  }));
}

export function buildCharacterStatsResponse(
  allRows: StatRow[],
  characterCode: number,
  patchVersion: string,
  tier: string,
  grandTotal = allRows.reduce((sum, row) => sum + (row.totalGames ?? 0), 0)
): CharacterStatsResponse {
  const emptyResponse = buildEmptyResponse(characterCode, patchVersion, tier);

  if (allRows.length === 0) {
    return emptyResponse;
  }

  // 무기 무관 실험체(알렉스 등)는 무기별 row를 단일 entry로 합산 (단일 patch+tier 컨텍스트)
  const rows = collapseWeaponAgnosticRows(
    allRows.filter((row) => row.characterNum === characterCode)
  );

  if (rows.length === 0) {
    return emptyResponse;
  }

  const totalGames = rows.reduce((sum, row) => sum + (row.totalGames ?? 0), 0);
  const totalWins = rows.reduce((sum, row) => sum + (row.totalWins ?? 0), 0);
  const totalRP = rows.reduce((sum, row) => sum + (row.totalRP ?? 0), 0);
  const totalTop3 = rows.reduce((sum, row) => sum + (row.totalTop3 ?? 0), 0);

  const weightedAverageRank =
    totalGames > 0
      ? rows.reduce((sum, row) => sum + (row.averageRank ?? 0) * (row.totalGames ?? 0), 0) /
        totalGames
      : 0;

  const weapons: WeaponStatItem[] = rows
    .map((row) => ({
      bestWeapon: row.bestWeapon,
      totalGames: row.totalGames ?? 0,
      pickRate: totalGames > 0 ? ((row.totalGames ?? 0) / totalGames) * 100 : 0,
      winRate: row.totalGames > 0 ? ((row.totalWins ?? 0) / row.totalGames) * 100 : 0,
      averageRank: row.averageRank ?? 0,
      averageRP: getAverageRP(row.totalRP ?? 0, row.totalGames, patchVersion, tier),
    }))
    .sort((a, b) => b.totalGames - a.totalGames);

  return {
    characterNum: characterCode,
    patchVersion,
    tier,
    totalGames,
    pickRate: grandTotal > 0 ? (totalGames / grandTotal) * 100 : 0,
    winRate: totalGames > 0 ? (totalWins / totalGames) * 100 : 0,
    averageRank: weightedAverageRank,
    averageRP: getAverageRP(totalRP, totalGames, patchVersion, tier),
    top3Rate: totalGames > 0 ? (totalTop3 / totalGames) * 100 : 0,
    weapons,
  };
}

export function selectCharacterStatRows(rows: SnapshotStatRow[], tier: string): StatRow[] {
  const tiers = new Set(expandCumulativeTier(tier));
  return aggregateAcrossTiers(rows.filter((row) => tiers.has(row.tier)));
}
