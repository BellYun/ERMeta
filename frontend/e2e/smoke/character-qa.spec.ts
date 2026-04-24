import { expect, test } from "@playwright/test";

// 🥈 Q&A 파일럿 섹션 스모크.
// 가정 (2026-04-22 구현 예정):
// - 상위 10 캐릭터 (파일럿 대상) 상세 페이지에 Q&A 섹션 노출
// - 섹션은 heading '자주 묻는 질문' 또는 data-testid='character-qa'
// - 5개 카테고리 버튼: 강점 / 약점 / 추천 빌드 / 상대법 / 초보
// - 파일럿 대상 외 캐릭터는 Q&A 섹션 미노출
//
// 파일럿 캐릭터 가정: code=1 (알파) 는 파일럿 top-10 에 포함됨.
// code=99 는 파일럿 제외 대상(또는 404 응답)으로 가정.

const hasSupabase = !!process.env.NEXT_PUBLIC_SUPABASE_URL;

test.describe("캐릭터 Q&A — 스모크", () => {
  test.skip(!hasSupabase, "NEXT_PUBLIC_SUPABASE_URL 미주입 → 실 DB 의존 테스트 skip");

  test("/character/1 (파일럿 대상) Q&A 섹션이 노출된다", async ({ page }) => {
    await page.goto("/character/1");

    // heading 방식 또는 testid 방식 중 어느 쪽이든 매칭
    const qaSection = page
      .getByRole("heading", { name: /자주 묻는 질문|Q&A|질문과 답/ })
      .or(page.getByTestId("character-qa"));

    await expect(qaSection.first()).toBeVisible({ timeout: 20_000 });
  });

  test("/character/1 Q&A 섹션에 5개 카테고리 버튼이 렌더링된다", async ({ page }) => {
    await page.goto("/character/1");

    // 카테고리 5종: 강점 / 약점 / 추천 빌드 / 상대법 / 초보
    const categories = ["강점", "약점", "빌드", "상대", "초보"];
    for (const cat of categories) {
      const button = page.getByRole("button", { name: new RegExp(cat) });
      await expect(button.first()).toBeVisible({ timeout: 15_000 });
    }
  });

  test("/character/99 (파일럿 제외 대상) Q&A 섹션은 노출되지 않는다", async ({ page }) => {
    const res = await page.goto("/character/99");
    const status = res?.status() ?? 404;

    // 계약 분기: 페이지가 존재하면(200 대역) Q&A 섹션이 없어야 하고,
    //           존재하지 않으면(4xx/5xx) 그 자체로 Q&A 미노출이 보장됨.
    if (status < 400) {
      const qaHeading = page.getByRole("heading", { name: /자주 묻는 질문|Q&A/ });
      const qaTestId = page.getByTestId("character-qa");
      await expect(qaHeading).toHaveCount(0);
      await expect(qaTestId).toHaveCount(0);
    } else {
      expect(status).toBeGreaterThanOrEqual(400);
    }
  });
});
