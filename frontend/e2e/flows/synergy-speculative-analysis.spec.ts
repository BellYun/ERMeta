import { expect, test, type Page } from "@playwright/test";

const SPECULATION_COMPLETED_MARK = "ermeta-speculative-analysis-completed";
const CLICK_TO_READY_MEASURE = "ermeta-synergy-candidate-click-to-analysis-ready";

async function mockAnalysisInputs(page: Page) {
  await page.route("**/api/stats/trios-weapon*", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        results: [
          {
            character1: 1,
            weaponType1: 16,
            character2: 2,
            weaponType2: 9,
            character3: 76,
            weaponType3: 3,
            mainCore1: 0,
            mainCore2: 0,
            mainCore3: 0,
            totalGames: 120,
            winRate: 26.5,
            averageRP: 9.2,
            averageRank: 3.4,
          },
          {
            character1: 1,
            weaponType1: 16,
            character2: 4,
            weaponType2: 2,
            character3: 76,
            weaponType3: 3,
            mainCore1: 0,
            mainCore2: 0,
            mainCore3: 0,
            totalGames: 90,
            winRate: 23.1,
            averageRP: 7.4,
            averageRank: 3.9,
          },
        ],
      }),
    });
  });
  await page.route("**/api/traits/names*", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ names: {} }),
    });
  });
  await page.route("**/api/analysis/composition-affinity", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ snapshotId: "test", results: {} }),
    });
  });
}

test.describe("Flow: Top-1 speculative composition analysis", () => {
  test("Top-1은 cache hit, 다른 후보는 on-demand 경로로 분석을 준비한다", async ({ page }) => {
    await mockAnalysisInputs(page);
    await page.goto("/synergy-detail?ally1=1&w1=16&ally2=76&w2=3");

    const cards = page
      .locator('div[role="button"][tabindex="0"]')
      .filter({ has: page.locator('a[href^="/character/"]') });
    await expect(cards).toHaveCount(2, { timeout: 20_000 });
    await expect
      .poll(() =>
        page.evaluate(
          (markName) => performance.getEntriesByName(markName, "mark").length,
          SPECULATION_COMPLETED_MARK
        )
      )
      .toBeGreaterThan(0);

    await cards.nth(0).locator("[data-combo-toggle-hit-area]").click();
    await expect
      .poll(() =>
        page.evaluate(
          (measureName) => performance.getEntriesByName(measureName, "measure").length,
          `${CLICK_TO_READY_MEASURE}-speculative_cache_hit`
        )
      )
      .toBe(1);

    await cards.nth(1).locator("[data-combo-toggle-hit-area]").click();
    await expect
      .poll(() =>
        page.evaluate(
          (measureName) => performance.getEntriesByName(measureName, "measure").length,
          `${CLICK_TO_READY_MEASURE}-on_demand`
        )
      )
      .toBe(1);
  });
});
