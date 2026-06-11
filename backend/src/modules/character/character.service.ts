import { Injectable } from '@nestjs/common';
import { SupabaseService } from '../../common/database/supabase.service';
import { RedisService } from '../../common/redis/redis.service';

const TIER_FALLBACK_ORDER = ['DIAMOND', 'METEORITE', 'MITHRIL', 'IN1000'];
const STATS_EXCLUDED_PATCHES = new Set(['11.0']);
const WEAPON_AGNOSTIC_CHARACTER_CODES = new Set([27]);
const WEAPON_AGNOSTIC_SENTINEL = 0;
const TIER_CUMULATIVE: Record<string, string[]> = {
  PLATINUM_PLUS: ['PLATINUM', 'DIAMOND', 'METEORITE', 'MITHRIL'],
  DIAMOND_PLUS: ['DIAMOND', 'METEORITE', 'MITHRIL'],
  METEORITE_PLUS: ['METEORITE', 'MITHRIL'],
  MITHRIL_PLUS: ['MITHRIL'],
  IN1000_PLUS: ['IN1000'],
};

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

// View 조회 결과 타입
interface RankingViewRow {
  characterNum: number;
  bestWeapon: number;
  totalGames: number;
  pickRate: number;
  winRate: number;
  averageRPPerGame: number;
  top3Rate: number;
  rank: number;
  tier: string;
  patchVersion: string;
}

interface CharacterStatRow {
  characterNum: number;
  bestWeapon: number | null;
  totalGames: number;
  totalWins: number;
  totalRP: number;
  totalTop3: number;
  averageRank: number;
}

function expandCumulativeTier(tier: string): string[] {
  return TIER_CUMULATIVE[tier] ?? [tier];
}

function aggregateCharacterStatsAcrossTiers(rows: CharacterStatRow[]): CharacterStatRow[] {
  const map = new Map<string, CharacterStatRow & { rankSum: number }>();

  for (const row of rows) {
    const key = `${row.characterNum}|${row.bestWeapon ?? 'null'}`;
    const games = row.totalGames ?? 0;
    const existing = map.get(key);
    if (existing) {
      existing.totalGames += games;
      existing.totalWins += row.totalWins ?? 0;
      existing.totalRP += row.totalRP ?? 0;
      existing.totalTop3 += row.totalTop3 ?? 0;
      existing.rankSum += (row.averageRank ?? 0) * games;
    } else {
      map.set(key, {
        characterNum: row.characterNum,
        bestWeapon: row.bestWeapon,
        totalGames: games,
        totalWins: row.totalWins ?? 0,
        totalRP: row.totalRP ?? 0,
        totalTop3: row.totalTop3 ?? 0,
        averageRank: row.averageRank ?? 0,
        rankSum: (row.averageRank ?? 0) * games,
      });
    }
  }

  return [...map.values()].map(({ rankSum, ...row }) => ({
    ...row,
    averageRank: row.totalGames > 0 ? rankSum / row.totalGames : 0,
  }));
}

function collapseWeaponAgnosticRows(rows: CharacterStatRow[]): CharacterStatRow[] {
  const passthrough: CharacterStatRow[] = [];
  const groups = new Map<number, CharacterStatRow[]>();

  for (const row of rows) {
    if (!WEAPON_AGNOSTIC_CHARACTER_CODES.has(row.characterNum)) {
      passthrough.push(row);
      continue;
    }

    const bucket = groups.get(row.characterNum);
    if (bucket) bucket.push(row);
    else groups.set(row.characterNum, [row]);
  }

  const merged: CharacterStatRow[] = [];
  for (const group of groups.values()) {
    const games = group.reduce((sum, row) => sum + (row.totalGames ?? 0), 0);
    const base = group.reduce((a, b) =>
      (b.totalGames ?? 0) > (a.totalGames ?? 0) ? b : a,
    );
    merged.push({
      ...base,
      bestWeapon: WEAPON_AGNOSTIC_SENTINEL,
      totalGames: games,
      totalWins: group.reduce((sum, row) => sum + (row.totalWins ?? 0), 0),
      totalRP: group.reduce((sum, row) => sum + (row.totalRP ?? 0), 0),
      totalTop3: group.reduce((sum, row) => sum + (row.totalTop3 ?? 0), 0),
      averageRank:
        games > 0
          ? group.reduce(
              (sum, row) => sum + (row.averageRank ?? 0) * (row.totalGames ?? 0),
              0,
            ) / games
          : 0,
    });
  }

  return [...passthrough, ...merged];
}

function buildEmptyCharacterStats(characterCode: number, patchVersion: string, tier: string) {
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

/**
 * View 결과를 API 응답 형식으로 변환
 * View에서 이미 pickRate, winRate, rank가 계산되어 있으므로 매핑만 수행
 */
function viewToRankingData(rows: RankingViewRow[]): CharacterRankingData[] {
  return rows.map((r) => ({
    rank: r.rank,
    characterNum: r.characterNum,
    bestWeapon: r.bestWeapon,
    totalGames: r.totalGames,
    pickRate: r.pickRate,
    winRate: r.winRate,
    averageRP: r.averageRPPerGame,
    top3Rate: r.top3Rate,
  }));
}

/**
 * 요청된 티어에 데이터가 없으면 폴백 순서대로 시도
 */
function selectTierData(
  rows: RankingViewRow[],
  requestedTier: string,
): { rankings: CharacterRankingData[]; usedTier: string } {
  const tierOrder = [
    requestedTier,
    ...TIER_FALLBACK_ORDER.filter((t) => t !== requestedTier),
  ];
  for (const tier of tierOrder) {
    const tierRows = rows.filter((r) => r.tier === tier);
    if (tierRows.length > 0) {
      return { rankings: viewToRankingData(tierRows), usedTier: tier };
    }
  }
  return { rankings: [], usedTier: requestedTier };
}

@Injectable()
export class CharacterService {
  constructor(
    private readonly supabase: SupabaseService,
    private readonly redis: RedisService,
  ) {}

  async fetchRankingData(patchVersion: string, requestedTier: string) {
    const cacheKey = `ranking:${patchVersion || 'latest'}:${requestedTier}`;
    return this.redis.getOrSet(cacheKey, 1800, () =>
      this._fetchRankingData(patchVersion, requestedTier),
    );
  }

  private async _fetchRankingData(patchVersion: string, requestedTier: string) {
    const client = this.supabase.getClient();

    // 패치 목록 조회
    const { data: patches } = await client
      .from('PatchVersion')
      .select('version')
      .order('startDate', { ascending: false })
      .limit(50);

    const patchList = (patches ?? []).map(
      (p: { version: string }) => p.version,
    );
    const effectivePatch = patchVersion || patchList[0] || '10.4';
    const currentIndex = patchList.indexOf(effectivePatch);
    const previousPatch =
      currentIndex >= 0 && currentIndex + 1 < patchList.length
        ? patchList[currentIndex + 1]
        : null;

    // character_rankings View에서 조회 (pickRate, winRate, rank가 이미 계산됨)
    const patchVersions = previousPatch
      ? [effectivePatch, previousPatch]
      : [effectivePatch];

    const { data, error } = await client
      .from('character_rankings')
      .select('*')
      .in('patchVersion', patchVersions)
      .in('tier', TIER_FALLBACK_ORDER);

    if (error || !data) {
      return {
        rankings: [],
        previousRankings: [],
        patchVersion: effectivePatch,
        previousPatch: null,
        tier: requestedTier,
      };
    }

    const viewRows = data as RankingViewRow[];
    const currentRows = viewRows.filter((r) => r.patchVersion === effectivePatch);
    const prevRows = previousPatch
      ? viewRows.filter((r) => r.patchVersion === previousPatch)
      : [];

    const { rankings, usedTier } = selectTierData(currentRows, requestedTier);
    const { rankings: previousRankings } =
      prevRows.length > 0
        ? selectTierData(prevRows, usedTier)
        : { rankings: [] as CharacterRankingData[] };

    return {
      rankings,
      previousRankings,
      patchVersion: effectivePatch,
      previousPatch,
      tier: usedTier,
    };
  }

  async getCharacterStats(
    characterCode: number,
    patchVersion: string,
    tier: string,
  ) {
    if (!characterCode || isNaN(characterCode)) {
      return buildEmptyCharacterStats(characterCode, patchVersion, tier);
    }

    const cacheKey = `char-stats:${characterCode}:${patchVersion || 'latest'}:${tier}`;
    return this.redis.getOrSet(cacheKey, 1800, () =>
      this._getCharacterStats(characterCode, patchVersion, tier),
    );
  }

  private async _getCharacterStats(
    characterCode: number,
    patchVersion: string,
    tier: string,
  ) {
    const client = this.supabase.getClient();

    const { data: patches } = await client
      .from('PatchVersion')
      .select('version')
      .order('startDate', { ascending: false })
      .limit(50);

    const patchList = (patches ?? [])
      .map((patch: { version: string }) => patch.version)
      .filter((version) => !STATS_EXCLUDED_PATCHES.has(version));
    const effectivePatch = patchVersion || patchList[0] || '';
    const emptyResponse = buildEmptyCharacterStats(characterCode, effectivePatch, tier);

    const tiers = expandCumulativeTier(tier);
    const selectCols =
      'characterNum,bestWeapon,totalGames,totalWins,totalRP,totalTop3,averageRank';
    let { data, error } = await client
      .from('v2_CharacterStats')
      .select(selectCols)
      .eq('patchVersion', effectivePatch)
      .in('tier', tiers);

    if ((!data || data.length === 0) && !error) {
      const fallback = await client
        .from('CharacterStats')
        .select(selectCols)
        .eq('patchVersion', effectivePatch)
        .in('tier', tiers);
      data = fallback.data;
      error = fallback.error;
    }

    if (error || !data || data.length === 0) return emptyResponse;

    const allRows = aggregateCharacterStatsAcrossTiers(data as CharacterStatRow[]);
    const grandTotal = allRows.reduce((sum, row) => sum + (row.totalGames ?? 0), 0);
    const rows = collapseWeaponAgnosticRows(
      allRows.filter((row) => row.characterNum === characterCode),
    );

    if (rows.length === 0) return emptyResponse;

    const totalGames = rows.reduce((sum, r) => sum + r.totalGames, 0);
    const totalWins = rows.reduce((sum, r) => sum + r.totalWins, 0);
    const totalRP = rows.reduce((sum, r) => sum + r.totalRP, 0);
    const totalTop3 = rows.reduce((sum, r) => sum + r.totalTop3, 0);
    const weightedAverageRank =
      totalGames > 0
        ? rows.reduce((sum, row) => sum + (row.averageRank ?? 0) * (row.totalGames ?? 0), 0) /
          totalGames
        : 0;

    const weapons = rows
      .map((r) => ({
        bestWeapon: r.bestWeapon,
        totalGames: r.totalGames,
        pickRate: totalGames > 0 ? (r.totalGames / totalGames) * 100 : 0,
        winRate: r.totalGames > 0 ? (r.totalWins / r.totalGames) * 100 : 0,
        averageRank: r.averageRank ?? 0,
        averageRP: r.totalGames > 0 ? r.totalRP / r.totalGames : 0,
      }))
      .sort((a, b) => b.totalGames - a.totalGames);

    return {
      characterNum: characterCode,
      patchVersion: effectivePatch,
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
}
