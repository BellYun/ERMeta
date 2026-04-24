import { expect, test } from "@playwright/test";

// 🥈 Q&A 카테고리 인터랙션 플로.
// 가정 (2026-04-22 구현 예정):
// - 카테고리 버튼 클릭 시 답변 영역에 텍스트 출력
// - 답변 영역: data-testid='qa-answer' 또는 role='region' 또는 aria-live='polite'
// - 서로 다른 카테고리 클릭 시 답변 텍스트가 변경된다
// - 답변은 `ai`/`@ai-sdk/anthropic` 기반 스트리밍 또는 사전 생성된 정적 텍스트일 수 있음.
//   타이핑 애니메이션(문자 단위 렌더)이 있을 경우 최종 텍스트 길이가 임계치 도달할 때까지 poll.

const hasSupabase = !!process.env.NEXT_PUBLIC_SUPABASE_URL;

// 답변 영역 selector: testid > aria-live > role=region 순 폴백
function qaAnswer(page: import("@playwright/test").Page) {
  return page
    .getByTestId("qa-answer")
    .or(page.locator('[aria-live="polite"]'))
    .or(page.getByRole("region", { name: /답변|answer/i }))
    .first();
}

test.describe("Flow: 캐릭터 Q&A 카테고리 인터랙션", () => {
  test.skip(!hasSupabase, "NEXT_PUBLIC_SUPABASE_URL 미주입 → skip");

  test("'강점' 카테고리 클릭 시 답변 영역에 50자 이상 텍스트 출력", async ({ page }) => {
    await page.goto("/character/1");

    const strengthButton = page.getByRole("button", { name: /강점/ }).first();
    await expect(strengthButton).toBeVisible({ timeout: 15_000 });
    await strengthButton.click();

    const answer = qaAnswer(page);
    await expect(answer).toBeVisible({ timeout: 15_000 });

    // 타이핑/스트리밍 완료 여부 독립적으로, 최종 텍스트 ≥50자가 될 때까지 poll (최대 15s)
    await expect(answer).toContainText(/[\s\S]{50,}/, { timeout: 15_000 });
  });

  test("'강점' → '약점' 전환 시 답변 텍스트가 변경된다", async ({ page }) => {
    await page.goto("/character/1");

    const strengthButton = page.getByRole("button", { name: /강점/ }).first();
    await expect(strengthButton).toBeVisible({ timeout: 15_000 });
    await strengthButton.click();

    const answer = qaAnswer(page);
    await expect(answer).toContainText(/[\s\S]{50,}/, { timeout: 15_000 });
    const strengthText = ((await answer.textContent()) ?? "").trim();

    const weaknessButton = page.getByRole("button", { name: /약점/ }).first();
    await weaknessButton.click();

    // 텍스트가 실제로 다르게 바뀔 때까지 poll (타이핑 속도 독립)
    await expect
      .poll(async () => ((await answer.textContent()) ?? "").trim(), { timeout: 15_000 })
      .not.toEqual(strengthText);

    const weaknessText = ((await answer.textContent()) ?? "").trim();
    expect(weaknessText.length).toBeGreaterThanOrEqual(50);
  });
});
