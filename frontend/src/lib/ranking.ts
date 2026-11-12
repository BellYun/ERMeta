import { unstable_cache } from "next/cache";
import { HOME_META_TARGET_PATCH } from "@/lib/homeMetaShared";
import { getAverageRP } from "@/lib/rpMetric";
import { seasonSnapshot } from "@/lib/seasonSnapshot";
import { readSnapshotStatRows } from "@/lib/server/seasonSnapshot";
import { collapseWeaponAgnosticRows } from "@/lib/weaponAgnostic";
import { expandCumulativeTier } from "@/utils/tier";

const TIER_FALLBACK_ORDER = ["DIAMOND", "METEORITE", "MITHRIL", "IN1000"];

interface StatRow {
  characterNum: number;
  bestWeapon: number;
  totalGames: number;
  totalWins: number;
  totalRP: number;
  totalTop3: number;
  averageRank: number;
}

export interface CharacterRankingData {
  rank: number;
  characterNum: number;
  bestWeapon: number;
  totalGames: number;
  pickRate: number;
  winRate: number;
  averageRP: number;
  top3Rate: number;
}

export interface RankingResponse {
  rankings: CharacterRankingData[];
  previousRankings: CharacterRankingData[];
  patchVersion: string;
  previousPatch: string | null;
  tier: string;
}

export function buildRankings(
  rows: StatRow[],
  patchVersion = "",
  tier = ""
): CharacterRankingData[] {
  const grandTotal = rows.reduce((sum, r) => sum + (r.totalGames ?? 0), 0);

  const rankings = rows.map((r) => ({
    characterNum: r.characterNum,
    bestWeapon: r.bestWeapon,
    totalGames: r.totalGames ?? 0,
    pickRate: grandTotal > 0 ? ((r.totalGames ?? 0) / grandTotal) * 100 : 0,
    winRate: r.totalGames > 0 ? ((r.totalWins ?? 0) / r.totalGames) * 100 : 0,
    averageRP: getAverageRP(r.totalRP ?? 0, r.totalGames, patchVersion, tier),
    top3Rate: r.totalGames > 0 ? ((r.totalTop3 ?? 0) / r.totalGames) * 100 : 0,
  }));

  rankings.sort((a, b) => b.averageRP - a.averageRP);
  return rankings.map((c, i) => ({ rank: i + 1, ...c }));
}

function aggregateAcrossTiers(rows: (StatRow & { tier: string })[]): StatRow[] {
  const map = new Map<string, StatRow & { _rankSum: number }>();
  for (const r of rows) {
    const key = `${r.characterNum}|${r.bestWeapon ?? "null"}`;
    const games = r.totalGames ?? 0;
    const ex = map.get(key);
    if (!ex) {
      map.set(key, {
        characterNum: r.characterNum,
        bestWeapon: r.bestWeapon,
        totalGames: games,
        totalWins: r.totalWins ?? 0,
        totalRP: r.totalRP ?? 0,
        totalTop3: r.totalTop3 ?? 0,
        averageRank: 0,
        _rankSum: (r.averageRank ?? 0) * games,
      });
    } else {
      ex.totalGames += games;
      ex.totalWins += r.totalWins ?? 0;
      ex.totalRP += r.totalRP ?? 0;
      ex.totalTop3 += r.totalTop3 ?? 0;
      ex._rankSum += (r.averageRank ?? 0) * games;
    }
  }
  return Array.from(map.values()).map(({ _rankSum, ...rest }) => ({
    ...rest,
    averageRank: rest.totalGames > 0 ? _rankSum / rest.totalGames : 0,
  }));
}

function selectRankings(
  data: (StatRow & { tier: string })[],
  requestedTier: string,
  patchVersion: string
): { rankings: CharacterRankingData[]; usedTier: string } {
  // 누적(+) tier 필터: 요청 tier 와 그 위 모든 tier row 를 합산.
  const cumulativeTiers = new Set(expandCumulativeTier(requestedTier));
  const rows = data.filter((r) => cumulativeTiers.has(r.tier));
  if (rows.length === 0) {
    return { rankings: [], usedTier: requestedTier };
  }
  // 같은 (characterNum, bestWeapon) 의 multiple tier row 합산.
  const merged = aggregateAcrossTiers(rows);
  return {
    rankings: buildRankings(collapseWeaponAgnosticRows(merged), patchVersion, requestedTier),
    usedTier: requestedTier,
  };
}

export async function fetchRankingData(
  patchVersion: string,
  requestedTier: string,
  strict = false
): Promise<RankingResponse> {
  const patchList = seasonSnapshot.patches.map(({ version }) => version);
  if (patchVersion === HOME_META_TARGET_PATCH && !patchList.includes(patchVersion)) {
    patchList.unshift(patchVersion);
  }
  const currentIndex = patchList.indexOf(patchVersion);
  const previousPatch =
    currentIndex >= 0 && currentIndex + 1 < patchList.length ? patchList[currentIndex + 1] : null;

  const rowsByPatch = await Promise.all([
    readSnapshotStatRows(patchVersion),
    previousPatch ? readSnapshotStatRows(previousPatch) : Promise.resolve([]),
  ]).catch((error: unknown) => {
    if (strict) throw new Error("Failed to load patch rankings", { cause: error });
    return null;
  });
  if (!rowsByPatch) {
    return {
      rankings: [],
      previousRankings: [],
      patchVersion,
      previousPatch: null,
      tier: requestedTier,
    };
  }
  const [currentRows, previousRows] = rowsByPatch;
  const normalize = (rows: typeof currentRows) =>
    rows
      .filter((row) => TIER_FALLBACK_ORDER.includes(row.tier))
      .map((row) => ({ ...row, bestWeapon: row.bestWeapon ?? 0 }));
  const currentData = normalize(currentRows);
  const prevData = normalize(previousRows);

  const { rankings, usedTier } = selectRankings(currentData, requestedTier, patchVersion);
  const { rankings: previousRankings } =
    prevData.length > 0
      ? selectRankings(prevData, usedTier, previousPatch!)
      : { rankings: [] as CharacterRankingData[] };

  return {
    rankings,
    previousRankings,
    patchVersion,
    previousPatch,
    tier: usedTier,
  };
}

export async function getCachedRankingData(
  patchVersion: string,
  requestedTier: string
): Promise<RankingResponse> {
  return unstable_cache(
    async () => fetchRankingData(patchVersion, requestedTier),
    [
      "character-rankings",
      "fixed-entry-cost-v1",
      seasonSnapshot.version,
      patchVersion,
      requestedTier,
    ],
    {
      revalidate: patchVersion === HOME_META_TARGET_PATCH ? 1800 : 21600,
      tags: [
        "character-rankings",
        `character-rankings:${patchVersion}`,
        `character-rankings:tier:${requestedTier}`,
      ],
    }
  )();
}
