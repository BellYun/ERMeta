import { expect, test } from "@playwright/test";

test.describe("Flow: 성공 조합 프로토타입 분석", () => {
  test("반복 상승 유형 조합의 근거와 교전 운영을 함께 표시", async ({ page }) => {
    const runtimeErrors: string[] = [];
    page.on("pageerror", (error) => runtimeErrors.push(error.message));
    const analysisRequests: string[] = [];
    page.on("request", (request) => {
      const pathname = new URL(request.url()).pathname;
      if (pathname.includes("composition-affinity")) analysisRequests.push(pathname);
    });
    await page.route("**/data/trio-builder/*/*.json", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          version: 1,
          itemCount: 1,
          items: [[1, 16, 3, 21, 48, 3, 420, 118.44, 14364, 1344]],
        }),
      });
    });

    // 상세 조합 분석은 두 아군을 고정했을 때 제공된다.
    await page.goto("/synergy-detail?ally1=1&w1=16&ally2=3&w2=21");

    const card = page
      .locator('div[role="button"][tabindex="0"]')
      .filter({ has: page.locator('a[href^="/character/"]') })
      .first();
    await expect(card).toBeVisible({ timeout: 20_000 });
    const toggleHitArea = card.locator("[data-combo-toggle-hit-area]");
    await expect(toggleHitArea).toBeVisible();
    await toggleHitArea.click();

    const prototype = card.locator(
      'xpath=following-sibling::div//div[@data-successful-composition-prototype="exact"]'
    );
    await expect(prototype).toBeVisible();
    await expect(prototype.getByText("실험체별 역할")).toBeVisible();
    await expect(prototype.locator("[data-prototype-member-duty]")).toHaveCount(3);
    await expect(prototype.locator("[data-character-type]")).toHaveCount(3);
    await expect(
      prototype.getByText("전사 · 추격 지속 · 진입 마무리형 · 추격 지속전형", {
        exact: true,
      })
    ).toBeVisible();
    await expect(prototype.getByText(/new 유형/)).toHaveCount(0);
    await expect(prototype.getByText(/프로필|신뢰 관측|보정 평균/)).toHaveCount(0);
    await expect(page.getByText(/성공 유형 조합 일치/)).toHaveCount(0);
    await expect(
      card.locator("xpath=following-sibling::div//div[@data-combat-doctrine]")
    ).toBeVisible();
    await expect(
      card.locator("xpath=following-sibling::div//p[@data-composition-pattern-summary]")
    ).toBeVisible();
    await expect(
      page.locator("[data-nextjs-dialog], .vite-error-overlay, #webpack-dev-server-client-overlay")
    ).toHaveCount(0);
    for (const width of [320, 375, 414, 768]) {
      await page.setViewportSize({ width, height: 900 });
      await expect
        .poll(() =>
          page.evaluate(
            () => document.documentElement.scrollWidth > document.documentElement.clientWidth
          )
        )
        .toBe(false);
    }
    expect(runtimeErrors).toEqual([]);
    expect(analysisRequests).toEqual([expect.stringMatching(/^\/data\/composition-affinity\//)]);
  });
});
