import { expect, test } from "@playwright/test";

test.describe("Synergy 페이지", () => {
  test("/synergy 는 상세 조합 데이터로 리다이렉트된다", async ({ page }) => {
    const res = await page.goto("/synergy?ally1=1&w1=1");
    expect(res?.status()).toBeLessThan(400);

    expect(new URL(page.url()).pathname).toBe("/synergy-detail");
    expect(new URL(page.url()).searchParams.get("ally1")).toBe("1");
    expect(new URL(page.url()).searchParams.get("w1")).toBe("1");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  });

  test("/synergy-detail 200 응답 + h1 노출", async ({ page }) => {
    const res = await page.goto("/synergy-detail");
    expect(res?.status()).toBeLessThan(400);
    await expect(page.getByRole("heading", { level: 1 }).first()).toBeVisible({ timeout: 20_000 });
  });
});
