import { expect, test } from "@playwright/test";

test.describe("trio-lab detail navigation", () => {
  test("combo detail opens as a full page", async ({ page }) => {
    await page.goto("/trio-lab");

    await expect(page.getByText("조합 검색")).toBeVisible();

    const firstDetailLink = page.getByRole("link", { name: "조합 상세 보기" }).first();
    test.skip(
      (await firstDetailLink.count()) === 0,
      "trio-lab 데이터가 없는 CI 환경에서는 상세 링크 검증을 건너뜁니다."
    );

    await expect(firstDetailLink).toBeVisible();
    await firstDetailLink.click();

    await expect(page).toHaveURL(/\/trio-lab\/[^/?]+/);
    await expect(
      page.locator("main").getByRole("link", { name: "조합 실험실" }).first()
    ).toBeVisible();
  });
});
