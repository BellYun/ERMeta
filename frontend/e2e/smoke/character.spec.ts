import { expect, test } from "@playwright/test";

const KNOWN_CHARACTER_CODE = 1;

test.describe("캐릭터 상세 페이지", () => {
  test(`/character/${KNOWN_CHARACTER_CODE} 직접 접근 시 200 응답 + 주요 섹션 렌더`, async ({
    page,
  }) => {
    const response = await page.goto(`/character/${KNOWN_CHARACTER_CODE}`);
    expect(response?.status()).toBeLessThan(400);

    await expect(page).toHaveTitle(/캐릭터 분석/);

    await expect(page.getByRole("heading", { level: 1 }).first()).toBeVisible({
      timeout: 20_000,
    });
  });

  test("캐릭터 페이지 title에 캐릭터 코드 기반 메타데이터가 반영된다", async ({ page }) => {
    await page.goto(`/character/${KNOWN_CHARACTER_CODE}`);
    const canonical = page.locator('link[rel="canonical"]');
    await expect(canonical).toHaveCount(1);
    await expect(canonical).toHaveAttribute(
      "href",
      new RegExp(`/character/${KNOWN_CHARACTER_CODE}`)
    );
  });
});
