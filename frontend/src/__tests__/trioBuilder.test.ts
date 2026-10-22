import { describe, expect, it, vi, afterEach } from "vitest";
import {
  buildTeamAssignments,
  indexTeamMetrics,
  loadTeamMetrics,
  normalizePools,
  sortTeamAssignments,
  teamKey,
  type TeamPools,
} from "@/lib/trioBuilder";
import type { CachedTrioWeaponTuple } from "@/lib/trioWeaponTuple";
const a = { charCode: 1, weaponCode: 14 };
const b = { charCode: 2, weaponCode: 9 };
const c = { charCode: 3, weaponCode: 16 };
afterEach(() => vi.unstubAllGlobals());
describe("trio builder", () => {
  it("enumerates assignments, preserving player roles and missing statistics while excluding duplicate characters", () => {
    const pools: TeamPools = [
      [a, b],
      [a, b],
      [c, a],
    ];
    const rows = buildTeamAssignments(pools, new Map());
    expect(rows).toHaveLength(2);
    expect(rows.map((r) => r.members)).toEqual([
      [a, b, c],
      [b, a, c],
    ]);
    expect(rows.every((r) => r.metrics === null)).toBe(true);
  });
  it("deduplicates overlapping buckets and combines Alex weapons with weighted raw totals", () => {
    const row: CachedTrioWeaponTuple = [1, 14, 2, 9, 27, 5, 10, 2, 300, 40];
    const other: CachedTrioWeaponTuple = [1, 14, 2, 9, 27, 9, 30, 3, -180, 180];
    const metrics = indexTeamMetrics([row, row, other]);
    expect(metrics.get(teamKey([a, b, { charCode: 27, weaponCode: 0 }]))).toEqual({
      totalGames: 40,
      winRate: 12.5,
      averageRP: 1,
      averageRank: 5.5,
    });
  });
  it("validates saved pools and removes duplicates without accepting unknown weapons", () => {
    expect(
      normalizePools([[a, a, { charCode: 1, weaponCode: 999 }, null], [b], "oops"], [a, b, c])
    ).toEqual([[a], [b], []]);
  });
  it("sorts ranks ascending and keeps absent statistics last without mutating", () => {
    const rows = buildTeamAssignments(
      [[a], [b], [c, { charCode: 4, weaponCode: 3 }]],
      new Map([[teamKey([a, b, c]), { totalGames: 5, winRate: 20, averageRP: -3, averageRank: 4 }]])
    );
    const before = [...rows];
    expect(sortTeamAssignments([...rows].reverse(), "averageRP")[0]?.metrics?.averageRP).toBe(-3);
    expect(rows).toEqual(before);
  });
  it("fetches all buckets from the smallest pool and never asks for a truncated top-N result", async () => {
    const fetcher = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        version: 1,
        itemCount: 1,
        items: [[1, 14, 2, 9, 3, 16, 10, 2, 300, 40]],
      }),
    });
    vi.stubGlobal("fetch", fetcher);
    const metrics = await loadTeamMetrics([[a, b], [b], [c, a]], new AbortController().signal);
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(fetcher.mock.calls[0]?.[0]).toBe(
      "/api/stats/trios-weapon?character1=2&weapon1=9&format=tuple"
    );
    expect(metrics.size).toBe(1);
  });
  it("fails the whole lookup instead of marking failed requests as missing statistics", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false }));
    await expect(loadTeamMetrics([[a], [b], [c]], new AbortController().signal)).rejects.toThrow();
  });
});
