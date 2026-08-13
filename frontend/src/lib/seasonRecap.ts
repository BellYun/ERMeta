import { type ChangeType, getCharacterPatchNote } from "@/data/patch-notes";
import { type CharacterRole, getComboRoles, isWeaponAgnosticCharacter } from "@/lib/characterMap";
import { createServerClient } from "@/lib/supabase";

const DIAMOND_PLUS_TIERS = ["MITHRIL", "METEORITE", "DIAMOND", "IN1000"];
const ROLES: CharacterRole[] = ["탱커", "전사", "암살자", "스킬딜러", "원거리 딜러", "지원가"];

export interface RecapEntry {
  characterNum: number;
  bestWeapon: number;
  totalGames: number;
  totalWins: number;
  totalRP: number;
  averageRP: number;
  winRate: number;
}

export interface PatchTopGroup {
  patch: string;
  entries: RecapEntry[];
}

export interface PerPatchStat {
  patch: string;
  totalGames: number;
  totalWins: number;
  averageRP: number;
  winRate: number;
}

export interface TierRpTrend {
  totalGames: number;
  totalWins: number;
  totalRP: number;
  averageRP: number;
  winRate: number;
  perPatch: PerPatchStat[];
}

export interface TierRpTrends {
  diamondPlus: TierRpTrend;
  mithrilPlus: TierRpTrend;
}

export interface ComboTierAggregate extends RecapEntry {
  perPatch: PerPatchStat[];
}

export interface RecapPatchChange {
  changeType: ChangeType;
  target: string;
  description: string;
  valueSummary?: string;
}

export interface RecapPatchNote {
  patch: string;
  changes: RecapPatchChange[];
}

export interface SeasonAggregateEntry extends RecapEntry {
  topAppearances: number;
  patchesActive: number;
  perPatch: PerPatchStat[];
  mithrilPlus: ComboTierAggregate | null;
  patchNotes: RecapPatchNote[];
}

export interface RoleStat {
  totalGames: number;
  averageRP: number;
}

export interface RoleAggregate {
  role: CharacterRole;
  perPatch: Array<{ patch: string; stat: RoleStat | null }>;
  season: RoleStat | null;
}

export interface RoleStatsByTier {
  diamondPlus: RoleAggregate[];
  mithrilPlus: RoleAggregate[];
}

export interface SeasonRecapData {
  patches: string[];
  perPatchTop: PatchTopGroup[];
  seasonTop: SeasonAggregateEntry[];
  roleStatsByTier: RoleStatsByTier;
  tierRpTrends: TierRpTrends;
}

interface StatRow {
  patchVersion: string;
  characterNum: number;
  bestWeapon: number;
  tier: string;
  totalGames: number | null;
  totalWins: number | null;
  totalRP: number | null;
}

function normalizeWeapon(character: number, weapon: number): number {
  return isWeaponAgnosticCharacter(character) ? 0 : weapon;
}

function comboKey(character: number, weapon: number): number {
  return character * 1000 + normalizeWeapon(character, weapon);
}

function aggregateByCombo(rows: StatRow[]): RecapEntry[] {
  const map = new Map<
    number,
    { character: number; weapon: number; games: number; wins: number; rp: number }
  >();

  for (const r of rows) {
    const weapon = normalizeWeapon(r.characterNum, r.bestWeapon);
    const key = comboKey(r.characterNum, weapon);
    const cur = map.get(key) ?? {
      character: r.characterNum,
      weapon,
      games: 0,
      wins: 0,
      rp: 0,
    };
    cur.games += r.totalGames ?? 0;
    cur.wins += r.totalWins ?? 0;
    cur.rp += r.totalRP ?? 0;
    map.set(key, cur);
  }

  return [...map.values()]
    .filter((v) => v.games > 0)
    .map((v) => ({
      characterNum: v.character,
      bestWeapon: v.weapon,
      totalGames: v.games,
      totalWins: v.wins,
      totalRP: v.rp,
      averageRP: v.rp / v.games,
      winRate: (v.wins / v.games) * 100,
    }));
}

function buildPerPatchComboMap(
  rows: StatRow[]
): Map<string, Map<number, { games: number; wins: number; rp: number }>> {
  const result = new Map<string, Map<number, { games: number; wins: number; rp: number }>>();

  for (const row of rows) {
    const games = row.totalGames ?? 0;
    if (games === 0) continue;

    const key = comboKey(row.characterNum, row.bestWeapon);
    let patchMap = result.get(row.patchVersion);
    if (!patchMap) {
      patchMap = new Map();
      result.set(row.patchVersion, patchMap);
    }

    const current = patchMap.get(key) ?? { games: 0, wins: 0, rp: 0 };
    current.games += games;
    current.wins += row.totalWins ?? 0;
    current.rp += row.totalRP ?? 0;
    patchMap.set(key, current);
  }

  return result;
}

function buildPerPatchStats(
  patches: string[],
  perPatchComboMap: Map<string, Map<number, { games: number; wins: number; rp: number }>>,
  key: number
): PerPatchStat[] {
  return patches.flatMap((patch) => {
    const stat = perPatchComboMap.get(patch)?.get(key);
    return stat
      ? [
          {
            patch,
            totalGames: stat.games,
            totalWins: stat.wins,
            averageRP: stat.rp / stat.games,
            winRate: (stat.wins / stat.games) * 100,
          },
        ]
      : [];
  });
}

function buildTierRpTrend(rows: StatRow[], patches: string[]): TierRpTrend {
  const perPatch = patches.map((patch) => {
    const patchRows = rows.filter((row) => row.patchVersion === patch);
    const totalGames = patchRows.reduce((sum, row) => sum + (row.totalGames ?? 0), 0);
    const totalWins = patchRows.reduce((sum, row) => sum + (row.totalWins ?? 0), 0);
    const totalRP = patchRows.reduce((sum, row) => sum + (row.totalRP ?? 0), 0);

    return {
      patch,
      totalGames,
      totalWins,
      averageRP: totalGames > 0 ? totalRP / totalGames : 0,
      winRate: totalGames > 0 ? (totalWins / totalGames) * 100 : 0,
    };
  });
  const totalGames = perPatch.reduce((sum, stat) => sum + stat.totalGames, 0);
  const totalWins = perPatch.reduce((sum, stat) => sum + stat.totalWins, 0);
  const totalRP = rows.reduce((sum, row) => sum + (row.totalRP ?? 0), 0);

  return {
    totalGames,
    totalWins,
    totalRP,
    averageRP: totalGames > 0 ? totalRP / totalGames : 0,
    winRate: totalGames > 0 ? (totalWins / totalGames) * 100 : 0,
    perPatch,
  };
}

function emptyTierRpTrend(): TierRpTrend {
  return {
    totalGames: 0,
    totalWins: 0,
    totalRP: 0,
    averageRP: 0,
    winRate: 0,
    perPatch: [],
  };
}

function buildRoleStats(rows: StatRow[], patches: string[]): RoleAggregate[] {
  // 한 실험체+무기 조합이 복수 직업군에 매핑되면 각 직업군 버킷에 모두 반영한다.
  const rolePatchTotals = new Map<CharacterRole, Map<string, { games: number; rp: number }>>();
  const roleSeasonTotals = new Map<CharacterRole, { games: number; rp: number }>();

  for (const row of rows) {
    const games = row.totalGames ?? 0;
    if (games === 0) continue;

    const rp = row.totalRP ?? 0;
    const roles = getComboRoles(row.characterNum, row.bestWeapon);
    if (roles.length === 0) continue;

    for (const role of roles) {
      let patchMap = rolePatchTotals.get(role);
      if (!patchMap) {
        patchMap = new Map();
        rolePatchTotals.set(role, patchMap);
      }

      const patchTotal = patchMap.get(row.patchVersion) ?? { games: 0, rp: 0 };
      patchTotal.games += games;
      patchTotal.rp += rp;
      patchMap.set(row.patchVersion, patchTotal);

      const seasonTotal = roleSeasonTotals.get(role) ?? { games: 0, rp: 0 };
      seasonTotal.games += games;
      seasonTotal.rp += rp;
      roleSeasonTotals.set(role, seasonTotal);
    }
  }

  return ROLES.map((role) => {
    const patchMap = rolePatchTotals.get(role);
    const perPatch = patches.map((patch) => {
      const total = patchMap?.get(patch);
      return {
        patch,
        stat:
          total && total.games > 0
            ? { totalGames: total.games, averageRP: total.rp / total.games }
            : null,
      };
    });
    const seasonTotal = roleSeasonTotals.get(role);
    const season =
      seasonTotal && seasonTotal.games > 0
        ? {
            totalGames: seasonTotal.games,
            averageRP: seasonTotal.rp / seasonTotal.games,
          }
        : null;

    return { role, perPatch, season };
  });
}

function emptySeasonRecapData(): SeasonRecapData {
  return {
    patches: [],
    perPatchTop: [],
    seasonTop: [],
    roleStatsByTier: {
      diamondPlus: [],
      mithrilPlus: [],
    },
    tierRpTrends: {
      diamondPlus: emptyTierRpTrend(),
      mithrilPlus: emptyTierRpTrend(),
    },
  };
}

export async function getSeasonRecapData(seasonNumber = 10): Promise<SeasonRecapData> {
  try {
    if (!Number.isInteger(seasonNumber) || seasonNumber <= 0) {
      return emptySeasonRecapData();
    }

    const supabase = createServerClient();
    const seasonPatchPrefix = `${seasonNumber}.`;

    const { data: patchData, error: patchError } = await supabase
      .from("PatchVersion")
      .select("version,startDate")
      .like("version", `${seasonPatchPrefix}%`)
      .order("startDate", { ascending: true });

    if (patchError) {
      console.error(`[seasonRecap] 시즌 ${seasonNumber} PatchVersion 조회 실패:`, patchError);
    }

    const patches = (patchData ?? [])
      .map((r: { version: string }) => r.version)
      .filter((version): version is string => Boolean(version) && version !== `${seasonNumber}.0`);

    if (patches.length === 0) {
      return emptySeasonRecapData();
    }

    // 패치 × 4티어 × 평균 90 캐릭 ≈ 패치당 360 row. 패치별로 나눠서 1000-row 기본 제한 회피.
    const perPatchResults = await Promise.all(
      patches.map((patch) =>
        supabase
          .from("v2_CharacterStats")
          .select("patchVersion,characterNum,bestWeapon,tier,totalGames,totalWins,totalRP")
          .eq("patchVersion", patch)
          .in("tier", DIAMOND_PLUS_TIERS)
      )
    );

    const allRows: StatRow[] = [];
    for (let i = 0; i < perPatchResults.length; i++) {
      const { data, error } = perPatchResults[i];
      if (error) {
        console.error(`[seasonRecap] ${patches[i]} 조회 실패:`, error);
        continue;
      }
      if (data) allRows.push(...(data as StatRow[]));
    }

    const perPatchTop: PatchTopGroup[] = patches.map((patch) => {
      const patchRows = allRows.filter((r) => r.patchVersion === patch);
      const entries = aggregateByCombo(patchRows)
        .sort((a, b) => b.averageRP - a.averageRP)
        .slice(0, 5);
      return { patch, entries };
    });

    const appearanceMap = new Map<number, number>();
    for (const { entries } of perPatchTop) {
      for (const e of entries) {
        const key = comboKey(e.characterNum, e.bestWeapon);
        appearanceMap.set(key, (appearanceMap.get(key) ?? 0) + 1);
      }
    }

    const activeMap = new Map<number, Set<string>>();
    for (const r of allRows) {
      if ((r.totalGames ?? 0) === 0) continue;
      const key = comboKey(r.characterNum, r.bestWeapon);
      const set = activeMap.get(key) ?? new Set<string>();
      set.add(r.patchVersion);
      activeMap.set(key, set);
    }

    // 시즌 누적 랭킹은 다이아+ 기준으로 유지한다. 섹션 상단 그래프에는
    // 조합별 수치가 아닌 각 티어 범위의 전체 경기 표본 평균을 사용한다.
    const perPatchComboMap = buildPerPatchComboMap(allRows);
    const mithrilRows = allRows.filter((row) => row.tier === "MITHRIL");
    const mithrilPerPatchComboMap = buildPerPatchComboMap(mithrilRows);
    const mithrilSeasonMap = new Map(
      aggregateByCombo(mithrilRows).map((entry) => [
        comboKey(entry.characterNum, entry.bestWeapon),
        entry,
      ])
    );
    const tierRpTrends: TierRpTrends = {
      diamondPlus: buildTierRpTrend(allRows, patches),
      mithrilPlus: buildTierRpTrend(mithrilRows, patches),
    };

    const seasonTop: SeasonAggregateEntry[] = aggregateByCombo(allRows)
      .sort((a, b) => b.averageRP - a.averageRP)
      .map((e) => {
        const key = comboKey(e.characterNum, e.bestWeapon);
        const mithrilEntry = mithrilSeasonMap.get(key);
        return {
          ...e,
          topAppearances: appearanceMap.get(key) ?? 0,
          patchesActive: activeMap.get(key)?.size ?? 0,
          perPatch: buildPerPatchStats(patches, perPatchComboMap, key),
          mithrilPlus: mithrilEntry
            ? {
                ...mithrilEntry,
                perPatch: buildPerPatchStats(patches, mithrilPerPatchComboMap, key),
              }
            : null,
          patchNotes: patches.flatMap((patch) => {
            const note = getCharacterPatchNote(e.characterNum, patch);
            return note
              ? [
                  {
                    patch,
                    changes: note.changes.map((change) => ({
                      changeType: change.changeType,
                      target: change.target,
                      description: change.description[0] ?? "",
                      valueSummary: change.valueSummary,
                    })),
                  },
                ]
              : [];
          }),
        };
      });

    const roleStatsByTier: RoleStatsByTier = {
      diamondPlus: buildRoleStats(allRows, patches),
      mithrilPlus: buildRoleStats(mithrilRows, patches),
    };

    return { patches, perPatchTop, seasonTop, roleStatsByTier, tierRpTrends };
  } catch (error) {
    console.error(`[seasonRecap] 시즌 ${seasonNumber} 집계 실패, 빈 데이터로 폴백:`, error);
    return emptySeasonRecapData();
  }
}
