import { expect, test } from "@playwright/test";

// 사용자 여정: 홈에서 티어 랭킹의 캐릭터 카드를 클릭해 상세 페이지로 이동한다.
// CharacterCard(Link)가 렌더한 실제 <a>를 클릭하므로 desktop/mobile 양 프로젝트에서 동작한다.
test.describe("Flow: 홈 → 캐릭터 상세", () => {
  test("티어 랭킹에서 캐릭터 카드를 클릭하면 /character/{code}로 이동한다", async ({ page }) => {
    await page.goto("/");

    await expect(page.getByRole("heading", { name: /캐릭터 순위/ })).toBeVisible({
      timeout: 20_000,
    });

    const firstCharacterLink = page.locator('a[href^="/character/"]:visible').first();
    await expect(firstCharacterLink).toBeVisible({ timeout: 20_000 });

    const href = await firstCharacterLink.getAttribute("href");
    expect(href).toMatch(/^\/character\/\d+/);

    await firstCharacterLink.click();

    await page.waitForURL(/\/character\/\d+/, { timeout: 15_000 });

    await expect(page).toHaveTitle(/캐릭터 분석/);
    await expect(page.getByRole("heading", { level: 1 }).first()).toBeVisible({
      timeout: 20_000,
    });
  });
});
