import { expect, test } from "@playwright/test";

test("한국어 메인 콘텐츠 링크는 /ko 없이 이동한다", async ({ page }) => {
  await page.goto("/");

  const forecastLink = page.locator(".home-forecast-preview__cta");
  await expect(forecastLink).toHaveAttribute("href", /^\/patch-forecast\/[^/]+#forecast-results$/);
  await expect(page.locator(".home-forecast-identity")).toHaveAttribute(
    "href",
    /^\/character\/\d+\?weapon=\d+$/
  );
  await expect(page.getByRole("link", { name: "실험체 티어표 보기" })).toHaveAttribute(
    "href",
    "/rankings"
  );
  await expect(page.getByRole("link", { name: "조합 찾아보기" })).toHaveAttribute(
    "href",
    "/synergy-detail"
  );

  await forecastLink.click();
  await expect(page).toHaveURL(/^https?:\/\/[^/]+\/patch-forecast\/[^/]+#forecast-results$/);
  await expect(page.getByRole("link", { name: "패치노트 보기" })).toHaveAttribute(
    "href",
    /^\/patches\//
  );
});

test("한국어 티어표의 후속 링크도 /ko 없이 이동한다", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("link", { name: "실험체 티어표 보기" }).click();
  await expect(page).toHaveURL(/^https?:\/\/[^/]+\/rankings$/);
  await expect(page.locator(".home-search-hero__quick-links a").first()).toHaveAttribute(
    "href",
    "/synergy-detail"
  );
});

for (const locale of ["en", "ja"] as const) {
  test(`${locale} 메인 콘텐츠 링크는 언어 경로를 유지한다`, async ({ page }) => {
    await page.goto(`/${locale}`);

    await expect(page.locator(".home-entry__rankings > a")).toHaveAttribute(
      "href",
      `/${locale}/rankings`
    );
    await expect(page.locator(".home-entry__primary")).toHaveAttribute(
      "href",
      `/${locale}/synergy-detail`
    );
    await expect(page.locator(".home-forecast-preview__cta")).toHaveAttribute(
      "href",
      new RegExp(`^/${locale}/patch-forecast/[^/]+#forecast-results$`)
    );
  });
}
