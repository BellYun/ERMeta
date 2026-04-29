import { type CharacterRole, getComboRoles } from "@/lib/characterMap";
import { createServerClient } from "@/lib/supabase";

const MITHRIL_PLUS_TIERS = ["MITHRIL", "METEORITE", "DIAMOND", "IN1000"];
const SEASON_PATCH_PREFIX = "10.";
// 무기군별로 분리하지 않는 캐릭터 (알렉스 등). 모든 무기 row를 단일 entry로 합산.
const SINGLE_ENTRY_CHARS = new Set<number>([27]);
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
  averageRP: number;
}

export interface SeasonAggregateEntry extends RecapEntry {
  topAppearances: number;
  patchesActive: number;
  perPatch: PerPatchStat[];
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

export interface SeasonRecapData {
  patches: string[];
  perPatchTop: PatchTopGroup[];
  seasonTop: SeasonAggregateEntry[];
  roleStats: RoleAggregate[];
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
  return SINGLE_ENTRY_CHARS.has(character) ? 0 : weapon;
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

function emptySeasonRecapData(): SeasonRecapData {
  return { patches: [], perPatchTop: [], seasonTop: [], roleStats: [] };
}

export async function getSeasonRecapData(): Promise<SeasonRecapData> {
  try {
    const supabase = createServerClient();

    const { data: patchData, error: patchError } = await supabase
      .from("PatchVersion")
      .select("version,startDate")
      .like("version", `${SEASON_PATCH_PREFIX}%`)
      .order("startDate", { ascending: true });

    if (patchError) {
      console.error("[seasonRecap] PatchVersion 조회 실패:", patchError);
    }

    const patches = (patchData ?? [])
      .map((r: { version: string }) => r.version)
      .filter((v): v is string => Boolean(v));

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
          .in("tier", MITHRIL_PLUS_TIERS)
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

    // (patchVersion, comboKey) → aggregated stats. perPatch breakdown 빠르게 채우기 위함.
    const perPatchComboMap = new Map<string, Map<number, { games: number; rp: number }>>();
    for (const r of allRows) {
      const games = r.totalGames ?? 0;
      if (games === 0) continue;
      const key = comboKey(r.characterNum, r.bestWeapon);
      let patchMap = perPatchComboMap.get(r.patchVersion);
      if (!patchMap) {
        patchMap = new Map();
        perPatchComboMap.set(r.patchVersion, patchMap);
      }
      const cur = patchMap.get(key) ?? { games: 0, rp: 0 };
      cur.games += games;
      cur.rp += r.totalRP ?? 0;
      patchMap.set(key, cur);
    }

    const seasonTop: SeasonAggregateEntry[] = aggregateByCombo(allRows)
      .sort((a, b) => b.averageRP - a.averageRP)
      .map((e) => {
        const key = comboKey(e.characterNum, e.bestWeapon);
        const perPatch: PerPatchStat[] = [];
        for (const patch of patches) {
          const stat = perPatchComboMap.get(patch)?.get(key);
          if (!stat) continue;
          perPatch.push({
            patch,
            totalGames: stat.games,
            averageRP: stat.rp / stat.games,
          });
        }
        return {
          ...e,
          topAppearances: appearanceMap.get(key) ?? 0,
          patchesActive: activeMap.get(key)?.size ?? 0,
          perPatch,
        };
      });

    // 직업군별 평균 RP — 패치별 + 시즌 전체. 한 row(캐릭+무기+티어)가 복수 직업군 매핑될 수 있으며,
    // 각 직업군 버킷에 그대로 누적(중복 카운트 허용 — 탱커/전사 겸업은 양쪽 모두에 기여).
    const rolePatchTotals = new Map<CharacterRole, Map<string, { games: number; rp: number }>>();
    const roleSeasonTotals = new Map<CharacterRole, { games: number; rp: number }>();

    for (const r of allRows) {
      const games = r.totalGames ?? 0;
      if (games === 0) continue;
      const rp = r.totalRP ?? 0;
      const roles = getComboRoles(r.characterNum, r.bestWeapon);
      if (roles.length === 0) continue;

      for (const role of roles) {
        let patchMap = rolePatchTotals.get(role);
        if (!patchMap) {
          patchMap = new Map();
          rolePatchTotals.set(role, patchMap);
        }
        const cur = patchMap.get(r.patchVersion) ?? { games: 0, rp: 0 };
        cur.games += games;
        cur.rp += rp;
        patchMap.set(r.patchVersion, cur);

        const seasonCur = roleSeasonTotals.get(role) ?? { games: 0, rp: 0 };
        seasonCur.games += games;
        seasonCur.rp += rp;
        roleSeasonTotals.set(role, seasonCur);
      }
    }

    const roleStats: RoleAggregate[] = ROLES.map((role) => {
      const patchMap = rolePatchTotals.get(role);
      const perPatch = patches.map((patch) => {
        const t = patchMap?.get(patch);
        return {
          patch,
          stat: t && t.games > 0 ? { totalGames: t.games, averageRP: t.rp / t.games } : null,
        };
      });
      const seasonTotal = roleSeasonTotals.get(role);
      const season =
        seasonTotal && seasonTotal.games > 0
          ? { totalGames: seasonTotal.games, averageRP: seasonTotal.rp / seasonTotal.games }
          : null;
      return { role, perPatch, season };
    });

    return { patches, perPatchTop, seasonTop, roleStats };
  } catch (error) {
    console.error("[seasonRecap] 집계 실패, 빈 데이터로 폴백:", error);
    return emptySeasonRecapData();
  }
}
