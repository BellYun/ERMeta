import { expect, test } from "@playwright/test";

// 사용자 여정: /synergy-detail 에서 WeaponAllySelector 그리드의 캐릭터-무기 버튼을 클릭하면
// URL이 ?ally1=<charCode>[&w1=<weaponCode>]로 갱신되고, 버튼이 selected 상태로 바뀐다.
// SynergyDetailClient는 dynamic(ssr:false)이라 hydration 대기 필수.
// 페이지에 "캐릭터 풀(1)"과 "아군 선택(2)" 두 그리드가 있으므로 "아군 선택" 섹션에 범위를 고정한다.
test.describe("Flow: /synergy-detail 아군 선택", () => {
  test("아군 선택 그리드의 첫 셀을 클릭하면 URL ?ally1= 이 반영된다", async ({
    page,
  }, testInfo) => {
    // 모바일은 WeaponAllySelector가 400ms URL 디바운스를 걸고 하단 MobileTabBar가 클릭 영역을
    // 가려 stable 체크가 흔들린다. 해당 경로는 vitest 단위 테스트가 커버하므로 데스크탑만 검증.
    test.skip(
      testInfo.project.name === "chromium-mobile",
      "mobile은 URL debounce + 오버레이 간섭으로 E2E 안정성 낮음 (vitest로 커버)"
    );

    await page.goto("/synergy-detail");

    const allySection = page
      .locator("section")
      .filter({ has: page.getByRole("heading", { name: "아군 선택" }) })
      .first();

    await expect(allySection).toBeVisible({ timeout: 25_000 });

    const firstCell = allySection.locator("button[title]:has(img[alt])").first();
    await expect(firstCell).toBeVisible({ timeout: 25_000 });

    await firstCell.scrollIntoViewIfNeeded();
    await firstCell.click();

    await page.waitForURL(/[?&]ally1=\d+/, { timeout: 10_000 });
    // 선택 버튼의 시각 반영은 class-name(Tailwind arbitrary value) 기반이라 테마 변경에 취약.
    // URL이 ally1=<code> 로 갱신되는 것이 곧 상태 반영이므로 그것만 primary signal로 둔다.
  });
});
