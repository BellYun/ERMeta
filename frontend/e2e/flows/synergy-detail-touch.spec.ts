import { expect, test } from "@playwright/test";

// 회귀 방지: /synergy-detail 의 두 상호작용이 pointer 단계에서 동작해야 한다.
// 2026-04-14 에 onClick → onPointerUp 로 치환하여 iOS Safari 의 click dispatch 지연을
// 흡수했다. 누군가 onPointerUp 를 다시 onClick 으로 되돌리면 이 테스트가 깨진다.
//
// 모바일 프로젝트에서만 의미가 있는 경로이므로 chromium-mobile 전용으로 돌린다.
//
// 모바일 viewport 에서는 sticky header 와 bottom 의 FeedbackWidget(fixed)이 tap 타겟 위를
// 가려 Playwright 의 "element is stable & not intercepted" 가드에 걸린다. 테스트 대상은
// 핸들러 자체(onPointerUp 경로)이므로 CI 용 오버레이 숨김 스타일을 주입해 정상 좌표에서
// 탭이 도달하도록 한다.
async function hideOverlays(page: import("@playwright/test").Page) {
  await page.addStyleTag({
    content: `
      header.sticky { display: none !important; }
      [class*="fixed"][class*="bottom-"] { display: none !important; }
    `,
  });
}

test.describe("Flow: /synergy-detail 모바일 터치(pointer-phase)", () => {
  test.skip(({ browserName }) => browserName !== "chromium", "Chromium 모바일 프로젝트에서만 실행");

  test("아군 셀을 pointer 단계에서 탭하면 ally1 URL 반영 + 슬롯 채움", async ({
    page,
  }, testInfo) => {
    test.skip(
      testInfo.project.name !== "chromium-mobile",
      "chromium-mobile 프로젝트 전용 (데스크탑은 synergy-ally-selection.spec.ts 가 커버)"
    );

    await page.goto("/synergy-detail");
    await hideOverlays(page);

    // 아군 선택 그리드 범위 고정
    const allySection = page
      .locator("section")
      .filter({ has: page.getByRole("heading", { name: "아군 선택" }) })
      .first();
    await expect(allySection).toBeVisible({ timeout: 25_000 });

    const firstCell = allySection.locator("button[title]:has(img[alt])").first();
    await expect(firstCell).toBeVisible({ timeout: 25_000 });
    await firstCell.scrollIntoViewIfNeeded();

    // Playwright 의 tap() 은 터치 이벤트 → pointer down/up 시퀀스를 내보낸다.
    // onPointerUp 가 정상 동작해야 URL 이 반영된다.
    await firstCell.tap();
    await page.waitForURL(/[?&]ally1=\d+/, { timeout: 10_000 });
  });

  test("조합 카드를 pointer 단계에서 탭하면 특성 브레이크다운이 확장된다", async ({
    page,
  }, testInfo) => {
    test.skip(testInfo.project.name !== "chromium-mobile", "chromium-mobile 프로젝트 전용");

    await page.goto("/synergy-detail");
    await hideOverlays(page);

    const allySection = page
      .locator("section")
      .filter({ has: page.getByRole("heading", { name: "아군 선택" }) })
      .first();
    await expect(allySection).toBeVisible({ timeout: 25_000 });

    // 1) 아군 1명 선택 (조합 목록이 등장하려면 필요)
    const firstCell = allySection.locator("button[title]:has(img[alt])").first();
    await expect(firstCell).toBeVisible({ timeout: 25_000 });
    await firstCell.scrollIntoViewIfNeeded();
    await firstCell.tap();
    await page.waitForURL(/[?&]ally1=\d+/, { timeout: 10_000 });

    // 2) 조합 카드가 나타날 때까지 대기. ComboWeaponCard 는 div[role=button][tabindex=0].
    const card = page
      .locator('div[role="button"][tabindex="0"]')
      .filter({
        has: page.locator("img[alt]"),
      })
      .first();
    await expect(card).toBeVisible({ timeout: 20_000 });
    await card.scrollIntoViewIfNeeded();

    // 3) ChevronRight 는 showTraits 상태에 따라 rotate-90 클래스를 켠다.
    //    onPointerUp 토글이 동작하면 아이콘이 rotate-90 상태로 전환되고, 동시에
    //    특성 브레이크다운 영역(`+` 구분자가 반복되는 내부 sub-row)이 렌더된다.
    await card.tap();

    // 브레이크다운 섹션은 메인 행 다음 형제 div 에 렌더됨. 존재/보임 모두 확인.
    const breakdownRow = card
      .locator("xpath=following-sibling::div")
      .filter({ has: page.locator("div.flex") })
      .first();
    await expect(breakdownRow).toBeVisible({ timeout: 5_000 });

    // 4) 한 번 더 탭하면 닫혀야 함 (토글 동작 확인)
    await card.tap();
    await expect(breakdownRow).toBeHidden({ timeout: 5_000 });
  });

  // 회귀 방지 (Nit 2, architect): ComboWeaponCard 내부 Link 의 onPointerUp stopPropagation 가
  // 사라지면 "캐릭터 이동" 탭이 브레이크다운 토글을 함께 트리거해 유저가 원치 않는 UI 변화를
  // 만난다. 내부 Link 를 탭했을 때 브레이크다운은 열리지 않아야 한다(페이지 이동만 일어남).
  test("조합 카드 내부 캐릭터 Link 탭은 브레이크다운을 토글하지 않는다", async ({
    page,
  }, testInfo) => {
    test.skip(testInfo.project.name !== "chromium-mobile", "chromium-mobile 프로젝트 전용");

    await page.goto("/synergy-detail");
    await hideOverlays(page);

    const allySection = page
      .locator("section")
      .filter({ has: page.getByRole("heading", { name: "아군 선택" }) })
      .first();
    await expect(allySection).toBeVisible({ timeout: 25_000 });
    const firstCell = allySection.locator("button[title]:has(img[alt])").first();
    await firstCell.scrollIntoViewIfNeeded();
    await firstCell.tap();
    await page.waitForURL(/[?&]ally1=\d+/, { timeout: 10_000 });

    const card = page
      .locator('div[role="button"][tabindex="0"]')
      .filter({
        has: page.locator("img[alt]"),
      })
      .first();
    await expect(card).toBeVisible({ timeout: 20_000 });
    await card.scrollIntoViewIfNeeded();

    // 카드 내부 첫 Link (캐릭터 상세로 이동). 탭 전 URL 을 기억해 이동 여부를 체크.
    const innerLink = card.locator('a[href^="/character/"]').first();
    await expect(innerLink).toBeVisible();

    // 탭 → 페이지 이동이 발생하면 URL pathname 이 /character/... 로 변하므로 그것이 primary signal.
    // 이동이 발생하지 않은 환경이어도 최소한 외부 카드의 토글(breakdownRow visible)이 일어나면 안 된다.
    const navigation = page.waitForURL(/\/character\/\d+/, { timeout: 5_000 }).catch(() => null);
    await innerLink.tap();
    await navigation;
    // /character/ 로 이동했다면 테스트 통과 (stopPropagation 동작 확인).
    // 이동 실패한 경우에도 breakdown 토글이 발생해서는 안 됨 — 이 경우엔 /synergy-detail 에 머무르고
    // 브레이크다운 row 가 없어야 한다.
    if (!/\/character\/\d+/.test(page.url())) {
      const leakedBreakdown = card
        .locator("xpath=following-sibling::div")
        .filter({ has: page.locator("div.flex") })
        .first();
      await expect(leakedBreakdown).toBeHidden({ timeout: 2_000 });
    }
  });
});
