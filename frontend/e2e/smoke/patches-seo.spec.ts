import { expect, test } from "@playwright/test";

// 🥉 패치 랜딩 SEO 스모크.
// 가정 (2026-04-22 구현 예정):
// - /patches/10.7 페이지에 og:title / og:image meta 존재
// - <script type='application/ld+json'> 에 '@type':'Article' 포함
// - /sitemap.xml 에 /patches/ URL 포함

test.describe("패치 랜딩 — SEO", () => {
  test("/patches/10.7 canonical link 존재", async ({ page }) => {
    await page.goto("/patches/10.7");

    const canonical = page.locator('link[rel="canonical"]');
    await expect(canonical).toHaveCount(1);
    await expect(canonical).toHaveAttribute("href", /\/patches\/10\.7/);
  });

  test("/patches/10.7 HEAD 에 og:title 과 og:image 가 설정된다", async ({ page }) => {
    await page.goto("/patches/10.7");

    const ogTitle = page.locator('meta[property="og:title"]');
    const ogImage = page.locator('meta[property="og:image"]');

    await expect(ogTitle).toHaveCount(1);
    await expect(ogTitle).toHaveAttribute("content", /.+/);

    await expect(ogImage).toHaveCount(1);
    await expect(ogImage).toHaveAttribute("content", /.+/);
  });

  test("/patches/10.7 페이지에 JSON-LD Article 구조화 데이터가 포함된다", async ({ page }) => {
    await page.goto("/patches/10.7");

    const jsonLdScripts = page.locator('script[type="application/ld+json"]');
    const count = await jsonLdScripts.count();
    expect(count).toBeGreaterThanOrEqual(1);

    // 모든 JSON-LD 스크립트 중 Article 타입이 하나 이상 있어야 함
    let hasArticle = false;
    for (let i = 0; i < count; i++) {
      const raw = (await jsonLdScripts.nth(i).textContent()) ?? "";
      try {
        const parsed = JSON.parse(raw);
        const type = parsed["@type"] ?? "";
        if (type === "Article" || (Array.isArray(type) && type.includes("Article"))) {
          hasArticle = true;
          break;
        }
      } catch {
        // 다른 스크립트일 수 있음 — 스킵
      }
    }
    expect(hasArticle).toBe(true);
  });

  test("/sitemap.xml 에 /patches/ URL 이 포함된다", async ({ request }) => {
    const res = await request.get("/sitemap.xml");
    expect(res.status()).toBe(200);
    const body = await res.text();
    expect(body).toContain("/patches/");
  });
});
