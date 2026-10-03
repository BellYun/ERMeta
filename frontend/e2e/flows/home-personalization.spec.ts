import { expect, test } from "@playwright/test";

const STORAGE_KEY = "ergg-focus-char-weapons";

test.describe("Flow: 내 실험체 풀 → 홈 패치 성적 개인화", () => {
  test("미등록 사용자는 홈 첫 콘텐츠에서 등록 안내를 본다", async ({ page }) => {
    await page.addInitScript((key) => window.localStorage.removeItem(key), STORAGE_KEY);
    await page.goto("/ko");

    const prompt = page.getByTestId("home-personalization-empty");
    await expect(prompt).toBeVisible();
    await expect(prompt.getByRole("link", { name: "내 실험체 등록하기" })).toBeVisible();
  });

  test("저장된 풀을 홈과 조합 추천에서 동일하게 사용한다", async ({ page }) => {
    await page.addInitScript(({ key, value }) => window.localStorage.setItem(key, value), {
      key: STORAGE_KEY,
      value: JSON.stringify(["1:16"]),
    });
    await page.goto("/ko");

    const personalization = page.getByTestId("home-personalization-ready");
    await expect(personalization).toBeVisible();
    await expect(personalization.getByTestId("home-personalized-card")).toHaveCount(1);

    await personalization.getByRole("link", { name: "내 풀 편집" }).click();
    await expect(page).toHaveURL(/\/ko\/synergy-detail\?focusPool=open/);

    const pool = page.locator("#focus-weapon-pool");
    await expect(pool).toBeVisible();
    await expect(pool.getByRole("button", { name: /내 실험체 풀 1개/ })).toBeVisible();
  });
});
