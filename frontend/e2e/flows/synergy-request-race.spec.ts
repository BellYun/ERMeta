import { expect, test, type Page } from "@playwright/test";

function trioRow(thirdCharacter: number) {
  return {
    character1: 6,
    weaponType1: 8,
    character2: 1,
    weaponType2: 1,
    character3: thirdCharacter,
    weaponType3: 1,
    mainCore1: 0,
    mainCore2: 0,
    mainCore3: 0,
    totalGames: 120,
    winRate: 25,
    averageRP: 8,
    averageRank: 3.5,
  };
}

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
  test("늦게 끝난 이전 요청이 최신 아군 조합 결과를 덮어쓰지 않는다", async ({
    page,
  }, testInfo) => {
    test.skip(testInfo.project.name !== "chromium-desktop", "데스크탑 회귀 경로 전용");
    await mockTraitNames(page);

    let markSingleRequestStarted: (() => void) | undefined;
    const singleRequestStarted = new Promise<void>((resolve) => {
      markSingleRequestStarted = resolve;
    });

    await page.route(/\/api\/stats\/trios-weapon(?:\?.*)?$/, async (route) => {
      const url = new URL(route.request().url());
      const isPairRequest = url.searchParams.has("character2");

      if (!isPairRequest) {
        markSingleRequestStarted?.();
        await new Promise((resolve) => setTimeout(resolve, 1_000));
      } else {
        await new Promise((resolve) => setTimeout(resolve, 40));
      }

      try {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          headers: { "Cache-Control": "no-store" },
          body: JSON.stringify({ results: [trioRow(isPairRequest ? 5 : 2)] }),
        });
      } catch {
        // AbortController가 이전 네트워크 요청을 끊으면 Playwright의 지연 fulfill도 실패한다.
      }
    });

    await page.goto("/synergy-detail?ally1=6&w1=8");
    await singleRequestStarted;

    const allySection = page
      .locator("section")
      .filter({ has: page.getByRole("heading", { name: "아군 선택" }) })
      .first();
    const nextAlly = allySection.locator("button[title]:not([disabled]):not(.outline)").first();
    await expect(nextAlly).toBeVisible();
    await nextAlly.click();
    await page.waitForURL(/[?&]ally2=\d+/, { timeout: 10_000 });

    await expect(page.locator('a[href^="/character/5?"]').first()).toBeVisible();
    await page.waitForTimeout(1_100);
    await expect(page.locator('a[href^="/character/2?"]')).toHaveCount(0);
    await expect(page.locator('a[href^="/character/5?"]').first()).toBeVisible();
  });
});
