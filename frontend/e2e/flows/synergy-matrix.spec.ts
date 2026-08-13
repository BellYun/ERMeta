import { expect, test } from "@playwright/test";

test.describe("synergy matrix", () => {
  test("restores controls from the URL and keeps the canvas interactive", async ({ page }) => {
    await page.goto("/synergy-matrix?metric=games&minGames=400&sort=games&row=1&col=2");

    const controls = page.locator("main select");
    await expect(controls.nth(0)).toHaveValue("games");
    await expect(controls.nth(1)).toHaveValue("games");
    await expect(page.locator('input[type="range"]')).toHaveValue("400");

    const canvas = page.locator('canvas[role="img"]');
    await expect(canvas).toBeVisible();
    const pairButton = page
      .locator('button[data-matrix-pair]:not([data-matrix-pair="1:2"])')
      .first();
    const pair = await pairButton.getAttribute("data-matrix-pair");
    expect(pair).toBeTruthy();
    const [row, col] = pair!.split(":");
    await pairButton.click();

    await expect(page).toHaveURL(new RegExp(`row=${row}&col=${col}`));
    await expect(page.getByRole("link", { name: /조합 상세|Team data|編成詳細/ })).toBeVisible();
  });
});
