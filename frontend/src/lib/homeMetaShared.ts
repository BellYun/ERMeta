import type { HoneyPickData } from "@/lib/honeyPicks";
import type { CharacterRankingData, RankingResponse } from "@/lib/ranking";
import { collapseWeaponAgnosticRows } from "@/lib/weaponAgnostic";
import { calculateMetaChanges, calculateTrendScore } from "@/utils/metaAnalysis";

export type HomeBaseTier = "DIAMOND" | "METEORITE" | "MITHRIL";
export type HomePlusTier = "DIAMOND_PLUS" | "METEORITE_PLUS";
export type HomeSelectableTier = HomeBaseTier | HomePlusTier;

export const DEFAULT_HOME_TIER: HomePlusTier = "DIAMOND_PLUS";
export const HOME_BASE_TIERS: HomeBaseTier[] = ["DIAMOND", "METEORITE", "MITHRIL"];
export const HOME_META_CURRENT_PATCH = "12.1";
export const HOME_META_MIN_COLLECTED_GAMES = 50_000;

export const HOME_PLUS_TIER_MAP: Record<HomePlusTier, HomeBaseTier[]> = {
  DIAMOND_PLUS: ["DIAMOND", "METEORITE", "MITHRIL"],
  METEORITE_PLUS: ["METEORITE", "MITHRIL"],
};

export interface HomeMetaStatRow {
  characterNum: number;
  bestWeapon: number;
  totalGames: number;
  totalWins: number;
  totalRP: number;
  totalTop3: number;
  averageRank: number;
  tier: HomeBaseTier;
  patchVersion: string;
}

export interface HomeMetaStats {
  patchVersion: string;
  previousPatch: string | null;
  rows: HomeMetaStatRow[];
  collectedGames?: number;
}

export interface RisingPickData {
  characterNum: number;
  bestWeapon: number;
  pickRate: number;
  winRate: number;
  averageRP: number;
  pickRateDelta: number;
  winRateDelta: number;
  averageRPDelta: number;
  trendScore: number;
}

export interface HomeMetaView {
  honeyPicks: HoneyPickData[];
  risingPicks: RisingPickData[];
  rankingData: RankingResponse;
}

const PLAYERS_PER_MATCH = 24;
const CURRENT_PATCH_MIN_MATCH_RATIO = 0.1;
const HONEY_PICK_SCORE_WEIGHTS = {
  winRate: 0.5,
  pickRate: 0.3,
  averageRP: 0.2,
} as const;

function getTierSet(tier: string): HomeBaseTier[] {
  if ((HOME_BASE_TIERS as string[]).includes(tier)) return [tier as HomeBaseTier];
  return HOME_PLUS_TIER_MAP[tier as HomePlusTier] ?? HOME_PLUS_TIER_MAP[DEFAULT_HOME_TIER];
}

function getKey(row: Pick<HomeMetaStatRow, "characterNum" | "bestWeapon">) {
  return `${row.characterNum}|${row.bestWeapon ?? "null"}`;
}

function aggregateRows(rows: HomeMetaStatRow[]): HomeMetaStatRow[] {
  const map = new Map<string, HomeMetaStatRow & { rankSum: number }>();

  for (const row of rows) {
    const key = getKey(row);
    const games = row.totalGames ?? 0;
    const current = map.get(key);

    if (!current) {
      map.set(key, {
        ...row,
        totalGames: games,
        totalWins: row.totalWins ?? 0,
        totalRP: row.totalRP ?? 0,
        totalTop3: row.totalTop3 ?? 0,
        averageRank: 0,
        rankSum: (row.averageRank ?? 0) * games,
      });
      continue;
    }

    current.totalGames += games;
    current.totalWins += row.totalWins ?? 0;
    current.totalRP += row.totalRP ?? 0;
    current.totalTop3 += row.totalTop3 ?? 0;
    current.rankSum += (row.averageRank ?? 0) * games;
  }

  const merged = Array.from(map.values()).map(({ rankSum, ...row }) => ({
    ...row,
    averageRank: row.totalGames > 0 ? rankSum / row.totalGames : 0,
  }));

  return collapseWeaponAgnosticRows(merged);
}

function buildRankings(rows: HomeMetaStatRow[]): CharacterRankingData[] {
  const grandTotal = rows.reduce((sum, row) => sum + (row.totalGames ?? 0), 0);

  const rankings = rows.map((row) => ({
    characterNum: row.characterNum,
    bestWeapon: row.bestWeapon,
    totalGames: row.totalGames ?? 0,
    pickRate: grandTotal > 0 ? ((row.totalGames ?? 0) / grandTotal) * 100 : 0,
    winRate: row.totalGames > 0 ? ((row.totalWins ?? 0) / row.totalGames) * 100 : 0,
    averageRP: row.totalGames > 0 ? (row.totalRP ?? 0) / row.totalGames : 0,
    top3Rate: row.totalGames > 0 ? ((row.totalTop3 ?? 0) / row.totalGames) * 100 : 0,
  }));

  rankings.sort((a, b) => b.averageRP - a.averageRP);
  return rankings.map((row, index) => ({ rank: index + 1, ...row }));
}

function getHoneyPickKey(row: Pick<CharacterRankingData, "characterNum" | "bestWeapon">) {
  return `${row.characterNum}:${row.bestWeapon}`;
}

function computeCurrentPatchMinGames(rows: HomeMetaStatRow[]): number {
  const currentTotalGames = rows.reduce((sum, row) => sum + (row.totalGames ?? 0), 0);
  const estimatedMatchCount = currentTotalGames / PLAYERS_PER_MATCH;
  return Math.ceil(estimatedMatchCount * CURRENT_PATCH_MIN_MATCH_RATIO);
}

function buildHoneyPicks(
  currentRows: HomeMetaStatRow[],
  currentRankings: CharacterRankingData[],
  previousRankings: CharacterRankingData[]
): HoneyPickData[] {
  if (currentRows.length === 0 || previousRankings.length === 0) return [];

  const prevMap = new Map(previousRankings.map((row) => [getHoneyPickKey(row), row]));
  const minCurrentGames = computeCurrentPatchMinGames(currentRows);
  const honeyPicks: HoneyPickData[] = [];

  for (const curr of currentRankings) {
    if (curr.totalGames < minCurrentGames) continue;
    const prev = prevMap.get(getHoneyPickKey(curr));
    if (!prev) continue;

    const pickRateDelta = curr.pickRate - prev.pickRate;
    const winRateDelta = curr.winRate - prev.winRate;
    const averageRPDelta = curr.averageRP - prev.averageRP;

    if (winRateDelta > 0 && pickRateDelta > 0 && averageRPDelta > 0) {
      honeyPicks.push({
        characterNum: curr.characterNum,
        bestWeapon: curr.bestWeapon,
        pickRate: curr.pickRate,
        winRate: curr.winRate,
        averageRP: curr.averageRP,
        pickRateDelta,
        winRateDelta,
        averageRPDelta,
        honeyScore:
          HONEY_PICK_SCORE_WEIGHTS.winRate * winRateDelta +
          HONEY_PICK_SCORE_WEIGHTS.pickRate * pickRateDelta +
          HONEY_PICK_SCORE_WEIGHTS.averageRP * averageRPDelta,
      });
    }
  }

  honeyPicks.sort((a, b) => b.honeyScore - a.honeyScore);
  return honeyPicks.slice(0, 10);
}

function buildRisingPicks(
  currentRows: HomeMetaStatRow[],
  currentRankings: CharacterRankingData[],
  previousRankings: CharacterRankingData[]
): RisingPickData[] {
  if (currentRows.length === 0 || previousRankings.length === 0) return [];

  const prevMap = new Map(previousRankings.map((row) => [getHoneyPickKey(row), row]));
  const minCurrentGames = computeCurrentPatchMinGames(currentRows);
  const risingPicks: RisingPickData[] = [];

  for (const curr of currentRankings) {
    if (curr.totalGames < minCurrentGames) continue;
    const prev = prevMap.get(getHoneyPickKey(curr));
    if (!prev) continue;

    const changes = calculateMetaChanges(curr, prev);
    const trendScore = calculateTrendScore(changes);
    if (trendScore <= 5) continue;

    risingPicks.push({
      characterNum: curr.characterNum,
      bestWeapon: curr.bestWeapon,
      pickRate: curr.pickRate,
      winRate: curr.winRate,
      averageRP: curr.averageRP,
      pickRateDelta: changes.pickRate.delta,
      winRateDelta: changes.winRate.delta,
      averageRPDelta: changes.averageRP.delta,
      trendScore,
    });
  }

  risingPicks.sort((a, b) => b.trendScore - a.trendScore);
  return risingPicks.slice(0, 10);
}

export function buildHomeMetaView(stats: HomeMetaStats, tier: string): HomeMetaView {
  const tierSet = new Set(getTierSet(tier));
  const currentRows = aggregateRows(
    stats.rows.filter((row) => row.patchVersion === stats.patchVersion && tierSet.has(row.tier))
  );
  const previousRows = stats.previousPatch
    ? aggregateRows(
        stats.rows.filter(
          (row) => row.patchVersion === stats.previousPatch && tierSet.has(row.tier)
        )
      )
    : [];

  const rankings = buildRankings(currentRows);
  const previousRankings = buildRankings(previousRows);

  return {
    honeyPicks: buildHoneyPicks(currentRows, rankings, previousRankings),
    risingPicks: buildRisingPicks(currentRows, rankings, previousRankings),
    rankingData: {
      rankings,
      previousRankings,
      patchVersion: stats.patchVersion,
      previousPatch: stats.previousPatch,
      tier,
    },
  };
}

export function createEmptyHomeMetaStats(patchVersion = ""): HomeMetaStats {
  return {
    patchVersion,
    previousPatch: null,
    rows: [],
    collectedGames: 0,
  };
}
