import { expect, test } from "@playwright/test";

test.describe("removed trio-lab route", () => {
  test("/trio-lab renders the not found page", async ({ page }) => {
    const response = await page.goto("/trio-lab");

    expect(response?.status()).toBe(404);
    await expect(page.getByRole("heading", { name: "페이지를 찾을 수 없습니다" })).toBeVisible();
    await expect(page.getByRole("link", { name: "홈으로 돌아가기" })).toBeVisible();
  });

  test("/trio-lab detail URLs also render not found", async ({ page }) => {
    const response = await page.goto("/trio-lab/3-9_20-3_87-24");

    expect(response?.status()).toBe(404);
    await expect(page.getByRole("heading", { name: "페이지를 찾을 수 없습니다" })).toBeVisible();
  });
});
