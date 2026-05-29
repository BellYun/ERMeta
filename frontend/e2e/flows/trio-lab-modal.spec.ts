import { expect, test } from "@playwright/test";

test.describe("trio-lab detail navigation", () => {
  test("combo detail opens as a full page", async ({ page }) => {
    await page.goto("/trio-lab");

    await expect(page.getByText("조합 검색")).toBeVisible();

    const firstDetailLink = page.getByRole("link", { name: "조합 상세 보기" }).first();
    await expect(firstDetailLink).toBeVisible();
    await firstDetailLink.click();

    await expect(page).toHaveURL(/\/trio-lab\/[^/?]+/);
    await expect(page.getByRole("link", { name: "조합 실험실로 돌아가기" })).toBeVisible();
  });
});
