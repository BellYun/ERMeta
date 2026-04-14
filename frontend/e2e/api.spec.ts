import { expect, test } from "@playwright/test";

test.describe("공개 API 라우트 헬스", () => {
  test("GET /api/patches/history 가 patches 배열을 반환한다", async ({ request }) => {
    const res = await request.get("/api/patches/history?limit=10");
    expect(res.status()).toBe(200);
    expect(res.headers()["content-type"]).toMatch(/application\/json/);
    const body = await res.json();
    expect(Array.isArray(body.patches)).toBe(true);
    expect(body.patches.length).toBeGreaterThanOrEqual(1);
  });

  test("GET /api/meta/honey-picks 가 picks 배열을 반환한다", async ({ request }) => {
    const patchesRes = await request.get("/api/patches/history?limit=2");
    expect(patchesRes.status()).toBe(200);
    const { patches } = await patchesRes.json();
    expect(Array.isArray(patches)).toBe(true);
    expect(patches.length).toBeGreaterThanOrEqual(1);

    const patchVersion = patches[0] as string;
    const url = `/api/meta/honey-picks?patchVersion=${encodeURIComponent(patchVersion)}&tier=MITHRIL`;
    const res = await request.get(url);
    expect(res.status()).toBe(200);
    expect(res.headers()["content-type"]).toMatch(/application\/json/);

    const body = await res.json();
    expect(Array.isArray(body.picks)).toBe(true);
    expect(typeof body.patchVersion).toBe("string");
  });

  test("GET /api/character/mithril-rp-ranking 가 rankings 배열을 반환한다", async ({ request }) => {
    const patchesRes = await request.get("/api/patches/history?limit=1");
    const { patches } = await patchesRes.json();
    const patchVersion = patches[0] as string;

    const res = await request.get(
      `/api/character/mithril-rp-ranking?patchVersion=${encodeURIComponent(patchVersion)}&tier=MITHRIL`
    );
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body.rankings)).toBe(true);
  });
});
