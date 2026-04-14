import { expect, test } from "@playwright/test";

test.describe("Synergy 페이지", () => {
  test("/synergy 가 상세 조합 추천 CTA를 보여준다", async ({ page }) => {
    const res = await page.goto("/synergy");
    expect(res?.status()).toBeLessThan(400);

    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(page.getByRole("link", { name: /상세 조합 추천/ })).toBeVisible();
  });

  test("/synergy-detail 200 응답 + h1 노출", async ({ page }) => {
    const res = await page.goto("/synergy-detail");
    expect(res?.status()).toBeLessThan(400);
    await expect(page.getByRole("heading", { level: 1 }).first()).toBeVisible({ timeout: 20_000 });
  });
});
