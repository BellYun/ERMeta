import { Injectable } from '@nestjs/common';
import { SupabaseService } from '../../common/database/supabase.service';
import { RedisService } from '../../common/redis/redis.service';

const TIER_FALLBACK_ORDER = ['DIAMOND', 'METEORITE', 'MITHRIL', 'IN1000'];
const STATS_EXCLUDED_PATCHES = new Set(['11.0']);
const PLAYERS_PER_MATCH = 24;
const CURRENT_PATCH_MIN_MATCH_RATIO = 0.1;
const WEAPON_AGNOSTIC_CHARACTER_CODES = new Set([27]);
const WEAPON_AGNOSTIC_SENTINEL = 0;
const HONEY_PICK_SCORE_WEIGHTS = {
  winRate: 0.5,
  pickRate: 0.3,
  averageRP: 0.2,
} as const;
const TIER_CUMULATIVE: Record<string, string[]> = {
  PLATINUM_PLUS: ['PLATINUM', 'DIAMOND', 'METEORITE', 'MITHRIL'],
  DIAMOND_PLUS: ['DIAMOND', 'METEORITE', 'MITHRIL'],
  METEORITE_PLUS: ['METEORITE', 'MITHRIL'],
  MITHRIL_PLUS: ['MITHRIL'],
  IN1000_PLUS: ['IN1000'],
};

interface StatRow {
  characterNum: number;
  bestWeapon: number;
  totalGames: number;
  totalWins: number;
  totalRP: number;
  totalTop3: number;
  tier: string;
  patchVersion: string;
}

function computeRates(rows: StatRow[]) {
  const grandTotal = rows.reduce((sum, r) => sum + (r.totalGames ?? 0), 0);
  return rows.map((r) => ({
    characterNum: r.characterNum,
    bestWeapon: r.bestWeapon,
    totalGames: r.totalGames ?? 0,
    pickRate: grandTotal > 0 ? ((r.totalGames ?? 0) / grandTotal) * 100 : 0,
    winRate: r.totalGames > 0 ? ((r.totalWins ?? 0) / r.totalGames) * 100 : 0,
    averageRP: r.totalGames > 0 ? (r.totalRP ?? 0) / r.totalGames : 0,
  }));
}

function computeCurrentPatchMinGames(rows: StatRow[]): number {
  const currentTotalGames = rows.reduce((sum, row) => sum + (row.totalGames ?? 0), 0);
  const estimatedMatchCount = currentTotalGames / PLAYERS_PER_MATCH;
  return Math.ceil(estimatedMatchCount * CURRENT_PATCH_MIN_MATCH_RATIO);
}

function getHoneyPickKey(characterNum: number, bestWeapon: number) {
  return `${characterNum}:${bestWeapon}`;
}

function expandCumulativeTier(tier: string): string[] {
  return TIER_CUMULATIVE[tier] ?? [tier];
}

function aggregateAcrossTiers(rows: StatRow[]): StatRow[] {
  const map = new Map<string, StatRow>();

  for (const row of rows) {
    const key = `${row.characterNum}|${row.bestWeapon ?? 'null'}`;
    const existing = map.get(key);
    if (existing) {
      existing.totalGames += row.totalGames ?? 0;
      existing.totalWins += row.totalWins ?? 0;
      existing.totalRP += row.totalRP ?? 0;
      existing.totalTop3 += row.totalTop3 ?? 0;
    } else {
      map.set(key, {
        ...row,
        totalGames: row.totalGames ?? 0,
        totalWins: row.totalWins ?? 0,
        totalRP: row.totalRP ?? 0,
        totalTop3: row.totalTop3 ?? 0,
      });
    }
  }

  return [...map.values()];
}

function collapseWeaponAgnosticRows(rows: StatRow[]): StatRow[] {
  const passthrough: StatRow[] = [];
  const groups = new Map<number, StatRow[]>();

  for (const row of rows) {
    if (!WEAPON_AGNOSTIC_CHARACTER_CODES.has(row.characterNum)) {
      passthrough.push(row);
      continue;
    }

    const bucket = groups.get(row.characterNum);
    if (bucket) bucket.push(row);
    else groups.set(row.characterNum, [row]);
  }

  const merged: StatRow[] = [];
  for (const group of groups.values()) {
    const base = group.reduce((a, b) =>
      (b.totalGames ?? 0) > (a.totalGames ?? 0) ? b : a,
    );
    merged.push({
      ...base,
      bestWeapon: WEAPON_AGNOSTIC_SENTINEL,
      totalGames: group.reduce((sum, row) => sum + (row.totalGames ?? 0), 0),
      totalWins: group.reduce((sum, row) => sum + (row.totalWins ?? 0), 0),
      totalRP: group.reduce((sum, row) => sum + (row.totalRP ?? 0), 0),
      totalTop3: group.reduce((sum, row) => sum + (row.totalTop3 ?? 0), 0),
    });
  }

  return [...passthrough, ...merged];
}

function selectTierRows(data: StatRow[], requestedTier: string) {
  const cumulativeTiers = new Set(expandCumulativeTier(requestedTier));
  const filtered = data.filter((r) => cumulativeTiers.has(r.tier));
  if (filtered.length === 0) return { rows: [] as StatRow[], usedTier: requestedTier };
  return { rows: aggregateAcrossTiers(filtered), usedTier: requestedTier };
}

@Injectable()
export class MetaService {
  constructor(
    private readonly supabase: SupabaseService,
    private readonly redis: RedisService,
  ) {}

  async getHoneyPicks(patchVersion: string | undefined, requestedTier: string) {
    const cacheKey = `honey:${patchVersion ?? 'latest'}:${requestedTier}`;
    return this.redis.getOrSet(cacheKey, 1800, () =>
      this._getHoneyPicks(patchVersion, requestedTier),
    );
  }

  private async _getHoneyPicks(patchVersion: string | undefined, requestedTier: string) {
    const client = this.supabase.getClient();

    const { data: patches } = await client
      .from('PatchVersion').select('version')
      .order('startDate', { ascending: false }).limit(50);

    const patchList = (patches ?? [])
      .map((p: { version: string }) => p.version)
      .filter((version) => !STATS_EXCLUDED_PATCHES.has(version));
    const currentPatch = patchVersion ?? patchList[0] ?? '';
    const currentIndex = patchList.indexOf(currentPatch);
    let previousPatch: string | null = null;
    if (currentIndex >= 0) {
      for (let i = currentIndex + 1; i < patchList.length; i++) {
        if (!STATS_EXCLUDED_PATCHES.has(patchList[i])) {
          previousPatch = patchList[i];
          break;
        }
      }
    }

    if (!previousPatch) {
      return { picks: [], patchVersion: currentPatch, previousPatch: null, tier: requestedTier };
    }

    const selectCols =
      'characterNum,bestWeapon,totalGames,totalWins,totalRP,totalTop3,tier,patchVersion';
    const queryResult = await client
      .from('v2_CharacterStats')
      .select(selectCols)
      .in('patchVersion', [currentPatch, previousPatch])
      .in('tier', TIER_FALLBACK_ORDER);
    const { error } = queryResult;
    let { data } = queryResult;

    if (data && previousPatch) {
      const hasV2Prev = data.some(
        (r: { patchVersion: string }) => r.patchVersion === previousPatch,
      );
      if (!hasV2Prev) {
        const { data: oldData } = await client
          .from('CharacterStats')
          .select(selectCols)
          .eq('patchVersion', previousPatch)
          .in('tier', TIER_FALLBACK_ORDER);
        if (oldData && oldData.length > 0) data = [...data, ...oldData];
      }
    }

    if (error || !data) {
      return { picks: [], patchVersion: currentPatch, previousPatch, tier: requestedTier };
    }

    const typedData = data as StatRow[];
    const { rows: currentMerged, usedTier } = selectTierRows(
      typedData.filter((r) => r.patchVersion === currentPatch), requestedTier,
    );
    const { rows: prevMerged } = selectTierRows(
      typedData.filter((r) => r.patchVersion === previousPatch), usedTier,
    );
    const currentRows = collapseWeaponAgnosticRows(currentMerged);
    const prevRows = collapseWeaponAgnosticRows(prevMerged);

    if (currentRows.length === 0 || prevRows.length === 0) {
      return { picks: [], patchVersion: currentPatch, previousPatch, tier: usedTier };
    }

    const currentRates = computeRates(currentRows);
    const prevRates = computeRates(prevRows);
    const prevMap = new Map(
      prevRates.map((r) => [getHoneyPickKey(r.characterNum, r.bestWeapon), r]),
    );
    const minCurrentGames = computeCurrentPatchMinGames(currentRows);

    const honeyPicks: {
      characterNum: number; bestWeapon: number;
      pickRate: number; winRate: number; averageRP: number;
      pickRateDelta: number; winRateDelta: number; averageRPDelta: number;
      honeyScore: number;
    }[] = [];

    for (const curr of currentRates) {
      if (curr.totalGames < minCurrentGames) continue;
      const prev = prevMap.get(getHoneyPickKey(curr.characterNum, curr.bestWeapon));
      if (!prev) continue;
      const pickRateDelta = curr.pickRate - prev.pickRate;
      const winRateDelta = curr.winRate - prev.winRate;
      const averageRPDelta = curr.averageRP - prev.averageRP;
      if (pickRateDelta > 0 && winRateDelta > 0 && averageRPDelta > 0) {
        honeyPicks.push({
          characterNum: curr.characterNum, bestWeapon: curr.bestWeapon,
          pickRate: curr.pickRate, winRate: curr.winRate, averageRP: curr.averageRP,
          pickRateDelta, winRateDelta,
          averageRPDelta,
          honeyScore:
            HONEY_PICK_SCORE_WEIGHTS.winRate * winRateDelta +
            HONEY_PICK_SCORE_WEIGHTS.pickRate * pickRateDelta +
            HONEY_PICK_SCORE_WEIGHTS.averageRP * averageRPDelta,
        });
      }
    }

    honeyPicks.sort((a, b) => b.honeyScore - a.honeyScore);
    return { picks: honeyPicks.slice(0, 10), patchVersion: currentPatch, previousPatch, tier: usedTier };
  }
}
