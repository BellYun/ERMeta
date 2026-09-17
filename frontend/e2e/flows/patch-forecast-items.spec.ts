import { expect, test } from "@playwright/test";

test("12.4 예상에 장비 간접 영향과 신규 아이템 불확실성을 표시한다", async ({ page }) => {
  const response = await page.goto("/ko/patch-forecast/12.4");
  expect(response?.status()).toBeLessThan(400);

  await expect(page.getByText(/신규 전설 월왕구천·별 조각은 사전 선택률이 없어/)).toBeVisible();

  const rio = page.locator(".home-forecast-row").filter({
    has: page.locator(".home-forecast-identity strong", { hasText: /^리오$/ }),
  });
  await expect(rio).toHaveCount(1);
  await expect(rio).toContainText("갤럭시 스텝");
  await expect(rio).toContainText("12.3 사용 57.5%");

  const bernice = page.locator(".home-forecast-row").filter({
    has: page.locator(".home-forecast-identity strong", { hasText: /^버니스$/ }),
  });
  await expect(bernice).toHaveCount(1);
  await expect(bernice).toContainText("화령장");
  await expect(bernice).toContainText("갤럭시 스텝");
});
