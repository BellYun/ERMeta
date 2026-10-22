import characterBestWeapons from "@/../const/characterBestWeapons.json";
import { type CachedTrioWeaponTuple, parseTrioWeaponTupleBucket } from "./trioWeaponTuple";

export interface PoolPick {
  charCode: number;
  weaponCode: number;
}
export type TeamPools = [PoolPick[], PoolPick[], PoolPick[]];
export interface TeamMetrics {
  totalGames: number;
  winRate: number;
  averageRP: number;
  averageRank: number;
}
export interface TeamAssignment {
  members: [PoolPick, PoolPick, PoolPick];
  key: string;
  metrics: TeamMetrics | null;
}
export type TeamSort = keyof TeamMetrics;
export const pickKey = (pick: PoolPick) =>
  `${pick.charCode}:${pick.charCode === 27 ? 0 : pick.weaponCode}`;
export const teamKey = (members: PoolPick[]) => members.map(pickKey).sort().join("|");

export function normalizePools(value: unknown, allowed: PoolPick[]): TeamPools {
  const valid = new Map(allowed.map((p) => [pickKey(p), p]));
  return [0, 1, 2].map((index) => {
    const pool = Array.isArray(value) ? value[index] : null;
    if (!Array.isArray(pool)) return [];
    const unique = new Map<string, PoolPick>();
    for (const item of pool) {
      if (!item || typeof item !== "object") continue;
      const found = valid.get(pickKey(item));
      if (found)
        unique.set(pickKey(found), { charCode: found.charCode, weaponCode: found.weaponCode });
    }
    return [...unique.values()];
  }) as TeamPools;
}

export function indexTeamMetrics(tuples: CachedTrioWeaponTuple[]): Map<string, TeamMetrics> {
  const seen = new Set<string>();
  const sums = new Map<string, number[]>();
  for (const tuple of tuples) {
    const members = [0, 2, 4].map((i) => ({ charCode: tuple[i]!, weaponCode: tuple[i + 1]! }));
    const rawKey = members
      .map((m) => `${m.charCode}:${m.weaponCode}`)
      .sort()
      .join("|");
    if (seen.has(rawKey)) continue;
    seen.add(rawKey);
    const key = teamKey(members);
    const sum = sums.get(key) ?? [0, 0, 0, 0];
    for (let i = 0; i < 4; i++) sum[i] = sum[i]! + tuple[i + 6]!;
    sums.set(key, sum);
  }
  return new Map(
    [...sums]
      .filter(([, s]) => s[0]! > 0)
      .map(([key, s]) => [
        key,
        {
          totalGames: s[0]!,
          winRate: (s[1]! / s[0]!) * 100,
          averageRP: s[2]! / s[0]! / 3,
          averageRank: s[3]! / s[0]!,
        },
      ])
  );
}

export function buildTeamAssignments(
  pools: TeamPools,
  metrics: Map<string, TeamMetrics>
): TeamAssignment[] {
  const result: TeamAssignment[] = [];
  for (const a of pools[0])
    for (const b of pools[1]) {
      if (a.charCode === b.charCode) continue;
      for (const c of pools[2]) {
        if (a.charCode === c.charCode || b.charCode === c.charCode) continue;
        const members: TeamAssignment["members"] = [a, b, c];
        result.push({
          members,
          key: members.map(pickKey).join("|"),
          metrics: metrics.get(teamKey(members)) ?? null,
        });
      }
    }
  return result;
}

export function sortTeamAssignments(rows: TeamAssignment[], sort: TeamSort): TeamAssignment[] {
  return [...rows].sort((a, b) => {
    if (!a.metrics || !b.metrics)
      return Number(!!b.metrics) - Number(!!a.metrics) || a.key.localeCompare(b.key);
    return (
      (sort === "averageRank"
        ? a.metrics[sort] - b.metrics[sort]
        : b.metrics[sort] - a.metrics[sort]) ||
      b.metrics.totalGames - a.metrics.totalGames ||
      a.key.localeCompare(b.key)
    );
  });
}

/** Fetch every bucket for the cheapest player's pool, without a top-N cutoff. */
export async function loadTeamMetrics(pools: TeamPools, signal: AbortSignal) {
  const weapons = characterBestWeapons as Record<string, { weaponCode: number }[]>;
  const expanded = pools.map((pool) =>
    pool.flatMap((p) =>
      p.weaponCode > 0
        ? [p]
        : (weapons[String(p.charCode)] ?? []).map((w) => ({
            charCode: p.charCode,
            weaponCode: w.weaponCode,
          }))
    )
  );
  const anchors = expanded.sort((a, b) => a.length - b.length)[0]!;
  const tuples: CachedTrioWeaponTuple[] = [];
  let next = 0;
  await Promise.all(
    Array.from({ length: Math.min(4, anchors.length) }, async () => {
      while (next < anchors.length) {
        const pick = anchors[next++]!;
        const query = new URLSearchParams({
          character1: String(pick.charCode),
          weapon1: String(pick.weaponCode),
          format: "tuple",
        });
        const response = await fetch(`/api/stats/trios-weapon?${query}`, { signal });
        if (!response.ok) throw new Error("team_stats_unavailable");
        tuples.push(...parseTrioWeaponTupleBucket(await response.json()).items);
      }
    })
  );
  return indexTeamMetrics(tuples);
}
