import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { HOME_META_TARGET_PATCH } from "@/lib/homeMetaShared";
import { getPatchAnalysisData } from "@/lib/patchAnalysis";

const { cached, ranking, directDatabase } = vi.hoisted(() => ({
  cached: vi.fn((fn: () => unknown, _keys: string[], _options: unknown) => fn),
  ranking: vi.fn(),
  directDatabase: vi.fn(() => {
    throw new Error("Unexpected unused role-combo query");
  }),
}));
vi.mock("next/cache", () => ({ unstable_cache: cached }));
vi.mock("@/lib/ranking", () => ({ fetchRankingData: ranking }));
vi.mock("@/lib/supabase", () => ({ createServerClient: directDatabase }));

beforeEach(() => {
  vi.clearAllMocks();
});
describe("patch analysis computation", () => {
  it("retains displayed metrics without querying unused role combinations", async () => {
    ranking.mockImplementation(async (patchVersion, tier) => ({
      patchVersion,
      previousPatch: "12.5",
      tier,
      rankings: [
        {
          rank: 1,
          characterNum: 1,
          bestWeapon: 16,
          totalGames: 100,
          pickRate: 100,
          winRate: 10,
          averageRP: 20,
          top3Rate: 40,
        },
      ],
      previousRankings: [],
    }));
    const result = await getPatchAnalysisData(HOME_META_TARGET_PATCH);
    expect(result.totalMatches).toBe(100);
    expect(result.roleMetrics.some((role) => role.totalGames > 0)).toBe(true);
    expect(ranking).toHaveBeenCalledTimes(2);
    expect(directDatabase).not.toHaveBeenCalled();
    expect(cached.mock.calls[0][2]).toMatchObject({ revalidate: 3600 });
    for (const entry of [...result.buffed, ...result.nerfed, ...result.mixed]) {
      expect(entry).not.toHaveProperty("roleComboMetrics");
    }
  });
  it("propagates database failure so an archived page cannot cache an empty analysis", async () => {
    ranking.mockRejectedValue(new Error("offline"));
    await expect(getPatchAnalysisData("11.4")).rejects.toThrow("offline");
    expect(cached.mock.calls[0][2]).toMatchObject({ revalidate: false });
  });
});

afterEach(() => vi.unstubAllEnvs());

it("uses explicit offline fixtures without persisting them", async () => {
  vi.stubEnv("PATCH_PAGE_TEST_FIXTURES", "1");
  vi.stubEnv("VERCEL", "");
  vi.stubEnv("VERCEL_ENV", "");
  const data = await getPatchAnalysisData("12.6");
  expect(data.totalMatches).toBe(0);
  expect(ranking).not.toHaveBeenCalled();
  expect(cached).not.toHaveBeenCalled();
});
it("never allows test fixtures on Vercel", async () => {
  vi.stubEnv("PATCH_PAGE_TEST_FIXTURES", "1");
  vi.stubEnv("VERCEL", "1");
  ranking.mockRejectedValue(new Error("missing credentials"));
  await expect(getPatchAnalysisData("12.6")).rejects.toThrow("missing credentials");
});
