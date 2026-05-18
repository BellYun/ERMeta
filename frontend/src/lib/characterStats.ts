import "server-only";

import { unstable_cache } from "next/cache";
import { createServerClient } from "@/lib/supabase";

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

async function fetchCharacterStatRowsServer(
  patchVersion: string,
  tier: string
): Promise<StatRow[]> {
  const supabase = createServerClient();

  const selectCols = "characterNum,bestWeapon,totalGames,totalWins,totalRP,totalTop3,averageRank";
  let { data, error } = await supabase
    .from("v2_CharacterStats")
    .select(selectCols)
    .eq("patchVersion", patchVersion)
    .eq("tier", tier);

  if ((!data || data.length === 0) && !error) {
    const fallback = await supabase
      .from("CharacterStats")
      .select(selectCols)
      .eq("patchVersion", patchVersion)
      .eq("tier", tier);
    data = fallback.data;
    error = fallback.error;
  }

  if (error || !data || data.length === 0) {
    return [];
  }

  return data as StatRow[];
}

function buildCharacterStatsResponse(
  allRows: StatRow[],
  characterCode: number,
  patchVersion: string,
  tier: string
): CharacterStatsResponse {
  const emptyResponse = buildEmptyResponse(characterCode, patchVersion, tier);

  if (allRows.length === 0) {
    return emptyResponse;
  }

  const grandTotal = allRows.reduce((sum, row) => sum + (row.totalGames ?? 0), 0);
  const rows = allRows.filter((row) => row.characterNum === characterCode);

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
      averageRP: row.totalGames > 0 ? (row.totalRP ?? 0) / row.totalGames : 0,
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
    averageRP: totalGames > 0 ? totalRP / totalGames : 0,
    top3Rate: totalGames > 0 ? (totalTop3 / totalGames) * 100 : 0,
    weapons,
  };
}

export async function fetchCharacterStatsServer(
  characterCode: number,
  patchVersion: string,
  tier: string
): Promise<CharacterStatsResponse> {
  const allRows = await fetchCharacterStatRowsServer(patchVersion, tier);
  return buildCharacterStatsResponse(allRows, characterCode, patchVersion, tier);
}

async function getCachedCharacterStatRows(patchVersion: string, tier: string): Promise<StatRow[]> {
  return unstable_cache(
    async () => fetchCharacterStatRowsServer(patchVersion, tier),
    ["character-stats-rows", patchVersion, tier],
    {
      revalidate: 3600,
      tags: [
        "character-stats:rows",
        `character-stats:patch:${patchVersion}`,
        `character-stats:tier:${tier}`,
      ],
    }
  )();
}

export async function getCachedCharacterStats(
  characterCode: number,
  patchVersion: string,
  tier: string
): Promise<CharacterStatsResponse | null> {
  try {
    const allRows = await getCachedCharacterStatRows(patchVersion, tier);
    return buildCharacterStatsResponse(allRows, characterCode, patchVersion, tier);
  } catch {
    return null;
  }
}
