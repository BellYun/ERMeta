import { expect, test } from "@playwright/test";

// 공개 API 스모크는 실 Supabase 연결이 있어야 통과한다.
// fork PR처럼 secrets가 주입되지 않는 CI 환경에서는 전체 skip 처리해 불필요한 실패를 막는다.
const hasSupabase = !!process.env.NEXT_PUBLIC_SUPABASE_URL;

test.describe("공개 API 라우트 헬스", () => {
  test.skip(!hasSupabase, "NEXT_PUBLIC_SUPABASE_URL 미주입 (fork PR 등) → 실 DB 의존 테스트 skip");

  test("GET /api/patches/history 가 patches 배열을 반환한다", async ({ request }) => {
    const res = await request.get("/api/patches/history?limit=10");
    expect(res.status()).toBe(200);
    expect(res.headers()["content-type"]).toMatch(/application\/json/);
    const body = await res.json();
    expect(Array.isArray(body.patches)).toBe(true);
    expect(body.patches.length).toBeGreaterThanOrEqual(1);
  });
});
