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
    // CharacterCard는 ?weapon 없이 /character/{code} 로만 링크되므로 기본 네비만 검증한다.
    // 꿀챔 카드 경로는 desktop HoneyPicks가 weapon 파라미터를 붙이지만 모바일은 sheet를 열어
    // 크로스 뷰포트 안정성이 낮음 — 단위 테스트에서 별도 보장.

    await firstCharacterLink.click();

    await page.waitForURL(/\/character\/\d+/, { timeout: 15_000 });

    await expect(page).toHaveTitle(/캐릭터 분석/);
    await expect(page.getByRole("heading", { level: 1 }).first()).toBeVisible({
      timeout: 20_000,
    });
  });
});
