import { expect, test } from "@playwright/test";

const MOBILE_VIEWPORT = { width: 390, height: 844 };

test.describe("홈 광고 배치", () => {
  test("모바일에서는 실험군에 맞는 위치에 본문 광고 하나만 노출한다", async ({ page }) => {
    await page.setViewportSize(MOBILE_VIEWPORT);

    for (const variant of ["before_forecast", "after_forecast"] as const) {
      await page.goto(`/ko?homeAdPlacementVariant=${variant}`);

      await expect(page.locator("html")).toHaveAttribute("data-home-ad-placement-variant", variant);

      const homeAd = page.locator('[data-ad-slot-name="home_ranking"]');
      const forecast = page.locator(".home-forecast-preview");

      await expect(homeAd).toHaveCount(1);
      await expect(homeAd).toBeVisible();
      await expect(homeAd).toHaveAttribute("data-ad-slot-status", "preview");
      await expect(page.locator('[data-ad-slot-name^="site_rail_"]')).toHaveCount(0);

      const homeAdBox = await homeAd.boundingBox();
      const forecastBox = await forecast.boundingBox();

      expect(homeAdBox).not.toBeNull();
      expect(forecastBox).not.toBeNull();

      if (variant === "before_forecast") {
        expect(homeAdBox!.y + homeAdBox!.height).toBeLessThanOrEqual(forecastBox!.y);
      } else {
        expect(forecastBox!.y + forecastBox!.height).toBeLessThanOrEqual(homeAdBox!.y);
      }
    }
  });

  test("데스크톱에서는 고정 본문 광고와 기존 왼쪽 레일 광고를 함께 노출한다", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto("/ko?homeAdPlacementVariant=after_forecast");

    const homeAd = page.locator('[data-ad-slot-name="home_ranking"]');
    const forecast = page.locator(".home-forecast-preview");

    await expect(homeAd).toHaveCount(1);
    await expect(homeAd).toBeVisible();
    await expect(homeAd).toHaveAttribute("data-ad-slot-status", "preview");
    await expect(homeAd).not.toHaveAttribute("data-ad-experiment");
    await expect(page.locator('[data-ad-slot-name="site_rail_left"]')).toBeVisible();
    await expect(page.locator('[data-ad-slot-name="site_rail_right"]')).toHaveCount(0);

    const homeAdBox = await homeAd.boundingBox();
    const forecastBox = await forecast.boundingBox();

    expect(homeAdBox).not.toBeNull();
    expect(forecastBox).not.toBeNull();
    expect(homeAdBox!.y + homeAdBox!.height).toBeLessThanOrEqual(forecastBox!.y);
  });
});
