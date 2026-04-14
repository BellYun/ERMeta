import { expect, test } from "@playwright/test";

test.describe("Synergy 및 정적 페이지", () => {
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

  test("/updates 가 업데이트 내역 h1을 노출한다", async ({ page }) => {
    const res = await page.goto("/updates");
    expect(res?.status()).toBeLessThan(400);
    await expect(page.getByRole("heading", { name: /업데이트/, level: 1 })).toBeVisible();
  });

  test("/privacy 200 + h1 노출", async ({ page }) => {
    const res = await page.goto("/privacy");
    expect(res?.status()).toBeLessThan(400);
    await expect(page.getByRole("heading", { level: 1 }).first()).toBeVisible();
  });

  test("/terms 200 + h1 노출", async ({ page }) => {
    const res = await page.goto("/terms");
    expect(res?.status()).toBeLessThan(400);
    await expect(page.getByRole("heading", { level: 1 }).first()).toBeVisible();
  });
});
