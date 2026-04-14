import { expect, test } from "@playwright/test";

test.describe("홈 페이지 스모크", () => {
  test("루트가 200을 반환하고 메타 분석 히어로를 렌더한다", async ({ page }) => {
    const response = await page.goto("/");
    expect(response?.status()).toBeLessThan(400);

    await expect(page).toHaveTitle(/이리와지지/);

    await expect(page.getByRole("heading", { name: /메타 분석/, level: 1 })).toBeVisible();
  });

  test("GlobalFilter가 patch select + tier 버튼 세그먼트를 노출한다", async ({ page }) => {
    await page.goto("/");

    const patchSelect = page.locator("select").first();
    await expect(patchSelect).toBeVisible({ timeout: 15_000 });

    const mithrilButton = page.getByRole("button", { name: "미스릴" });
    await expect(mithrilButton).toBeVisible();
  });

  test("티어 랭킹과 꿀챔 섹션이 순차 스트리밍되어 나타난다", async ({ page }) => {
    await page.goto("/");

    await expect(page.getByRole("heading", { name: /이번 패치 떡상/ })).toBeVisible({
      timeout: 20_000,
    });

    await expect(page.getByRole("heading", { name: /캐릭터 순위/ })).toBeVisible({
      timeout: 20_000,
    });

    const characterLink = page.locator('a[href^="/character/"]:visible').first();
    await expect(characterLink).toBeVisible({ timeout: 20_000 });
  });
});
