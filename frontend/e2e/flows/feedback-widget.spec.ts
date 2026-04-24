import { expect, test } from "@playwright/test";

// FeedbackWidget FAB 회귀 방지.
//
// 과거 회귀 기록:
// 1. (원인) fixed wrapper 가 pointer-events 를 가지면 닫힌 panel 의 layout 박스(약 358×410px)가
//    모바일 하단 ~50% hit-test 를 흡수 → 다른 카드/버튼 미동작
//    fix: wrapper 에 pointer-events-none 적용
// 2. (회귀) wrapper 를 pointer-events-none 으로 바꾸면서 FAB 도 none 을 상속 → FAB 자체가 안 눌림.
//    "의견 보내기 버튼 안 눌림" VOC 로 재발견 (2026-04-24)
//    fix: FAB 에 pointer-events-auto 를 개별 지정
//
// 본 스펙은 2번 회귀의 재발 방지. FAB 가 실제로 클릭 가능한지 + 클릭 시 panel 이 뜨는지 검증.

test.describe("Flow: FeedbackWidget FAB 클릭 가능성", () => {
  test("데스크탑 — FAB 클릭 시 피드백 panel 이 노출된다", async ({ page }) => {
    await page.goto("/");

    const fab = page.getByRole("button", { name: "피드백 보내기" });
    await expect(fab).toBeVisible();

    await fab.click();

    const dialog = page.getByRole("dialog", { name: "피드백 보내기" });
    await expect(dialog).toBeVisible();
    // panel 이 열리면 FAB 의 aria-label 은 "피드백 닫기" 로 바뀜
    await expect(page.getByRole("button", { name: "피드백 닫기" })).toBeVisible();
  });

  test("모바일 — FAB 가 wrapper 의 pointer-events-none 에도 불구하고 클릭 가능", async ({
    page,
  }, testInfo) => {
    test.skip(
      testInfo.project.name !== "chromium-mobile",
      "모바일 뷰포트에서만 의미 있는 회귀 — 데스크탑 project 에서는 skip"
    );

    await page.goto("/");

    const fab = page.getByRole("button", { name: "피드백 보내기" });
    await expect(fab).toBeVisible();

    // 실제 hit-test 를 강제하기 위해 tap() 사용 (모바일 project 는 touch emulation)
    await fab.tap();

    const dialog = page.getByRole("dialog", { name: "피드백 보내기" });
    await expect(dialog).toBeVisible();
  });

  test("FAB 의 computed style 이 pointer-events:auto 로 해석된다", async ({ page }) => {
    await page.goto("/");

    const fab = page.getByRole("button", { name: "피드백 보내기" });
    await expect(fab).toBeVisible();

    const pointerEvents = await fab.evaluate((el) => getComputedStyle(el).pointerEvents);
    expect(pointerEvents).toBe("auto");
  });
});
