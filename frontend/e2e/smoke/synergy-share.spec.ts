import { expect, test, type Page } from "@playwright/test";

const trioRows = [
  {
    character1: 6,
    weaponType1: 8,
    character2: 10,
    weaponType2: 1,
    character3: 1,
    weaponType3: 1,
    mainCore1: 0,
    mainCore2: 0,
    mainCore3: 0,
    totalGames: 120,
    winRate: 24.5,
    averageRP: 8.7,
    averageRank: 3.5,
  },
  {
    character1: 6,
    weaponType1: 8,
    character2: 10,
    weaponType2: 1,
    character3: 2,
    weaponType3: 2,
    mainCore1: 0,
    mainCore2: 0,
    mainCore3: 0,
    totalGames: 5,
    winRate: 40,
    averageRP: 10.2,
    averageRank: 3.1,
  },
];

async function mockSynergyApis(page: Page) {
  await page.route(/\/api\/stats\/trios-weapon(?:\?.*)?$/, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      headers: { "Cache-Control": "no-store" },
      body: JSON.stringify({ results: trioRows }),
    });
  });
  await page.route("**/api/traits/names*", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ names: {} }),
    });
  });
}

test.describe("시너지 상세 URL 공유·복원", () => {
  test.beforeEach(async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "chromium-desktop", "데스크탑 공유 경로 전용");
    await mockSynergyApis(page);
  });

  test("비교·정렬·표본 조건을 새로고침 후 복원하고 공유 URL에 유지한다", async ({
    page,
    context,
  }) => {
    await context.grantPermissions(["clipboard-read", "clipboard-write"]);
    await page.goto("/synergy-detail?ally1=6&w1=8&ally2=10&w2=1&sort=tierScore&minGames=30");

    await expect(page.locator('[data-ally-character="6"][data-ally-weapon="8"]')).toBeVisible();
    await expect(page.locator('[data-ally-character="10"][data-ally-weapon="1"]')).toBeVisible();
    await expect(page.getByLabel("최소 표본")).toHaveValue("30");
    await expect(page.getByRole("button", { name: "티어 점수" })).toHaveAttribute(
      "data-active",
      "true"
    );
    await page.reload();

    await expect(page.locator('[data-ally-character="6"][data-ally-weapon="8"]')).toBeVisible();
    await expect(page.locator('[data-ally-character="10"][data-ally-weapon="1"]')).toBeVisible();
    await expect(page.getByLabel("최소 표본")).toHaveValue("30");
    await expect(page.getByRole("button", { name: "티어 점수" })).toHaveAttribute(
      "data-active",
      "true"
    );

    await page.getByRole("button", { name: "공유" }).click();
    const sharedUrl = await page.evaluate(() => navigator.clipboard.readText());
    const sharedParams = new URL(sharedUrl).searchParams;
    expect(sharedParams.get("ally1")).toBe("6");
    expect(sharedParams.get("w1")).toBe("8");
    expect(sharedParams.get("ally2")).toBe("10");
    expect(sharedParams.get("w2")).toBe("1");
    expect(sharedParams.get("sort")).toBe("tierScore");
    expect(sharedParams.get("minGames")).toBe("30");
    expect(sharedParams.has("focus")).toBe(false);
    expect(sharedParams.get("utm_source")).toBe("ergg_share");
    expect(sharedParams.get("utm_medium")).toBe("clipboard");
    expect(sharedParams.get("utm_campaign")).toBe("synergy_detail");

    await page.getByRole("button", { name: "아군 초기화하기" }).click();
    await expect.poll(() => new URL(page.url()).searchParams.has("ally1")).toBe(false);
    const resetParams = new URL(page.url()).searchParams;
    expect(resetParams.get("sort")).toBe("tierScore");
    expect(resetParams.get("minGames")).toBe("30");
  });

  test("최소 표본 미만 조합을 숨기고 전체 표본 전환 시 다시 노출한다", async ({ page }) => {
    await page.goto("/synergy-detail?ally1=6&w1=8&ally2=10&w2=1&minGames=10");

    await expect(page.locator('a[href^="/character/1?"]').first()).toBeVisible();
    await expect(page.locator('a[href^="/character/2?"]')).toHaveCount(0);

    await page.getByLabel("최소 표본").selectOption("0");
    await expect.poll(() => new URL(page.url()).searchParams.has("minGames")).toBe(false);
    await expect(page.locator('a[href^="/character/2?"]').first()).toBeVisible();
  });
});
