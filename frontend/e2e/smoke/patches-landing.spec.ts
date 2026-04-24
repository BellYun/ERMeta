import { expect, test } from "@playwright/test";

// 🥉 패치 랜딩 페이지 스모크.
// 가정 (2026-04-22 구현 예정):
// - /patches/[version] SSG + ISR 페이지 (revalidate 3600)
// - 페이지 내용: 요약 3줄 + 떡상 Top 5 + 떡락 Top 5 카드
// - 현재 최신 패치 10.7 기준 테스트. 10.8 배포되면 fixture 갱신 필요.

test.describe("패치 랜딩 — 스모크", () => {
  test("/patches/10.7 가 200 응답을 반환한다", async ({ page }) => {
    const res = await page.goto("/patches/10.7");
    expect(res?.status()).toBeLessThan(400);
  });

  test("/patches/10.7 페이지 타이틀 또는 h1 에 '10.7' 이 포함된다", async ({ page }) => {
    await page.goto("/patches/10.7");

    const title = await page.title();
    const h1Text = (await page.getByRole("heading", { level: 1 }).first().textContent()) ?? "";

    expect(title + h1Text).toMatch(/10\.7/);
  });

  test("/patches/10.7 에 떡상/떡락 섹션이 노출된다", async ({ page }) => {
    await page.goto("/patches/10.7");

    const rising = page.getByText(/떡상|상승|rising|버프/i);
    const falling = page.getByText(/떡락|하락|falling|너프/i);

    await expect(rising.first()).toBeVisible({ timeout: 20_000 });
    await expect(falling.first()).toBeVisible({ timeout: 20_000 });
  });

  test("/patches/10.7 Top 5 카드 영역이 존재한다 (최소 3개 이상 캐릭터 관련 요소)", async ({
    page,
  }) => {
    await page.goto("/patches/10.7");

    // 카드 영역: article 요소 또는 캐릭터 이미지/이름 반복
    const cards = page.getByRole("article").or(page.locator('[data-testid^="patch-card"]'));
    const count = await cards.count();

    // 떡상 5 + 떡락 5 = 최소 10, 하지만 카드 구조 다양성 고려 최소 5 이상 확인
    expect(count).toBeGreaterThanOrEqual(5);
  });
});
