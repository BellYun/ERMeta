import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET } from "@/app/api/stats/trios-weapon/route";

const mocks = vi.hoisted(() => ({
  from: vi.fn(),
  rpc: vi.fn(),
  tryNestApiProxy: vi.fn(),
}));

vi.mock("next/cache", () => ({
  unstable_cache:
    <T>(loader: () => Promise<T>) =>
    () =>
      loader(),
}));

vi.mock("@/lib/server/nestProxy", () => ({
  tryNestApiProxy: mocks.tryNestApiProxy,
}));

vi.mock("@/lib/supabase", () => ({
  createServerClient: () => ({
    from: mocks.from,
    rpc: mocks.rpc,
  }),
}));

const BUCKET_TUPLE = [6, 8, 10, 1, 22, 3, 120, 30, 3240, 420];

function mockBucketQuery(data: unknown) {
  const query = {
    select: vi.fn(),
    eq: vi.fn(),
    maybeSingle: vi.fn().mockResolvedValue({ data, error: null }),
  };
  query.select.mockReturnValue(query);
  query.eq.mockReturnValue(query);
  mocks.from.mockReturnValue(query);
  return query;
}

describe("GET /api/stats/trios-weapon tuple bucket", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.tryNestApiProxy.mockResolvedValue(null);
  });

  it("요청 시 RPC 집계 대신 character+weapon 버킷 한 행을 조회한다", async () => {
    const query = mockBucketQuery({
      item_count: 1,
      items: [BUCKET_TUPLE],
    });

    const response = await GET(
      new NextRequest("http://localhost/api/stats/trios-weapon?character1=6&weapon1=8&format=tuple")
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      version: 1,
      itemCount: 1,
      items: [BUCKET_TUPLE],
    });
    expect(mocks.from).toHaveBeenCalledWith("v2_CharacterTrioWeaponMemberBucket");
    expect(query.select).toHaveBeenCalledWith("item_count,items");
    expect(query.eq).toHaveBeenNthCalledWith(1, "character_code", 6);
    expect(query.eq).toHaveBeenNthCalledWith(2, "weapon_code", 8);
    expect(query.maybeSingle).toHaveBeenCalledOnce();
    expect(mocks.rpc).not.toHaveBeenCalled();
  });

  it("존재하지 않는 character+weapon은 빈 tuple 버킷으로 반환한다", async () => {
    mockBucketQuery(null);

    const response = await GET(
      new NextRequest(
        "http://localhost/api/stats/trios-weapon?character1=999&weapon1=999&format=tuple"
      )
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      version: 1,
      itemCount: 0,
      items: [],
    });
  });
});
