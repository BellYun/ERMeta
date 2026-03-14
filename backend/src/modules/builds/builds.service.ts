import { Injectable } from '@nestjs/common';
import { SupabaseService } from '../../common/database/supabase.service';

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
  sub1: number | null;
  sub2: number | null;
  sub3: number | null;
  sub4: number | null;
  totalGames: number;
  totalWins: number;
};

type TraitSubKey = 'sub1' | 'sub2' | 'sub3' | 'sub4';

function aggregateSubOptions(
  rows: TraitGroupRow[],
  subKey: TraitSubKey,
  groupTotalGames: number,
  options: { excludeNull?: boolean; limit?: number } = {},
) {
  const { excludeNull = false, limit = 5 } = options;
  const subMap = new Map<string, { code: number | null; games: number; wins: number }>();

  for (const row of rows) {
    const code = row[subKey];
    if (excludeNull && code == null) continue;
    const key = String(code ?? 'null');
    const existing = subMap.get(key);
    if (existing) {
      existing.games += row.totalGames;
      existing.wins += row.totalWins;
    } else {
      subMap.set(key, { code, games: row.totalGames, wins: row.totalWins });
    }
  }

  return [...subMap.values()]
    .sort((a, b) => b.games - a.games)
    .slice(0, limit)
    .map((o) => ({
      code: o.code,
      totalGames: o.games,
      pickRate: groupTotalGames > 0 ? (o.games / groupTotalGames) * 100 : 0,
      winRate: o.games > 0 ? (o.wins / o.games) * 100 : 0,
    }));
}

@Injectable()
export class BuildsService {
  constructor(private readonly supabase: SupabaseService) {}

  async getEquipmentBuilds(
    characterCode: number,
    tier: string,
    patchVersion: string,
    mainCoreParam?: string,
    bestWeaponParam?: string,
  ) {
    const empty = {
      topBuilds: [],
      slotPopularity: { weapon: [], chest: [], head: [], arm: [], leg: [] },
      coreItems: [],
    };

    if (!characterCode || isNaN(characterCode)) return empty;

    const client = this.supabase.getClient();

    let query = client
      .from('CharacterEquipmentBuildStats')
      .select('mainCore,weapon,chest,head,arm,leg,totalGames,totalWins,rankSum,totalRP')
      .eq('characterNum', characterCode)
      .eq('tier', tier)
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
      .limit(200);

    if (error || !data || data.length === 0) return empty;

    const rows = data as EquipmentRow[];
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

    const client = this.supabase.getClient();

    let query = client
      .from('CharacterTraitBuildStats')
      .select('*')
      .eq('characterNum', characterCode)
      .eq('patchVersion', patchVersion)
      .eq('tier', tier)
      .order('totalGames', { ascending: false })
      .limit(50);

    if (bestWeapon) query = query.eq('bestWeapon', Number(bestWeapon));

    const { data, error } = await query;
    if (error || !data || data.length === 0) return { builds: [] };

    const grandTotal = data.reduce(
      (sum: number, r: Record<string, unknown>) => sum + ((r.totalGames as number) ?? 0), 0,
    );

    const coreMap = new Map<string, { mainCore: number | null; rows: TraitGroupRow[] }>();

    for (const r of data as Record<string, unknown>[]) {
      const mainCore = (r.mainCore as number | null) ?? null;
      const row: TraitGroupRow = {
        sub1: (r.sub1 as number | null) ?? null,
        sub2: (r.sub2 as number | null) ?? null,
        sub3: (r.sub3 as number | null) ?? null,
        sub4: (r.sub4 as number | null) ?? null,
        totalGames: (r.totalGames as number) ?? 0,
        totalWins: (r.totalWins as number) ?? 0,
      };

      const key = String(mainCore ?? 'null');
      const existing = coreMap.get(key);
      if (existing) {
        existing.rows.push(row);
      } else {
        coreMap.set(key, { mainCore, rows: [row] });
      }
    }

    const builds = [];
    for (const group of coreMap.values()) {
      const groupTotalGames = group.rows.reduce((s, r) => s + r.totalGames, 0);
      const groupTotalWins = group.rows.reduce((s, r) => s + r.totalWins, 0);

      builds.push({
        mainCore: group.mainCore,
        totalGames: groupTotalGames,
        groupPickRate: grandTotal > 0 ? (groupTotalGames / grandTotal) * 100 : 0,
        groupWinRate: groupTotalGames > 0 ? (groupTotalWins / groupTotalGames) * 100 : 0,
        sub1Options: aggregateSubOptions(group.rows, 'sub1', groupTotalGames),
        sub2Options: aggregateSubOptions(group.rows, 'sub2', groupTotalGames),
        sub3Options: aggregateSubOptions(group.rows, 'sub3', groupTotalGames, { excludeNull: true }),
        sub4Options: aggregateSubOptions(group.rows, 'sub4', groupTotalGames, { excludeNull: true }),
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

    const client = this.supabase.getClient();

    let query = client
      .from('CharacterTraitBuildStats')
      .select('*')
      .eq('characterNum', characterCode)
      .eq('patchVersion', patchVersion)
      .eq('tier', tier)
      .order('totalGames', { ascending: false })
      .limit(50);

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

    const rows = data as TraitGroupRow[];
    const groupTotalGames = rows.reduce((s, r) => s + r.totalGames, 0);

    return {
      options: {
        sub1: aggregateSubOptions(rows, 'sub1', groupTotalGames),
        sub2: aggregateSubOptions(rows, 'sub2', groupTotalGames),
        sub3: aggregateSubOptions(rows, 'sub3', groupTotalGames, { excludeNull: true }),
        sub4: aggregateSubOptions(rows, 'sub4', groupTotalGames, { excludeNull: true }),
      },
    };
  }
}
