import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getCachedHomeMetaStats, getPatchPageMetaStats } from "@/lib/homeMetaServer";
import { HOME_META_TARGET_PATCH } from "@/lib/homeMetaShared";
import { fetchRankingData } from "@/lib/ranking";

const { cached, readSnapshotStatRows } = vi.hoisted(() => ({
  cached: vi.fn((fn: () => unknown, _keys: string[], _options: unknown) => fn),
  readSnapshotStatRows: vi.fn(),
}));
vi.mock("next/cache", () => ({ unstable_cache: cached }));
vi.mock("@/lib/server/seasonSnapshot", () => ({ readSnapshotStatRows }));

beforeEach(() => {
  cached.mockClear();
  readSnapshotStatRows.mockReset().mockResolvedValue([]);
});

describe("patch detail cache dependencies", () => {
  it("keeps current detail pages hourly without changing the home cache", async () => {
    await getPatchPageMetaStats(HOME_META_TARGET_PATCH);
    expect(cached.mock.calls[0][2]).toEqual({
      revalidate: 3600,
      tags: [`patch-page:${HOME_META_TARGET_PATCH}`],
    });
    await getCachedHomeMetaStats(HOME_META_TARGET_PATCH);
    expect(cached.mock.calls[1][2]).toMatchObject({ revalidate: 1800 });
    expect(cached.mock.calls[0][1]).not.toEqual(cached.mock.calls[1][1]);
  });
  it("does not attach a finite TTL to an archived patch", async () => {
    await getPatchPageMetaStats("11.4");
    expect(cached.mock.calls[0][2]).toEqual({ revalidate: false, tags: ["patch-page:11.4"] });
  });
  it("rejects failed archive reads instead of permanently caching an empty preview", async () => {
    readSnapshotStatRows.mockRejectedValueOnce(new Error("snapshot unavailable"));
    await expect(getPatchPageMetaStats("11.4")).rejects.toThrow("snapshot unavailable");
  });
});

describe("archived analysis ranking failures", () => {
  it("rejects failed ranking reads before an archive can be cached", async () => {
    readSnapshotStatRows.mockRejectedValueOnce(new Error("snapshot unavailable"));
    await expect(fetchRankingData("11.4", "DIAMOND_PLUS", true)).rejects.toThrow(
      "Failed to load patch rankings"
    );
  });
  it("preserves the fallback behavior for existing ranking callers", async () => {
    readSnapshotStatRows.mockRejectedValueOnce(new Error("snapshot unavailable"));
    await expect(fetchRankingData("11.4", "DIAMOND_PLUS")).resolves.toMatchObject({
      rankings: [],
      previousPatch: null,
    });
  });
});

afterEach(() => vi.unstubAllEnvs());

it("does not persist empty offline page stats", async () => {
  vi.stubEnv("PATCH_PAGE_TEST_FIXTURES", "1");
  vi.stubEnv("VERCEL", "");
  vi.stubEnv("VERCEL_ENV", "");
  await expect(getPatchPageMetaStats("12.6")).resolves.toMatchObject({
    rows: [],
    collectedGames: 0,
  });
  expect(cached).not.toHaveBeenCalled();
});
