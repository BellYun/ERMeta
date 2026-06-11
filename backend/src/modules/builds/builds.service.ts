import { Injectable } from '@nestjs/common';
import itemGradeMap from './data/itemGradeMap.json';
import weaponItemTypeMap from './data/weaponItemTypeMap.json';
import { SupabaseService } from '../../common/database/supabase.service';
import { RedisService } from '../../common/redis/redis.service';

const ITEM_GRADE = itemGradeMap as Record<string, string>;
const WEAPON_ITEM_TYPE = weaponItemTypeMap as Record<string, number>;
const TIER_CUMULATIVE: Record<string, string[]> = {
  PLATINUM_PLUS: ['PLATINUM', 'DIAMOND', 'METEORITE', 'MITHRIL'],
  DIAMOND_PLUS: ['DIAMOND', 'METEORITE', 'MITHRIL'],
  METEORITE_PLUS: ['METEORITE', 'MITHRIL'],
  MITHRIL_PLUS: ['MITHRIL'],
  IN1000_PLUS: ['IN1000'],
};

type EquipmentRow = {
  mainCore: number | null;
  weapon: number | null;
  chest: number | null;
  head: number | null;
  arm: number | null;
  leg: number | null;
  totalGames: number;
  totalWins: number;
  rankSum: number;
  totalRP: number;
};

type SlotKey = 'weapon' | 'chest' | 'head' | 'arm' | 'leg';

function expandCumulativeTier(tier: string): string[] {
  return TIER_CUMULATIVE[tier] ?? [tier];
}

function isLegendItem(code: number | null): boolean {
  if (code == null) return false;
  return ITEM_GRADE[String(code)] === 'Legend';
}

function isFullLegendBuild(row: EquipmentRow): boolean {
  return (
    isLegendItem(row.weapon) &&
    isLegendItem(row.chest) &&
    isLegendItem(row.head) &&
    isLegendItem(row.arm) &&
    isLegendItem(row.leg)
  );
}

function aggregateSlot(
  rows: EquipmentRow[],
  slot: SlotKey,
  slotTotal: number,
  limit = 5,
) {
  const map = new Map<number, { games: number; wins: number }>();
  for (const row of rows) {
    const code = row[slot];
    if (code == null) continue;
    const existing = map.get(code);
    if (existing) {
      existing.games += row.totalGames;
      existing.wins += row.totalWins;
    } else {
      map.set(code, { games: row.totalGames, wins: row.totalWins });
    }
  }
  return [...map.entries()]
    .sort((a, b) => b[1].games - a[1].games)
    .slice(0, limit)
    .map(([code, { games, wins }]) => ({
      code,
      totalGames: games,
      pickRate: slotTotal > 0 ? (games / slotTotal) * 100 : 0,
      winRate: games > 0 ? (wins / games) * 100 : 0,
    }));
}

type TraitGroupRow = {
  mainCore: number | null;
  sub1: number | null;
  sub2: number | null;
  optionTrait1: number | null;
  optionTrait2: number | null;
  totalGames: number;
  totalWins: number;
};

type TraitGroup = 'havoc' | 'fortification' | 'support' | 'chaos' | 'unknown';
type TraitKey = 'mainCore' | 'sub1' | 'sub2' | 'optionTrait1' | 'optionTrait2';

const TRAIT_CORES: Record<TraitGroup, number[]> = {
  havoc: [7000201, 7000401, 7000601, 7000701],
  fortification: [7100101, 7100201, 7100401, 7100501],
  support: [7200101, 7200201, 7200301, 7200501],
  chaos: [7000501, 7300101, 7300201, 7300301],
  unknown: [],
};

const TRAIT_SUBS_SLOT1: Record<TraitGroup, number[]> = {
  havoc: [7010501, 7010901, 7011001, 7011501],
  fortification: [7110101, 7111001, 7110701, 7111101],
  support: [7211001, 7210101, 7211401, 7211301],
  chaos: [7310201, 7010701, 7310401, 7310601],
  unknown: [],
};

const TRAIT_SUBS_SLOT2: Record<TraitGroup, number[]> = {
  havoc: [7011101, 7011201, 7011301, 7011401],
  fortification: [7110401, 7110601, 7110201, 7111201],
  support: [7210401, 7211101, 7210801, 7110801],
  chaos: [7310101, 7310301, 7310501],
  unknown: [],
};

function getTraitGroup(code: number | null): TraitGroup {
  if (code == null) return 'unknown';
  if (code === 7000501) return 'chaos';
  const sub = Math.floor(code / 100);
  if (sub === 70107) return 'chaos';
  if (sub === 71108) return 'support';
  const prefix = Math.floor(code / 100000);
  if (prefix === 70) return 'havoc';
  if (prefix === 71) return 'fortification';
  if (prefix === 72) return 'support';
  if (prefix === 73) return 'chaos';
  return 'unknown';
}

function aggregateTraitOptions(
  rows: TraitGroupRow[],
  keys: TraitKey | TraitKey[],
  groupTotalGames: number,
  options: { excludeNull?: boolean; allCodes?: number[] } = {},
) {
  const { excludeNull = false, allCodes } = options;
  const codeSet = allCodes ? new Set(allCodes.map(String)) : null;
  const map = new Map<string, { code: number | null; games: number; wins: number }>();

  if (allCodes) {
    for (const code of allCodes) {
      map.set(String(code), { code, games: 0, wins: 0 });
    }
  }

  const keyList = Array.isArray(keys) ? keys : [keys];

  for (const row of rows) {
    for (const key of keyList) {
      const code = row[key];
      if (excludeNull && code == null) continue;

      const mapKey = String(code ?? 'null');
      if (codeSet && !codeSet.has(mapKey)) continue;

      const existing = map.get(mapKey);
      if (existing) {
        existing.games += row.totalGames;
        existing.wins += row.totalWins;
      } else if (!codeSet) {
        map.set(mapKey, { code, games: row.totalGames, wins: row.totalWins });
      }
    }
  }

  return [...map.values()].map((o) => ({
      code: o.code,
      totalGames: o.games,
      pickRate: groupTotalGames > 0 ? (o.games / groupTotalGames) * 100 : 0,
      winRate: o.games > 0 ? (o.wins / o.games) * 100 : 0,
  }));
}

@Injectable()
export class BuildsService {
  constructor(
    private readonly supabase: SupabaseService,
    private readonly redis: RedisService,
  ) {}

  async getEquipmentBuilds(
    characterCode: number,
    tier: string,
    patchVersion: string,
    mainCoreParam?: string,
    bestWeaponParam?: string,
    legendOnly = false,
  ) {
    const empty = {
      topBuilds: [],
      slotPopularity: { weapon: [], chest: [], head: [], arm: [], leg: [] },
      coreItems: [],
    };

    if (!characterCode || isNaN(characterCode)) return empty;

    const cacheKey = `builds:equip:${characterCode}:${tier}:${patchVersion}:${mainCoreParam ?? 'all'}:${bestWeaponParam ?? 'all'}:${legendOnly ? 'legend' : 'all'}`;
    return this.redis.getOrSet(cacheKey, 1800, () =>
      this._getEquipmentBuilds(
        characterCode,
        tier,
        patchVersion,
        mainCoreParam,
        bestWeaponParam,
        legendOnly,
      ),
    );
  }

  private async _getEquipmentBuilds(
    characterCode: number,
    tier: string,
    patchVersion: string,
    mainCoreParam?: string,
    bestWeaponParam?: string,
    legendOnly = false,
  ) {
    const empty = {
      topBuilds: [],
      slotPopularity: { weapon: [], chest: [], head: [], arm: [], leg: [] },
      coreItems: [],
    };

    const client = this.supabase.getClient();

    let query = client
      .from('v2_CharacterEquipmentBuildStats')
      .select('mainCore,weapon,chest,head,arm,leg,totalGames,totalWins,rankSum,totalRP')
      .eq('characterNum', characterCode)
      .in('tier', expandCumulativeTier(tier))
      .eq('patchVersion', patchVersion);

    if (mainCoreParam != null) {
      if (mainCoreParam === 'null') {
        query = query.is('mainCore', null) as typeof query;
      } else {
        query = query.eq('mainCore', Number(mainCoreParam)) as typeof query;
      }
    }

    const { data, error } = await query
      .order('totalGames', { ascending: false })
      .limit(legendOnly ? 1000 : 200);

    if (error || !data || data.length === 0) return empty;

    let rows = data as EquipmentRow[];

    if (bestWeaponParam != null) {
      const targetType = Number(bestWeaponParam);
      rows = rows.filter((row) => {
        if (row.weapon == null) return false;
        return WEAPON_ITEM_TYPE[String(row.weapon)] === targetType;
      });
    }

    if (legendOnly) {
      rows = rows.filter(isFullLegendBuild);
    }

    if (rows.length === 0) return empty;

    const grandTotal = rows.reduce((s, r) => s + r.totalGames, 0);

    // topBuilds
    const buildMap = new Map<string, {
      mainCore: number | null; weapon: number | null; chest: number | null;
      head: number | null; arm: number | null; leg: number | null;
      games: number; wins: number; rankSum: number; rpSum: number;
    }>();

    for (const row of rows) {
      const key = `${row.mainCore ?? ''}|${row.weapon ?? ''}|${row.chest ?? ''}|${row.head ?? ''}|${row.arm ?? ''}|${row.leg ?? ''}`;
      const existing = buildMap.get(key);
      if (existing) {
        existing.games += row.totalGames;
        existing.wins += row.totalWins;
        existing.rankSum += row.rankSum;
        existing.rpSum += row.totalRP;
      } else {
        buildMap.set(key, {
          mainCore: row.mainCore, weapon: row.weapon, chest: row.chest,
          head: row.head, arm: row.arm, leg: row.leg,
          games: row.totalGames, wins: row.totalWins,
          rankSum: row.rankSum, rpSum: row.totalRP,
        });
      }
    }

    const topBuilds = [...buildMap.values()]
      .sort((a, b) => b.games - a.games)
      .slice(0, 5)
      .map((b) => ({
        mainCore: b.mainCore, weapon: b.weapon, chest: b.chest,
        head: b.head, arm: b.arm, leg: b.leg,
        totalGames: b.games,
        pickRate: grandTotal > 0 ? (b.games / grandTotal) * 100 : 0,
        winRate: b.games > 0 ? (b.wins / b.games) * 100 : 0,
        averageRank: b.games > 0 ? b.rankSum / b.games : 0,
        averageRP: b.games > 0 ? b.rpSum / b.games : 0,
      }));

    // slotPopularity
    const slots: SlotKey[] = ['weapon', 'chest', 'head', 'arm', 'leg'];
    const slotPopularity: Record<string, unknown[]> = {};
    for (const slot of slots) {
      const slotTotal = rows.reduce((s, r) => s + (r[slot] != null ? r.totalGames : 0), 0);
      slotPopularity[slot] = aggregateSlot(rows, slot, slotTotal);
    }

    // coreItems
    const coreMap = new Map<number, { games: number; wins: number }>();
    for (const row of rows) {
      for (const slot of slots) {
        const code = row[slot];
        if (code == null) continue;
        const existing = coreMap.get(code);
        if (existing) {
          existing.games += row.totalGames;
          existing.wins += row.totalWins;
        } else {
          coreMap.set(code, { games: row.totalGames, wins: row.totalWins });
        }
      }
    }

    const coreItems = [...coreMap.entries()]
      .sort((a, b) => b[1].games - a[1].games)
      .slice(0, 5)
      .map(([code, { games, wins }]) => ({
        code,
        totalGames: games,
        pickRate: grandTotal > 0 ? (games / grandTotal) * 100 : 0,
        winRate: games > 0 ? (wins / games) * 100 : 0,
      }));

    return { topBuilds, slotPopularity, coreItems };
  }

  async getTraitsMain(
    characterCode: number,
    tier: string,
    patchVersion: string,
    bestWeapon?: string,
  ) {
    if (!characterCode || isNaN(characterCode)) return { builds: [] };

    const cacheKey = `builds:trait:${characterCode}:${tier}:${patchVersion}:${bestWeapon ?? 'all'}`;
    return this.redis.getOrSet(cacheKey, 1800, () =>
      this._getTraitsMain(characterCode, tier, patchVersion, bestWeapon),
    );
  }

  private async _getTraitsMain(
    characterCode: number,
    tier: string,
    patchVersion: string,
    bestWeapon?: string,
  ) {
    const client = this.supabase.getClient();

    let query = client
      .from('v2_CharacterTraitBuildStats')
      .select('*')
      .eq('characterNum', characterCode)
      .eq('patchVersion', patchVersion)
      .in('tier', expandCumulativeTier(tier))
      .order('totalGames', { ascending: false });

    if (bestWeapon) query = query.eq('bestWeapon', Number(bestWeapon));

    const { data, error } = await query;
    if (error || !data || data.length === 0) return { builds: [] };

    const grandTotal = data.reduce(
      (sum: number, r: Record<string, unknown>) => sum + ((r.totalGames as number) ?? 0), 0,
    );

    const mainMap = new Map<TraitGroup, TraitGroupRow[]>();

    for (const r of data as Record<string, unknown>[]) {
      const row: TraitGroupRow = {
        mainCore: (r.mainCore as number | null) ?? null,
        sub1: (r.sub1 as number | null) ?? null,
        sub2: (r.sub2 as number | null) ?? null,
        optionTrait1: (r.optionTrait1 as number | null) ?? null,
        optionTrait2: (r.optionTrait2 as number | null) ?? null,
        totalGames: (r.totalGames as number) ?? 0,
        totalWins: (r.totalWins as number) ?? 0,
      };

      const mainGroup = getTraitGroup(row.mainCore);
      const existing = mainMap.get(mainGroup);
      if (existing) existing.push(row);
      else mainMap.set(mainGroup, [row]);
    }

    const builds = [];
    for (const [mainGroup, rows] of mainMap) {
      const mainTotal = rows.reduce((s, r) => s + r.totalGames, 0);
      const mainWins = rows.reduce((s, r) => s + r.totalWins, 0);
      const secMap = new Map<TraitGroup, TraitGroupRow[]>();

      for (const row of rows) {
        const secGroup = getTraitGroup(row.optionTrait1);
        const existing = secMap.get(secGroup);
        if (existing) existing.push(row);
        else secMap.set(secGroup, [row]);
      }

      const allGroups = (['havoc', 'fortification', 'support', 'chaos'] as TraitGroup[])
        .filter((group) => group !== mainGroup);
      const secondaries = [];

      for (const secGroup of allGroups) {
        const secRows = secMap.get(secGroup);
        if (secRows && secRows.length > 0) {
          const secTotal = secRows.reduce((s, r) => s + r.totalGames, 0);
          const secWins = secRows.reduce((s, r) => s + r.totalWins, 0);
          secondaries.push({
            secGroup,
            totalGames: secTotal,
            pickRate: mainTotal > 0 ? (secTotal / mainTotal) * 100 : 0,
            winRate: secTotal > 0 ? (secWins / secTotal) * 100 : 0,
            optionTrait1Options: aggregateTraitOptions(
              secRows,
              ['optionTrait1', 'optionTrait2'],
              secTotal,
              { excludeNull: true, allCodes: TRAIT_SUBS_SLOT1[secGroup] },
            ),
            optionTrait2Options: aggregateTraitOptions(
              secRows,
              ['optionTrait1', 'optionTrait2'],
              secTotal,
              { excludeNull: true, allCodes: TRAIT_SUBS_SLOT2[secGroup] },
            ),
          });
        } else {
          secondaries.push({
            secGroup,
            totalGames: 0,
            pickRate: 0,
            winRate: 0,
            optionTrait1Options: [],
            optionTrait2Options: [],
          });
        }
      }

      builds.push({
        mainGroup,
        totalGames: mainTotal,
        groupPickRate: grandTotal > 0 ? (mainTotal / grandTotal) * 100 : 0,
        groupWinRate: mainTotal > 0 ? (mainWins / mainTotal) * 100 : 0,
        mainCoreOptions: aggregateTraitOptions(rows, 'mainCore', mainTotal, {
          allCodes: TRAIT_CORES[mainGroup],
        }),
        sub1Options: aggregateTraitOptions(rows, ['sub1', 'sub2'], mainTotal, {
          allCodes: TRAIT_SUBS_SLOT1[mainGroup],
        }),
        sub2Options: aggregateTraitOptions(rows, ['sub1', 'sub2'], mainTotal, {
          allCodes: TRAIT_SUBS_SLOT2[mainGroup],
        }),
        secondaries,
      });
    }

    builds.sort((a, b) => b.totalGames - a.totalGames);
    return { builds: builds.slice(0, 5) };
  }

  async getTraitsOptions(
    characterCode: number,
    tier: string,
    patchVersion: string,
    bestWeapon?: string,
    mainCore?: string,
  ) {
    if (!characterCode || isNaN(characterCode)) return { options: [] };

    const cacheKey = `builds:trait-opt:${characterCode}:${tier}:${patchVersion}:${bestWeapon ?? 'all'}:${mainCore ?? 'all'}`;
    return this.redis.getOrSet(cacheKey, 1800, () =>
      this._getTraitsOptions(characterCode, tier, patchVersion, bestWeapon, mainCore),
    );
  }

  private async _getTraitsOptions(
    characterCode: number,
    tier: string,
    patchVersion: string,
    bestWeapon?: string,
    mainCore?: string,
  ) {
    const client = this.supabase.getClient();

    let query = client
      .from('v2_CharacterTraitBuildStats')
      .select('*')
      .eq('characterNum', characterCode)
      .eq('patchVersion', patchVersion)
      .in('tier', expandCumulativeTier(tier))
      .order('totalGames', { ascending: false })
      .limit(100);

    if (bestWeapon) query = query.eq('bestWeapon', Number(bestWeapon));
    if (mainCore != null) {
      if (mainCore === 'null') {
        query = query.is('mainCore', null) as typeof query;
      } else {
        query = query.eq('mainCore', Number(mainCore)) as typeof query;
      }
    }

    const { data, error } = await query;
    if (error || !data || data.length === 0) return { options: [] };

    const grandTotal = data.reduce(
      (sum: number, r: Record<string, unknown>) => sum + ((r.totalGames as number) ?? 0),
      0,
    );

    const grouped = new Map<string, { traits: number[]; games: number; wins: number }>();
    for (const row of data as Record<string, unknown>[]) {
      const traits: number[] = [];
      for (let i = 1; i <= 2; i++) {
        const code = row[`optionTrait${i}`] as number | null | undefined;
        if (code) traits.push(code);
      }

      const key = traits.join(':');
      const games = (row.totalGames as number) ?? 0;
      const wins = (row.totalWins as number) ?? 0;
      const existing = grouped.get(key);
      if (existing) {
        existing.games += games;
        existing.wins += wins;
      } else {
        grouped.set(key, { traits, games, wins });
      }
    }

    const options = [...grouped.values()]
      .sort((a, b) => b.games - a.games)
      .slice(0, 10)
      .map((option) => ({
        traits: option.traits,
        totalGames: option.games,
        pickRate: grandTotal > 0 ? (option.games / grandTotal) * 100 : 0,
        winRate: option.games > 0 ? (option.wins / option.games) * 100 : 0,
      }));

    return { options };
  }
}
