import { expect, test } from "@playwright/test";

// 🥇 시너지 공유 Dynamic OG 이미지 스모크.
// 가정 (2026-04-22 구현 예정):
// - Next.js App Router 컨벤션: app/synergy-detail/opengraph-image.tsx (Satori 기반)
// - GET /synergy-detail/opengraph-image?a=X&b=Y&c=Z → image/png 200
// - /synergy-detail?a=X&b=Y&c=Z 페이지 HEAD 의 og:image 가 해당 URL 로 설정됨

// OG 엔드포인트 자체는 Supabase 의존이 없는 순수 Next.js 라우트 핸들러이므로
// describe-level skip 가드를 쓰지 않고 각 페이지 렌더 테스트에만 개별 skip 적용.
const hasSupabase = !!process.env.NEXT_PUBLIC_SUPABASE_URL;

test.describe("시너지 공유 — OG 이미지", () => {
  test("/synergy-detail/opengraph-image 엔드포인트가 image 응답을 반환한다", async ({
    request,
  }) => {
    // 순수 이미지 라우트 — Supabase 없이 동작한다고 가정
    const res = await request.get("/synergy-detail/opengraph-image?a=1&b=2&c=3");
    expect(res.status()).toBe(200);
    const contentType = res.headers()["content-type"] ?? "";
    expect(contentType).toMatch(/^image\//);
  });

  test("/synergy-detail 페이지 HEAD 에 og:image meta 가 설정된다", async ({ page }) => {
    test.skip(!hasSupabase, "NEXT_PUBLIC_SUPABASE_URL 미주입 → skip");

    await page.goto("/synergy-detail?a=1&b=2&c=3");

    const ogImage = page.locator('meta[property="og:image"]');
    await expect(ogImage).toHaveCount(1);
    await expect(ogImage).toHaveAttribute("content", /.+/);
  });

  test("/synergy-detail 페이지 HEAD 에 twitter:card meta 존재", async ({ page }) => {
    test.skip(!hasSupabase, "NEXT_PUBLIC_SUPABASE_URL 미주입 → skip");

    await page.goto("/synergy-detail?a=1&b=2&c=3");

    const twitterCard = page.locator('meta[name="twitter:card"]');
    await expect(twitterCard).toHaveCount(1);
  });
});
