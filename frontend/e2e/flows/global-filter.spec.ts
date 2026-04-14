import { expect, test } from "@playwright/test";

// 사용자 여정: 홈에서 패치/티어 필터를 바꾸면 TierRankingTable이 /api/character/mithril-rp-ranking
// 을 새 쿼리로 다시 호출한다. (FilterContext는 URL이 아니라 React state 기반이므로 검증 기준은 네트워크다.)
test.describe("Flow: Global Filter → 랭킹 refetch", () => {
  test("'다이아' 티어 버튼을 누르면 ranking API를 tier=DIAMOND 로 재호출한다", async ({ page }) => {
    await page.goto("/");

    const diamondButton = page.getByRole("button", { name: "다이아" });
    await expect(diamondButton).toBeVisible({ timeout: 15_000 });

    const responsePromise = page.waitForResponse(
      (res) =>
        res.url().includes("/api/character/mithril-rp-ranking") &&
        res.url().includes("tier=DIAMOND"),
      { timeout: 15_000 }
    );

    await diamondButton.click();

    const response = await responsePromise;
    expect(response.status()).toBe(200);
    // active 클래스명은 Tailwind arbitrary value 기반이라 테마 변경에 취약 →
    // 네트워크 응답 URL이 tier=DIAMOND 로 바뀌었다는 사실을 primary signal로 유지한다.
  });

  test("다른 패치로 select 변경 시 ranking API를 새 patchVersion 으로 재호출한다", async ({
    page,
  }) => {
    await page.goto("/");

    const patchSelect = page.locator("select").first();
    await expect(patchSelect).toBeVisible({ timeout: 15_000 });

    const allValues = await patchSelect.evaluate((el) =>
      Array.from((el as HTMLSelectElement).options).map((o) => o.value)
    );
    const currentValue = await patchSelect.inputValue();
    const nextPatch = allValues.find((v) => v && v !== currentValue);
    test.skip(!nextPatch, "다른 패치 옵션이 없으면 검증 불가");

    const responsePromise = page.waitForResponse(
      (res) =>
        res.url().includes("/api/character/mithril-rp-ranking") &&
        res.url().includes(`patchVersion=${encodeURIComponent(nextPatch!)}`),
      { timeout: 15_000 }
    );

    await patchSelect.selectOption(nextPatch!);

    const response = await responsePromise;
    expect(response.status()).toBe(200);
  });
});
