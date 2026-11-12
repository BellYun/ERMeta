import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GET as getHomeStats } from "@/app/api/meta/home-stats/route";
import { GET as getPatchHistory } from "@/app/api/patches/history/route";

const from = vi.hoisted(() => vi.fn());
vi.mock("@/lib/supabase", () => ({ createServerClient: () => ({ from }) }));
vi.mock("@/lib/getPatches", () => ({ getPatches: async () => ["12.7", "12.6"] }));

function query(data: unknown[]) {
  return Object.assign(Promise.resolve({ data, error: null }), {
    select: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
  });
}

beforeEach(() => from.mockReset());
afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("GET /api/patches/history", () => {
  it("applies the limit after removing newer patches and keeps the public patch date", async () => {
    from.mockReturnValue(
      query([
        { version: "13.0", startDate: "2026-11-12" },
        { version: "12.7", startDate: "2026-10-29" },
        { version: "12.6", startDate: "2026-10-15" },
      ])
    );

    const response = await getPatchHistory(
      new NextRequest("http://localhost/api/patches/history?limit=1")
    );
    expect(await response.json()).toEqual({ patches: ["12.7"], latestStartDate: "2026-10-29" });
    expect(from).toHaveBeenCalledTimes(1);
  });

  it("filters newer versions out of the stats fallback", async () => {
    from
      .mockReturnValueOnce(query([]))
      .mockReturnValueOnce(
        query([
          { patchVersion: "13.0" },
          { patchVersion: "12.10" },
          { patchVersion: "12.7" },
          { patchVersion: "12.6" },
        ])
      );

    const response = await getPatchHistory(new NextRequest("http://localhost/api/patches/history"));
    expect(await response.json()).toEqual({ patches: ["12.7", "12.6"] });
  });
});

describe("GET /api/meta/home-stats with Nest enabled", () => {
  beforeEach(() => {
    vi.stubEnv("USE_NEST_API", "true");
    vi.stubEnv("NEST_API_BASE_URL", "https://nest.example");
  });

  it("passes the public default to Nest when the request omits the patch", async () => {
    const fetchUpstream = vi.fn().mockResolvedValue(Response.json({ patchVersion: "12.7" }));
    vi.stubGlobal("fetch", fetchUpstream);

    const response = await getHomeStats(new NextRequest("http://localhost/api/meta/home-stats"));

    expect(await response.json()).toEqual({ patchVersion: "12.7" });
    expect(fetchUpstream.mock.calls[0][0].searchParams.get("patchVersion")).toBe("12.7");
  });

  it("rejects a newer version before calling Nest or the database", async () => {
    const fetchUpstream = vi.fn();
    vi.stubGlobal("fetch", fetchUpstream);

    const response = await getHomeStats(
      new NextRequest("http://localhost/api/meta/home-stats?patchVersion=13.0")
    );

    expect(response.status).toBe(400);
    expect(fetchUpstream).not.toHaveBeenCalled();
    expect(from).not.toHaveBeenCalled();
  });
});
