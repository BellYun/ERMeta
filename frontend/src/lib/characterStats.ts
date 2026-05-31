import "server-only";

import { unstable_cache } from "next/cache";
import { createServerClient } from "@/lib/supabase";
import { collapseWeaponAgnosticRows } from "@/lib/weaponAgnostic";
import { expandCumulativeTier } from "@/utils/tier";

const CHARACTER_STATS_CACHE_VERSION = "diamond-plus-without-in1000-v1";

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
  // 누적 tier: DIAMOND_PLUS → [DIAMOND, METEORITE, MITHRIL] row 그룹 fetch.
  // IN1000은 MITHRIL과 별도 합산하지 않고 단독 조회에만 사용한다.
  const tiers = expandCumulativeTier(tier);

  const selectCols = "characterNum,bestWeapon,totalGames,totalWins,totalRP,totalTop3,averageRank";
  let { data, error } = await supabase
    .from("v2_CharacterStats")
    .select(selectCols)
    .eq("patchVersion", patchVersion)
    .in("tier", tiers);

  if ((!data || data.length === 0) && !error) {
    const fallback = await supabase
      .from("CharacterStats")
      .select(selectCols)
      .eq("patchVersion", patchVersion)
      .in("tier", tiers);
    data = fallback.data;
    error = fallback.error;
  }

  if (error || !data || data.length === 0) {
    return [];
  }

  // 누적 tier 의 row 들은 같은 (characterNum, bestWeapon) 에서 N tier 만큼 N row 가 옴.
  // weighted aggregate (games·wins·RP·top3 sum + rank weighted avg) 로 합산.
  return aggregateAcrossTiers(data as StatRow[]);
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
  // 무기 무관 캐릭터(알렉스 등)는 무기별 row를 단일 entry로 합산 (단일 patch+tier 컨텍스트)
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
    ["character-stats-rows", CHARACTER_STATS_CACHE_VERSION, patchVersion, tier],
    {
      revalidate: 21600,
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
