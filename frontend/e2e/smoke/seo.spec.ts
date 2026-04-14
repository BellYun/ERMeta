import { expect, test } from "@playwright/test";

test.describe("SEO 및 정적 에셋", () => {
  test("/robots.txt 200 + User-agent 포함", async ({ request }) => {
    const res = await request.get("/robots.txt");
    expect(res.status()).toBe(200);
    const body = await res.text();
    expect(body).toMatch(/User-agent/i);
  });

  test("/sitemap.xml 200 + urlset 포함", async ({ request }) => {
    const res = await request.get("/sitemap.xml");
    expect(res.status()).toBe(200);
    const body = await res.text();
    expect(body).toContain("<urlset");
  });

  test("홈 페이지 HEAD 메타: title/og:title/canonical", async ({ page }) => {
    await page.goto("/");

    await expect(page).toHaveTitle(/이리와지지/);

    const ogTitle = page.locator('meta[property="og:title"]');
    await expect(ogTitle).toHaveCount(1);
    await expect(ogTitle).toHaveAttribute("content", /.+/);

    const canonical = page.locator('link[rel="canonical"]');
    await expect(canonical).toHaveCount(1);
    await expect(canonical).toHaveAttribute("href", /https?:\/\//);
  });

  test("캐릭터 상세 페이지 canonical 이 동적 경로로 생성된다", async ({ page }) => {
    await page.goto("/character/1");
    const canonical = page.locator('link[rel="canonical"]');
    await expect(canonical).toHaveCount(1);
    await expect(canonical).toHaveAttribute("href", /\/character\/1/);
  });
});
