import { expect, test } from "@playwright/test";

// 시너지 상세의 일반 도구 URL은 정적 metadata를 사용하고,
// 조합별 공유 경로만 캐릭터가 포함된 OG metadata를 만든다.

// OG 엔드포인트 자체는 Supabase 의존이 없는 순수 Next.js 라우트 핸들러이므로
// describe-level skip 가드를 쓰지 않고 각 페이지 렌더 테스트에만 개별 skip 적용.
const hasSupabase = !!process.env.NEXT_PUBLIC_SUPABASE_URL;

function getMetaContent(html: string, attribute: string, value: string): string | null {
  const tag = html
    .match(/<meta\b[^>]*>/g)
    ?.find((candidate) => candidate.includes(`${attribute}="${value}"`));
  return tag?.match(/content="([^"]+)"/)?.[1]?.replaceAll("&amp;", "&") ?? null;
}

test.describe("시너지 공유 — OG 이미지", () => {
  test("/synergy-detail/opengraph-image 엔드포인트가 image 응답을 반환한다", async ({
    request,
  }) => {
    // 순수 이미지 라우트 — Supabase 없이 동작한다고 가정
    const res = await request.get("/synergy-detail/opengraph-image?a=1&b=2&c=3");
    expect(res.status()).toBe(200);
    const contentType = res.headers()["content-type"] ?? "";
    expect(contentType).toMatch(/^image\//);
  });

  test("/synergy-detail 페이지 HEAD 에 og:image meta 가 설정된다", async ({ page }) => {
    test.skip(!hasSupabase, "NEXT_PUBLIC_SUPABASE_URL 미주입 → skip");

    await page.goto("/synergy-detail?a=1&b=2&c=3");

    const ogImage = page.locator('meta[property="og:image"]');
    await expect(ogImage).toHaveCount(1);
    await expect(ogImage).toHaveAttribute("content", /.+/);
  });

  test("/synergy-detail 페이지 HEAD 에 twitter:card meta 존재", async ({ page }) => {
    test.skip(!hasSupabase, "NEXT_PUBLIC_SUPABASE_URL 미주입 → skip");

    await page.goto("/synergy-detail?a=1&b=2&c=3");

    const twitterCard = page.locator('meta[name="twitter:card"]');
    await expect(twitterCard).toHaveCount(1);
  });

  test("일반 도구 URL의 metadata는 query와 무관하다", async ({ request }) => {
    const res = await request.get("/synergy-detail?ally1=1&ally2=2");
    expect(res.status()).toBe(200);

    const ogImage = getMetaContent(await res.text(), "property", "og:image");
    expect(ogImage).not.toBeNull();
    expect(new URL(ogImage!, "http://localhost").search).toBe("");
  });

  test("조합별 공유 경로의 metadata에는 캐릭터 코드가 포함된다", async ({ request }) => {
    const res = await request.get("/synergy-detail/share/1-2?sort=averageRP");
    expect(res.status()).toBe(200);

    const ogImage = getMetaContent(await res.text(), "property", "og:image");
    expect(ogImage).not.toBeNull();
    const ogImageUrl = new URL(ogImage!, "http://localhost");
    expect(ogImageUrl.searchParams.get("ally1")).toBe("1");
    expect(ogImageUrl.searchParams.get("ally2")).toBe("2");
  });

  test("등록되지 않은 조합 공유 경로는 404를 반환한다", async ({ request }) => {
    const res = await request.get("/synergy-detail/share/1x-2");
    expect(res.status()).toBe(404);
    expect(await res.text()).toContain("페이지를 찾을 수 없습니다");
  });
});
