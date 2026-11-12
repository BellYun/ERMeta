import { expect, test, type Page } from "@playwright/test";

const SPECULATION_COMPLETED_MARK = "ermeta-speculative-analysis-completed";
const CLICK_TO_READY_MEASURE = "ermeta-synergy-candidate-click-to-analysis-ready";

async function mockAnalysisInputs(page: Page) {
  await page.route("**/data/trio-builder/*/*.json", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        version: 1,
        itemCount: 2,
        items: [
          [1, 16, 2, 9, 76, 3, 120, 31.8, 3312, 408],
          [1, 16, 4, 2, 76, 3, 90, 20.79, 1998, 351],
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
