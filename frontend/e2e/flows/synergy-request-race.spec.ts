import { expect, test, type Page } from "@playwright/test";

const tupleBucket = {
  version: 1,
  itemCount: 2,
  items: [
    [6, 8, 2, 9, 3, 16, 120, 30, 2880, 420],
    [6, 8, 1, 16, 5, 5, 120, 30, 2880, 420],
  ],
};

async function mockTraitNames(page: Page) {
  await page.route("**/api/traits/names*", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ names: {} }),
    });
  });
}

test.describe("시너지 상세 요청 경쟁", () => {
  test("진행 중인 A+무기 버킷 요청을 최신 아군 조합에 재사용한다", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "chromium-desktop", "데스크탑 회귀 경로 전용");
    await mockTraitNames(page);

    let requestCount = 0;
    let markBucketRequestStarted: (() => void) | undefined;
    const bucketRequestStarted = new Promise<void>((resolve) => {
      markBucketRequestStarted = resolve;
    });

    await page.route(/\/api\/stats\/trios-weapon(?:\?.*)?$/, async (route) => {
      const url = new URL(route.request().url());
      requestCount += 1;
      expect(url.searchParams.get("format")).toBe("tuple");
      expect(url.searchParams.get("character1")).toBe("6");
      expect(url.searchParams.get("weapon1")).toBe("8");
      expect(url.searchParams.has("character2")).toBe(false);
      expect(url.searchParams.has("weapon2")).toBe(false);

      markBucketRequestStarted?.();
      await new Promise((resolve) => setTimeout(resolve, 1_000));
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        headers: { "Cache-Control": "no-store" },
        body: JSON.stringify(tupleBucket),
      });
    });

    await page.goto("/synergy-detail?ally1=6&w1=8");
    await bucketRequestStarted;

    const allySection = page
      .locator("section")
      .filter({ has: page.getByRole("heading", { name: "아군 선택" }) })
      .first();
    await allySection.locator("input").fill("재키");
    const nextAlly = allySection.locator('button[title="재키 (양손검)"]');
    await expect(nextAlly).toBeVisible();
    await nextAlly.click();
    await page.waitForURL(/[?&]ally2=1(?:&|$)/, { timeout: 10_000 });

    await expect(page.locator('a[href^="/character/5?"]').first()).toBeVisible();
    await expect(page.locator('a[href^="/character/2?"]')).toHaveCount(0);
    expect(requestCount).toBe(1);
  });
});
