import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { SupabaseService } from '../../common/database/supabase.service';
import { RedisService } from '../../common/redis/redis.service';

const DIAMOND_PLUS_TIERS = ['DIAMOND', 'METEORITE', 'MITHRIL'];
const EXCLUDED_CHARACTER_CODES = new Set([9998, 9999]);
const BAYESIAN_K = 50;

const TRIO_WEAPON_SEARCH_P10_TABLE = 'v2_CharacterTrioWeaponSearch_p10';
const TRIO_WEAPON_TABLE = 'v2_CharacterTrioWeapon';
const SUPPLEMENTAL_PATCH_VERSIONS = ['11.1', '11.2', '11.3'];
const DB_PAGE_SIZE = 1000;
const TRIO_WEAPON_PARALLEL_FETCH_LIMIT = 5000;
const TRIO_WEAPON_FULL_FETCH_LIMIT = 5000;
const EXACT_PAIR_WEAPON_FETCH_LIMIT = 20000;
const MAX_TRIO_WEAPON_RESPONSE_LIMIT = TRIO_WEAPON_FULL_FETCH_LIMIT;
const TRIO_WEAPON_CACHE_VERSION = 'v6';

type SortBy = 'averageRP' | 'winRate' | 'averageRank' | 'totalGames' | 'recommended';

interface SupabaseErrorLike {
  code?: string;
  message?: string;
}

interface TrioWeaponRow {
  tier: string;
  character1: number;
  weapon_type1: number;
  character2: number;
  weapon_type2: number;
  character3: number;
  weapon_type3: number;
  main_core1: number | null;
  main_core2: number | null;
  main_core3: number | null;
  total_games: number;
  total_wins: number;
  total_rp: number;
  rank_sum: number;
}

interface TrioWeaponSearchRow {
  ally1_char: number;
  ally1_weapon: number;
  ally1_core: number | null;
  ally2_char: number;
  ally2_weapon: number;
  ally2_core: number | null;
  third_char: number;
  third_weapon: number;
  third_core: number | null;
  total_games: number;
  total_wins: number;
  total_rp: number;
  rank_sum: number;
}

interface AggregatedTrioWeapon {
  character1: number;
  weaponType1: number;
  character2: number;
  weaponType2: number;
  character3: number;
  weaponType3: number;
  mainCore1: number | null;
  mainCore2: number | null;
  mainCore3: number | null;
  totalGames: number;
  winRate: number;
  averageRP: number;
  averageRank: number;
}

interface TrioWeaponMember {
  character: number;
  weapon: number;
  mainCore: number | null;
}

type SearchPositionColumn = 'ally1_char' | 'ally2_char' | 'third_char';
type TrioWeaponPositionColumn = 'character1' | 'character2' | 'character3';
type TrioWeaponColumn = keyof TrioWeaponRow;
type TrioWeaponPairPosition = {
  charColumn1: TrioWeaponPositionColumn;
  weaponColumn1: TrioWeaponColumn;
  charColumn2: TrioWeaponPositionColumn;
  weaponColumn2: TrioWeaponColumn;
};

const TRIO_WEAPON_SELECT =
  'tier,character1,weapon_type1,character2,weapon_type2,character3,weapon_type3,main_core1,main_core2,main_core3,total_games,total_wins,total_rp,rank_sum';
const TRIO_WEAPON_SEARCH_SELECT =
  'ally1_char,ally1_weapon,ally1_core,ally2_char,ally2_weapon,ally2_core,third_char,third_weapon,third_core,total_games,total_wins,total_rp,rank_sum';

const TRIO_WEAPON_PAIR_POSITIONS: readonly TrioWeaponPairPosition[] = [
  {
    charColumn1: 'character1',
    weaponColumn1: 'weapon_type1',
    charColumn2: 'character2',
    weaponColumn2: 'weapon_type2',
  },
  {
    charColumn1: 'character1',
    weaponColumn1: 'weapon_type1',
    charColumn2: 'character3',
    weaponColumn2: 'weapon_type3',
  },
  {
    charColumn1: 'character2',
    weaponColumn1: 'weapon_type2',
    charColumn2: 'character3',
    weaponColumn2: 'weapon_type3',
  },
];

function bayesianRP(avgRP: number, n: number, globalAvg: number): number {
  return (n * avgRP + BAYESIAN_K * globalAvg) / (n + BAYESIAN_K);
}

function wilsonLower(winPct: number, n: number): number {
  if (n === 0) return 0;
  const p = winPct / 100;
  const z = 1.645;
  const num =
    p +
    (z * z) / (2 * n) -
    z * Math.sqrt((p * (1 - p)) / n + (z * z) / (4 * n * n));
  return Math.max(0, num / (1 + (z * z) / n));
}

function rankScore(averageRank: number): number {
  return Math.max(0, Math.min(1, (8 - averageRank) / 7));
}

function recommendedScore(
  rec: { averageRP: number; totalGames: number; winRate: number; averageRank: number },
  globalAvgRP: number,
  rpRange: { min: number; max: number },
): number {
  const bRP = bayesianRP(rec.averageRP, rec.totalGames, globalAvgRP);
  const span = rpRange.max - rpRange.min || 1;
  const normRP = Math.max(0, Math.min(1, (bRP - rpRange.min) / span));
  return 0.6 * normRP + 0.3 * wilsonLower(rec.winRate, rec.totalGames) + 0.1 * rankScore(rec.averageRank);
}

function sortAggregated<T extends { averageRP: number; winRate: number; averageRank: number; totalGames: number }>(
  rows: T[],
  sortBy: SortBy,
): void {
  if (sortBy === 'recommended') {
    const globalAvg = rows.length > 0 ? rows.reduce((sum, row) => sum + row.averageRP, 0) / rows.length : 0;
    const rpValues = rows.map((row) => row.averageRP);
    const rpRange = {
      min: rpValues.length > 0 ? Math.min(...rpValues) : 0,
      max: rpValues.length > 0 ? Math.max(...rpValues) : 0,
    };
    rows.sort((a, b) => recommendedScore(b, globalAvg, rpRange) - recommendedScore(a, globalAvg, rpRange));
    return;
  }

  rows.sort((a, b) => {
    if (sortBy === 'averageRP') return b.averageRP - a.averageRP;
    if (sortBy === 'winRate') return b.winRate - a.winRate;
    if (sortBy === 'averageRank') return a.averageRank - b.averageRank;
    return b.totalGames - a.totalGames;
  });
}

function normalizeTrioMembersByCharacter(
  members: readonly [TrioWeaponMember, TrioWeaponMember, TrioWeaponMember],
): [TrioWeaponMember, TrioWeaponMember, TrioWeaponMember] {
  return [...members].sort(
    (a, b) =>
      a.character - b.character ||
      a.weapon - b.weapon ||
      (a.mainCore ?? 0) - (b.mainCore ?? 0),
  ) as [TrioWeaponMember, TrioWeaponMember, TrioWeaponMember];
}

function trioWeaponKeyFromMembers(
  members: readonly [TrioWeaponMember, TrioWeaponMember, TrioWeaponMember],
): string {
  return members
    .map((member) => [member.character, member.weapon, member.mainCore ?? 0].join(':'))
    .join('|');
}

function buildNormalizedMembersFromSearchRow(
  row: Pick<TrioWeaponSearchRow,
    'ally1_char' | 'ally1_weapon' | 'ally1_core' |
    'ally2_char' | 'ally2_weapon' | 'ally2_core' |
    'third_char' | 'third_weapon' | 'third_core'>,
): [TrioWeaponMember, TrioWeaponMember, TrioWeaponMember] {
  return normalizeTrioMembersByCharacter([
    { character: row.ally1_char, weapon: row.ally1_weapon, mainCore: row.ally1_core },
    { character: row.ally2_char, weapon: row.ally2_weapon, mainCore: row.ally2_core },
    { character: row.third_char, weapon: row.third_weapon, mainCore: row.third_core },
  ]);
}

function buildNormalizedMembersFromTrioRow(
  row: Pick<TrioWeaponRow,
    'character1' | 'weapon_type1' | 'main_core1' |
    'character2' | 'weapon_type2' | 'main_core2' |
    'character3' | 'weapon_type3' | 'main_core3'>,
): [TrioWeaponMember, TrioWeaponMember, TrioWeaponMember] {
  return normalizeTrioMembersByCharacter([
    { character: row.character1, weapon: row.weapon_type1, mainCore: row.main_core1 },
    { character: row.character2, weapon: row.weapon_type2, mainCore: row.main_core2 },
    { character: row.character3, weapon: row.weapon_type3, mainCore: row.main_core3 },
  ]);
}

function mapSearchRowToAggregated(row: TrioWeaponSearchRow): AggregatedTrioWeapon {
  const [m1, m2, m3] = buildNormalizedMembersFromSearchRow(row);
  return {
    character1: m1.character,
    weaponType1: m1.weapon,
    character2: m2.character,
    weaponType2: m2.weapon,
    character3: m3.character,
    weaponType3: m3.weapon,
    mainCore1: m1.mainCore,
    mainCore2: m2.mainCore,
    mainCore3: m3.mainCore,
    totalGames: row.total_games,
    winRate: row.total_games > 0 ? (row.total_wins / row.total_games) * 100 : 0,
    averageRP: row.total_games > 0 ? row.total_rp / row.total_games / 3 : 0,
    averageRank: row.total_games > 0 ? row.rank_sum / row.total_games : 0,
  };
}

function aggregateSearchRows(rows: TrioWeaponSearchRow[]): AggregatedTrioWeapon[] {
  const grouped = new Map<string, TrioWeaponSearchRow>();
  for (const row of rows) {
    const key = trioWeaponKeyFromMembers(buildNormalizedMembersFromSearchRow(row));
    const existing = grouped.get(key);
    if (!existing) {
      grouped.set(key, { ...row });
    } else {
      existing.total_games += row.total_games;
      existing.total_wins += row.total_wins;
      existing.total_rp += row.total_rp;
      existing.rank_sum += row.rank_sum;
    }
  }
  return [...grouped.values()].map(mapSearchRowToAggregated);
}

function aggregateByTrioWeapon(rows: TrioWeaponRow[]): AggregatedTrioWeapon[] {
  const map = new Map<string, {
    c1: number; w1: number; c2: number; w2: number; c3: number; w3: number;
    mc1: number | null; mc2: number | null; mc3: number | null;
    totalGames: number; totalWins: number; totalRP: number; rankSum: number;
  }>();

  for (const row of rows) {
    const [m1, m2, m3] = buildNormalizedMembersFromTrioRow(row);
    const key = trioWeaponKeyFromMembers([m1, m2, m3]);
    const existing = map.get(key);
    if (!existing) {
      map.set(key, {
        c1: m1.character, w1: m1.weapon,
        c2: m2.character, w2: m2.weapon,
        c3: m3.character, w3: m3.weapon,
        mc1: m1.mainCore, mc2: m2.mainCore, mc3: m3.mainCore,
        totalGames: row.total_games,
        totalWins: row.total_wins,
        totalRP: row.total_rp,
        rankSum: row.rank_sum,
      });
    } else {
      existing.totalGames += row.total_games;
      existing.totalWins += row.total_wins;
      existing.totalRP += row.total_rp;
      existing.rankSum += row.rank_sum;
    }
  }

  return [...map.values()].map((v) => ({
    character1: v.c1,
    weaponType1: v.w1,
    character2: v.c2,
    weaponType2: v.w2,
    character3: v.c3,
    weaponType3: v.w3,
    mainCore1: v.mc1,
    mainCore2: v.mc2,
    mainCore3: v.mc3,
    totalGames: v.totalGames,
    winRate: v.totalGames > 0 ? (v.totalWins / v.totalGames) * 100 : 0,
    averageRP: v.totalGames > 0 ? v.totalRP / v.totalGames / 3 : 0,
    averageRank: v.totalGames > 0 ? v.rankSum / v.totalGames : 0,
  }));
}

function aggregateKey(row: AggregatedTrioWeapon): string {
  return trioWeaponKeyFromMembers(
    normalizeTrioMembersByCharacter([
      { character: row.character1, weapon: row.weaponType1, mainCore: row.mainCore1 },
      { character: row.character2, weapon: row.weaponType2, mainCore: row.mainCore2 },
      { character: row.character3, weapon: row.weaponType3, mainCore: row.mainCore3 },
    ]),
  );
}

function mergeAggregatedResults(results: AggregatedTrioWeapon[]): AggregatedTrioWeapon[] {
  const merged = new Map<string, {
    row: AggregatedTrioWeapon;
    totalWins: number;
    totalRP: number;
    rankSum: number;
  }>();

  for (const result of results) {
    const key = aggregateKey(result);
    const totalWins = (result.winRate * result.totalGames) / 100;
    const totalRP = result.averageRP * result.totalGames * 3;
    const rankSum = result.averageRank * result.totalGames;
    const existing = merged.get(key);
    if (!existing) {
      merged.set(key, { row: { ...result }, totalWins, totalRP, rankSum });
      continue;
    }

    existing.row.totalGames += result.totalGames;
    existing.totalWins += totalWins;
    existing.totalRP += totalRP;
    existing.rankSum += rankSum;
  }

  return [...merged.values()].map(({ row, totalWins, totalRP, rankSum }) => ({
    ...row,
    winRate: row.totalGames > 0 ? (totalWins / row.totalGames) * 100 : 0,
    averageRP: row.totalGames > 0 ? totalRP / row.totalGames / 3 : 0,
    averageRank: row.totalGames > 0 ? rankSum / row.totalGames : 0,
  }));
}

function hasExcludedTrio(row: { character1: number; character2: number; character3: number }): boolean {
  return (
    EXCLUDED_CHARACTER_CODES.has(row.character1) ||
    EXCLUDED_CHARACTER_CODES.has(row.character2) ||
    EXCLUDED_CHARACTER_CODES.has(row.character3)
  );
}

function matchesWeaponFilter(row: AggregatedTrioWeapon, charCode: number, weaponCode: number): boolean {
  return (
    (row.character1 === charCode && row.weaponType1 === weaponCode) ||
    (row.character2 === charCode && row.weaponType2 === weaponCode) ||
    (row.character3 === charCode && row.weaponType3 === weaponCode)
  );
}

function normalizeLimit(limit: number, max: number): number {
  if (isNaN(limit) || limit < 1) return 1;
  return Math.min(limit, max);
}

function isMissingRelationError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const supabaseError = error as SupabaseErrorLike;
  if (supabaseError.code === 'PGRST205' || supabaseError.code === '42P01') return true;

  const message = supabaseError.message ?? '';
  return (
    message.includes('Could not find the table') ||
    message.includes('schema cache') ||
    (message.includes('relation') && message.includes('does not exist'))
  );
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (error && typeof error === 'object' && 'message' in error) {
    return String((error as SupabaseErrorLike).message);
  }
  return String(error);
}

@Injectable()
export class StatsService {
  private readonly logger = new Logger(StatsService.name);

  constructor(
    private readonly supabase: SupabaseService,
    private readonly redis: RedisService,
  ) {}

  async getTriosWeapon(
    sortBy: SortBy,
    limit: number,
    rawChar1: number | null,
    rawChar2: number | null,
    rawWeapon1: number | null,
    rawWeapon2: number | null,
  ) {
    this.validateCharacters(rawChar1, rawChar2);
    if (this.hasExcludedSelection(rawChar1, rawChar2)) return { results: [] };

    let char1 = rawChar1;
    let char2 = rawChar2;
    let weapon1 = rawWeapon1;
    let weapon2 = rawWeapon2;
    if (char1 !== null && char2 !== null && char1 > char2) {
      [char1, char2] = [char2, char1];
      [weapon1, weapon2] = [weapon2, weapon1];
    }

    const safeLimit = normalizeLimit(limit, MAX_TRIO_WEAPON_RESPONSE_LIMIT);
    let aggregated: AggregatedTrioWeapon[];
    let isExactPairWeaponSearch = false;

    try {
      if (char1 !== null && char2 !== null && weapon1 !== null && weapon2 !== null) {
        isExactPairWeaponSearch = true;
        aggregated = await this.cachedTrioWeaponPairWeaponExact(char1, weapon1, char2, weapon2);
      } else if (char1 !== null && char2 !== null) {
        aggregated = await this.cachedTrioWeaponPair(char1, char2);
      } else if (char1 !== null) {
        aggregated = await this.cachedTrioWeaponSingle(char1);
      } else {
        aggregated = await this.cachedTrioWeaponAll();
      }
    } catch (error) {
      if (isMissingRelationError(error)) {
        this.logger.warn(`Trio weapon stats table is not available: ${getErrorMessage(error)}`);
        return { results: [] };
      }
      throw error;
    }

    let filtered = aggregated;
    if (char1 !== null && weapon1 !== null) {
      filtered = filtered.filter((row) => matchesWeaponFilter(row, char1, weapon1));
    }
    if (char2 !== null && weapon2 !== null) {
      filtered = filtered.filter((row) => matchesWeaponFilter(row, char2, weapon2));
    }

    const sorted = filtered === aggregated ? [...filtered] : filtered;
    sortAggregated(sorted, sortBy);

    return {
      results: isExactPairWeaponSearch ? sorted : sorted.slice(0, safeLimit),
    };
  }

  private validateCharacters(char1: number | null, char2: number | null) {
    if (char2 !== null && char1 === null)
      throw new BadRequestException('character2는 character1 없이 사용할 수 없습니다.');
    if (char1 !== null && char2 !== null && char1 === char2)
      throw new BadRequestException('character1과 character2는 달라야 합니다.');
  }

  private hasExcludedSelection(char1: number | null, char2: number | null) {
    return (
      (char1 !== null && EXCLUDED_CHARACTER_CODES.has(char1)) ||
      (char2 !== null && EXCLUDED_CHARACTER_CODES.has(char2))
    );
  }

  private cachedTrioWeaponPair(char1: number, char2: number) {
    return this.redis.getOrSet(
      `trio-weapon-pair:${TRIO_WEAPON_CACHE_VERSION}:${char1}:${char2}`,
      7 * 24 * 3600,
      () => this.fetchTrioWeaponPair(char1, char2),
    );
  }

  private cachedTrioWeaponPairWeaponExact(char1: number, weapon1: number, char2: number, weapon2: number) {
    return this.redis.getOrSet(
      `trio-weapon-pair-weapon-exact:${TRIO_WEAPON_CACHE_VERSION}:${char1}:${weapon1}:${char2}:${weapon2}`,
      7 * 24 * 3600,
      () => this.fetchTrioWeaponPairWeaponExact(char1, weapon1, char2, weapon2),
    );
  }

  private cachedTrioWeaponSingle(char1: number) {
    return this.redis.getOrSet(
      `trio-weapon-single:${TRIO_WEAPON_CACHE_VERSION}:${char1}`,
      7 * 24 * 3600,
      () => this.fetchTrioWeaponSingle(char1),
    );
  }

  private cachedTrioWeaponAll() {
    return this.redis.getOrSet(
      `trio-weapon-all:${TRIO_WEAPON_CACHE_VERSION}`,
      7 * 24 * 3600,
      () => this.fetchTrioWeaponAll(),
    );
  }

  private async fetchTrioWeaponPair(char1: number, char2: number) {
    const client = this.supabase.getClient();
    const rows = await this.fetchSearchPages((offset, pageEnd) =>
      client
        .from(TRIO_WEAPON_SEARCH_P10_TABLE)
        .select(TRIO_WEAPON_SEARCH_SELECT)
        .eq('ally1_char', char1)
        .eq('ally2_char', char2)
        .order('total_games', { ascending: false })
        .range(offset, pageEnd),
      TRIO_WEAPON_FULL_FETCH_LIMIT,
    );

    const baseResults = aggregateSearchRows(rows).filter((row) => !hasExcludedTrio(row));
    const supplementalResults = await this.safeFetchSupplemental(() =>
      this.fetchSupplementalTrioWeaponPair(char1, char2, TRIO_WEAPON_FULL_FETCH_LIMIT),
    );
    return mergeAggregatedResults([...baseResults, ...supplementalResults]);
  }

  private async fetchTrioWeaponPairWeaponExact(char1: number, weapon1: number, char2: number, weapon2: number) {
    const client = this.supabase.getClient();
    const rows = await this.fetchSearchPages((offset, pageEnd) =>
      client
        .from(TRIO_WEAPON_SEARCH_P10_TABLE)
        .select(TRIO_WEAPON_SEARCH_SELECT)
        .eq('ally1_char', char1)
        .eq('ally1_weapon', weapon1)
        .eq('ally2_char', char2)
        .eq('ally2_weapon', weapon2)
        .order('total_games', { ascending: false })
        .range(offset, pageEnd),
      EXACT_PAIR_WEAPON_FETCH_LIMIT,
    );

    const baseResults = aggregateSearchRows(rows).filter((row) => !hasExcludedTrio(row));
    const supplementalResults = await this.safeFetchSupplemental(() =>
      this.fetchSupplementalTrioWeaponExactPair(char1, weapon1, char2, weapon2, EXACT_PAIR_WEAPON_FETCH_LIMIT),
    );
    return mergeAggregatedResults([...baseResults, ...supplementalResults]);
  }

  private async fetchTrioWeaponSingle(char1: number) {
    const results = await Promise.all([
      this.fetchTrioWeaponSinglePosition(char1, 'ally1_char'),
      this.fetchTrioWeaponSinglePosition(char1, 'ally2_char'),
      this.fetchTrioWeaponSinglePosition(char1, 'third_char'),
    ]);
    const seen = new Set<string>();
    const dedupedRows = results.flat().filter((row) => {
      const key = trioWeaponKeyFromMembers(buildNormalizedMembersFromSearchRow(row));
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    return aggregateSearchRows(dedupedRows).filter((row) => !hasExcludedTrio(row));
  }

  private async fetchTrioWeaponSinglePosition(char1: number, column: SearchPositionColumn) {
    const client = this.supabase.getClient();
    return this.fetchSearchPages((offset, pageEnd) =>
      client
        .from(TRIO_WEAPON_SEARCH_P10_TABLE)
        .select(TRIO_WEAPON_SEARCH_SELECT)
        .eq(column, char1)
        .range(offset, pageEnd),
      TRIO_WEAPON_PARALLEL_FETCH_LIMIT,
    );
  }

  private async fetchTrioWeaponAll() {
    const client = this.supabase.getClient();
    const rows = await this.fetchSearchPages((offset, pageEnd) =>
      client
        .from(TRIO_WEAPON_SEARCH_P10_TABLE)
        .select(TRIO_WEAPON_SEARCH_SELECT)
        .order('total_games', { ascending: false })
        .range(offset, pageEnd),
      TRIO_WEAPON_FULL_FETCH_LIMIT,
    );
    return aggregateSearchRows(rows).filter((row) => !hasExcludedTrio(row));
  }

  private async fetchSearchPages(
    fetchPage: (offset: number, pageEnd: number) => PromiseLike<{ data: unknown[] | null; error: unknown }>,
    fetchLimit: number,
  ): Promise<TrioWeaponSearchRow[]> {
    const rows: TrioWeaponSearchRow[] = [];
    for (let offset = 0; offset < fetchLimit; offset += DB_PAGE_SIZE) {
      const pageEnd = Math.min(offset + DB_PAGE_SIZE, fetchLimit) - 1;
      const { data, error } = await fetchPage(offset, pageEnd);
      if (error) throw error;
      const pageRows = (data ?? []) as TrioWeaponSearchRow[];
      rows.push(...pageRows);
      if (pageRows.length < DB_PAGE_SIZE) break;
    }
    return rows;
  }

  private async fetchSupplementalTrioWeaponPair(char1: number, char2: number, fetchLimit: number) {
    const rows = (
      await Promise.all(
        TRIO_WEAPON_PAIR_POSITIONS.map((position) =>
          this.fetchSupplementalTrioWeaponPairPosition(char1, char2, position, fetchLimit),
        ),
      )
    ).flat();
    return aggregateByTrioWeapon(rows).filter((row) => !hasExcludedTrio(row));
  }

  private async fetchSupplementalTrioWeaponExactPair(
    char1: number,
    weapon1: number,
    char2: number,
    weapon2: number,
    fetchLimit: number,
  ) {
    const rows = (
      await Promise.all(
        TRIO_WEAPON_PAIR_POSITIONS.map((position) =>
          this.fetchSupplementalTrioWeaponExactPairPosition(char1, weapon1, char2, weapon2, position, fetchLimit),
        ),
      )
    ).flat();
    return aggregateByTrioWeapon(rows).filter((row) => !hasExcludedTrio(row));
  }

  private async fetchSupplementalTrioWeaponPairPosition(
    char1: number,
    char2: number,
    position: TrioWeaponPairPosition,
    fetchLimit: number,
  ) {
    const client = this.supabase.getClient();
    return this.fetchTrioWeaponPages((offset, pageEnd) =>
      client
        .from(TRIO_WEAPON_TABLE)
        .select(TRIO_WEAPON_SELECT)
        .in('patch_version', SUPPLEMENTAL_PATCH_VERSIONS)
        .in('tier', DIAMOND_PLUS_TIERS)
        .eq(position.charColumn1, char1)
        .eq(position.charColumn2, char2)
        .range(offset, pageEnd),
      fetchLimit,
    );
  }

  private async fetchSupplementalTrioWeaponExactPairPosition(
    char1: number,
    weapon1: number,
    char2: number,
    weapon2: number,
    position: TrioWeaponPairPosition,
    fetchLimit: number,
  ) {
    const client = this.supabase.getClient();
    return this.fetchTrioWeaponPages((offset, pageEnd) =>
      client
        .from(TRIO_WEAPON_TABLE)
        .select(TRIO_WEAPON_SELECT)
        .in('patch_version', SUPPLEMENTAL_PATCH_VERSIONS)
        .in('tier', DIAMOND_PLUS_TIERS)
        .eq(position.charColumn1, char1)
        .eq(position.weaponColumn1, weapon1)
        .eq(position.charColumn2, char2)
        .eq(position.weaponColumn2, weapon2)
        .range(offset, pageEnd),
      fetchLimit,
    );
  }

  private async fetchTrioWeaponPages(
    fetchPage: (offset: number, pageEnd: number) => PromiseLike<{ data: unknown[] | null; error: unknown }>,
    fetchLimit: number,
  ): Promise<TrioWeaponRow[]> {
    const rows: TrioWeaponRow[] = [];
    for (let offset = 0; offset < fetchLimit; offset += DB_PAGE_SIZE) {
      const pageEnd = Math.min(offset + DB_PAGE_SIZE, fetchLimit) - 1;
      const { data, error } = await fetchPage(offset, pageEnd);
      if (error) throw error;
      const pageRows = (data ?? []) as TrioWeaponRow[];
      rows.push(...pageRows);
      if (pageRows.length < DB_PAGE_SIZE) break;
    }
    return rows;
  }

  private async safeFetchSupplemental(fetcher: () => Promise<AggregatedTrioWeapon[]>) {
    try {
      return await fetcher();
    } catch {
      return [];
    }
  }
}
