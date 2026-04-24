import { expect, test } from "@playwright/test";

// 🥇 시너지 공유 랜딩 플로.
// 가정 (2026-04-22 구현 예정):
// - /synergy-detail?source=share&a=X&b=Y&c=Z 접근 시 상단에 "친구가 추천" 배너 노출
// - source=share 없을 때는 배너 미노출
// - 배너는 role=status 또는 role=note 로 접근 가능

const hasSupabase = !!process.env.NEXT_PUBLIC_SUPABASE_URL;

test.describe("Flow: 시너지 공유 랜딩", () => {
  test.skip(!hasSupabase, "NEXT_PUBLIC_SUPABASE_URL 미주입 → 실 DB 의존 테스트 skip");

  test("source=share 쿼리로 접근하면 '친구가 추천' 배너가 노출된다", async ({ page }) => {
    await page.goto("/synergy-detail?a=1&b=2&c=3&source=share");

    // 배너는 role=status 또는 role=note 로 구현 가정.
    // 문구에 '친구' 또는 '추천' 키워드 포함.
    const banner = page
      .getByRole("status")
      .filter({ hasText: /친구|추천/ })
      .or(page.getByRole("note").filter({ hasText: /친구|추천/ }))
      .or(page.getByText(/친구가.*추천/));

    await expect(banner.first()).toBeVisible({ timeout: 15_000 });
  });

  test("source=share 없이 접근하면 배너가 노출되지 않는다", async ({ page }) => {
    await page.goto("/synergy-detail?a=1&b=2&c=3");

    // '친구가 추천' 같은 공유 전용 문구가 없어야 함
    const banner = page.getByText(/친구가.*추천/);
    await expect(banner).toHaveCount(0);
  });
});
