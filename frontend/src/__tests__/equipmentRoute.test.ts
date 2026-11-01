import { NextRequest, NextResponse } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GET, revalidate } from "@/app/api/builds/equipment/route";

const mocks = vi.hoisted(() => ({ from: vi.fn(), proxy: vi.fn() }));
vi.mock("@/lib/supabase", () => ({ createServerClient: () => ({ from: mocks.from }) }));
vi.mock("@/lib/server/nestProxy", () => ({ tryNestApiProxy: mocks.proxy }));
vi.mock("@/../const/itemGradeMap.json", () => ({
  default: {
    "1": "Legend",
    "2": "Legend",
    "3": "Legend",
    "4": "Legend",
    "5": "Legend",
    "6": "Epic",
  },
}));
vi.mock("@/../const/weaponItemTypeMap.json", () => ({ default: { "1": 10, "6": 20 } }));

const row = {
  mainCore: 100,
  weapon: 1,
  chest: 2,
  head: 3,
  arm: 4,
  leg: 5,
  totalGames: 10,
  totalWins: 2,
  rankSum: 40,
  totalRP: 1000,
};
const empty = {
  topBuilds: [],
  slotPopularity: { weapon: [], chest: [], head: [], arm: [], leg: [] },
  coreItems: [],
};
function database(data: unknown = [row], error: unknown = null) {
  const query = {
    select: vi.fn(),
    eq: vi.fn(),
    in: vi.fn(),
    is: vi.fn(),
    order: vi.fn(),
    limit: vi.fn().mockResolvedValue({ data, error }),
  };
  for (const method of [query.select, query.eq, query.in, query.is, query.order])
    method.mockReturnValue(query);
  mocks.from.mockReturnValue(query);
  return query;
}
function request(params = "characterCode=1&patchVersion=12.4") {
  return new NextRequest(`http://localhost/api/builds/equipment?${params}`);
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.proxy.mockResolvedValue(null);
});
afterEach(() => vi.restoreAllMocks());

describe("GET /api/builds/equipment", () => {
  it("조회 조건·누적 티어·기본 200행 제한과 성공 캐시를 유지한다", async () => {
    const db = database();
    const response = await GET(
      request("characterCode=1&patchVersion=12.4&tier=DIAMOND_PLUS&mainCore=100")
    );
    expect(mocks.from).toHaveBeenCalledWith("v2_CharacterEquipmentBuildStats");
    expect(db.eq).toHaveBeenCalledWith("characterNum", 1);
    expect(db.eq).toHaveBeenCalledWith("patchVersion", "12.4");
    expect(db.eq).toHaveBeenCalledWith("mainCore", 100);
    expect(db.in).toHaveBeenCalledWith("tier", ["DIAMOND", "METEORITE", "MITHRIL"]);
    expect(db.order).toHaveBeenCalledWith("totalGames", { ascending: false });
    expect(db.limit).toHaveBeenCalledWith(200);
    expect(response.status).toBe(200);
    expect((await response.json()).topBuilds[0]).toMatchObject({
      totalGames: 10,
      averageRP: 55,
      pickRate: 100,
    });
    expect(response.headers.get("Cache-Control")).toBe(
      "public, max-age=300, s-maxage=1800, stale-while-revalidate=300"
    );
    expect(revalidate).toBe(1800);
  });
  it("전설 필터는 1000행을 조회하고 도메인에 필터·매핑을 전달한다", async () => {
    const db = database([row, { ...row, head: 6 }, { ...row, weapon: 6 }]);
    const response = await GET(
      request("characterCode=1&patchVersion=12.3&bestWeapon=10&legendOnly=1&mainCore=null")
    );
    expect(db.limit).toHaveBeenCalledWith(1000);
    expect(db.is).toHaveBeenCalledWith("mainCore", null);
    expect((await response.json()).topBuilds).toEqual([
      {
        mainCore: 100,
        weapon: 1,
        chest: 2,
        head: 3,
        arm: 4,
        leg: 5,
        totalGames: 10,
        pickRate: 100,
        winRate: 20,
        averageRank: 4,
        averageRP: 100,
      },
    ]);
  });
  it.each(["99", "oops", ""])(
    "bestWeapon=%s로 필터 후 비면 캐시 없는 빈 응답을 유지한다",
    async (bestWeapon) => {
      database();
      const response = await GET(request(`characterCode=1&bestWeapon=${bestWeapon}`));
      expect(response.status).toBe(200);
      expect(await response.json()).toEqual(empty);
      expect(response.headers.get("Cache-Control")).toBeNull();
    }
  );
  it.each([null, []])("조회 결과 %j는 캐시 없는 빈 응답", async (data) => {
    database(data);
    const response = await GET(request());
    expect(await response.json()).toEqual(empty);
    expect(response.headers.get("Cache-Control")).toBeNull();
  });
  it.each(["", "characterCode=0", "characterCode=oops"])(
    "잘못된 실험체 입력 %s는 DB를 조회하지 않는다",
    async (params) => {
      const response = await GET(request(params));
      expect(response.status).toBe(200);
      expect(await response.json()).toEqual(empty);
      expect(mocks.from).not.toHaveBeenCalled();
    }
  );
  it("Nest 프록시 응답을 먼저 반환한다", async () => {
    const proxied = NextResponse.json({ proxied: true }, { status: 202 });
    mocks.proxy.mockResolvedValue(proxied);
    expect(await GET(request(""))).toBe(proxied);
    expect(mocks.from).not.toHaveBeenCalled();
  });
  it.each([false, true])(
    "DB 오류/예외에서도 기존 200 빈 응답을 유지한다: throw=%s",
    async (throws) => {
      vi.spyOn(console, "error").mockImplementation(() => {});
      const db = database(null, { message: "offline" });
      if (throws) db.limit.mockRejectedValue(new Error("offline"));
      const response = await GET(request());
      expect(response.status).toBe(200);
      expect(await response.json()).toEqual(empty);
      expect(response.headers.get("Cache-Control")).toBeNull();
    }
  );
});
