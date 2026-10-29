import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getCachedHomeMetaStats, getPatchPageMetaStats } from "@/lib/homeMetaServer";
import { HOME_META_TARGET_PATCH } from "@/lib/homeMetaShared";
import { fetchRankingData } from "@/lib/ranking";

const { cached, responses } = vi.hoisted(() => ({
  cached: vi.fn((fn: () => unknown, _keys: string[], _options: unknown) => fn),
  responses: [] as Array<{ data: unknown; error: unknown }>,
}));
vi.mock("next/cache", () => ({ unstable_cache: cached }));
vi.mock("@/lib/supabase", () => ({
  createServerClient: () => ({
    from: () => {
      const result = responses.shift();
      const query: Record<string, unknown> = {};
      for (const method of ["select", "order", "eq", "limit", "in"]) query[method] = () => query;
      query.then = (resolve: (value: unknown) => unknown) => Promise.resolve(result).then(resolve);
      return query;
    },
  }),
}));

beforeEach(() => {
  cached.mockClear();
  responses.length = 0;
});
function success() {
  for (let i = 0; i < 4; i++) responses.push({ data: [], error: null });
}
describe("patch detail cache dependencies", () => {
  it("keeps current detail pages hourly without changing the home cache", async () => {
    success();
    await getPatchPageMetaStats(HOME_META_TARGET_PATCH);
    expect(cached.mock.calls[0][2]).toEqual({
      revalidate: 3600,
      tags: [`patch-page:${HOME_META_TARGET_PATCH}`],
    });
    success();
    await getCachedHomeMetaStats(HOME_META_TARGET_PATCH);
    expect(cached.mock.calls[1][2]).toMatchObject({ revalidate: 300 });
    expect(cached.mock.calls[0][1]).not.toEqual(cached.mock.calls[1][1]);
  });
  it("does not attach a finite TTL to an archived patch", async () => {
    success();
    await getPatchPageMetaStats("11.4");
    expect(cached.mock.calls[0][2]).toEqual({ revalidate: false, tags: ["patch-page:11.4"] });
  });
  it("rejects failed archive reads instead of permanently caching an empty preview", async () => {
    responses.push({ data: [], error: null }, { data: null, error: { message: "offline" } });
    await expect(getPatchPageMetaStats("11.4")).rejects.toThrow("Failed to load patch metadata");
  });
  it("rejects failed stats reads after metadata succeeds", async () => {
    responses.push(
      { data: [], error: null },
      { data: [], error: null },
      { data: null, error: { message: "offline" } }
    );
    await expect(getPatchPageMetaStats("11.4")).rejects.toThrow("Failed to load patch stats");
  });
});

describe("archived analysis ranking failures", () => {
  it("rejects failed ranking reads before an archive can be cached", async () => {
    responses.push({ data: [], error: null }, { data: null, error: { message: "offline" } });
    await expect(fetchRankingData("11.4", "DIAMOND_PLUS", true)).rejects.toThrow(
      "Failed to load patch rankings"
    );
  });
  it("preserves the fallback behavior for existing ranking callers", async () => {
    responses.push({ data: [], error: null }, { data: null, error: { message: "offline" } });
    await expect(fetchRankingData("11.4", "DIAMOND_PLUS")).resolves.toMatchObject({ rankings: [] });
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
