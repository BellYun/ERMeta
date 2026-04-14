import { expect, test } from "@playwright/test";

// 사용자 여정: 모바일 뷰 하단 MobileTabBar를 통해 3개 탭(메타 / 조합 / 캐릭터) 사이를 이동한다.
// MobileTabBar는 Next Link 기반이므로 클릭 시 실제 URL이 변경된다.
test.describe("Flow: 모바일 TabBar 네비게이션", () => {
  test("MobileTabBar로 메타 → 조합 → 캐릭터 → 메타 순환 네비가 동작한다", async ({
    page,
  }, testInfo) => {
    test.skip(
      testInfo.project.name !== "chromium-mobile",
      "MobileTabBar는 모바일 뷰포트에서만 노출되는 컴포넌트"
    );

    await page.goto("/");

    const tabBar = page.getByRole("navigation").filter({ hasText: "메타" });
    await expect(tabBar).toBeVisible({ timeout: 15_000 });

    // 3개 탭이 모두 노출되는지 확인
    const metaLink = tabBar.getByRole("link", { name: /메타/ });
    const synergyLink = tabBar.getByRole("link", { name: /조합/ });
    const characterLink = tabBar.getByRole("link", { name: /캐릭터/ });
    await expect(metaLink).toBeVisible();
    await expect(synergyLink).toBeVisible();
    await expect(characterLink).toBeVisible();

    // '조합' → /synergy-detail 이동 확인
    await synergyLink.click();
    await page.waitForURL("**/synergy-detail", { timeout: 10_000 });

    // '캐릭터' → /character/1 이동 확인
    await tabBar.getByRole("link", { name: /캐릭터/ }).click();
    await page.waitForURL(/\/character\/\d+/, { timeout: 10_000 });

    // '메타' → / 복귀 확인
    await tabBar.getByRole("link", { name: /메타/ }).click();
    await page.waitForURL((url) => url.pathname === "/", { timeout: 10_000 });
  });
});
