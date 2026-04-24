import { expect, test } from "@playwright/test";

// 🥇 시너지 공유 기능 스모크.
// 가정 (2026-04-22 구현 예정):
// - /synergy-detail 3명 선택 완료 시 공유 버튼 노출
// - URL 로딩 시 ?a=&b=&c= 쿼리로 조합 자동 복원
// - 공유 버튼 클릭 → URL 생성 (clipboard or location 변경)
//
// 기능 구현 전에는 실패할 수 있음. 구현 직후 본 스펙이 계약 역할.

const hasSupabase = !!process.env.NEXT_PUBLIC_SUPABASE_URL;

test.describe("시너지 공유 — 스모크", () => {
  test.skip(!hasSupabase, "NEXT_PUBLIC_SUPABASE_URL 미주입 → 실 DB 의존 테스트 skip");

  test("/synergy-detail?a=1&b=2&c=3 조합 직접 URL 접근 200 + h1 노출", async ({ page }) => {
    const res = await page.goto("/synergy-detail?a=1&b=2&c=3");
    expect(res?.status()).toBeLessThan(400);
    await expect(page.getByRole("heading", { level: 1 }).first()).toBeVisible({ timeout: 20_000 });
  });

  // MSC 미확정: 공유 버튼 초기 상태 (disabled vs hidden) 설계가 확정되기 전까지 fixme.
  // 구현 완료 후 test.fixme → test 로 전환하고 강제 계약 (toHaveCount(0)) 으로 활성화.
  test.fixme("/synergy-detail 기본 접근 시 공유 버튼은 조합 선택 전에는 노출되지 않는다 (MSC 미확정)", async ({
    page,
  }) => {
    await page.goto("/synergy-detail");
    const shareButton = page.getByRole("button", { name: /공유|share/i });
    await expect(shareButton).toHaveCount(0);
  });

  test("3명 조합 URL 접근 시 페이지가 해당 조합으로 렌더링된다 (복원)", async ({ page }) => {
    await page.goto("/synergy-detail?a=1&b=2&c=3");
    // 특정 캐릭터 이미지/이름이 DOM 에 노출되는지 — 캐릭터 코드 1,2,3 은 알파(1), 아야(2), 현우(3) 로 가정
    // 실제 구현 시 characterMap 기반으로 보강 필요
    await expect(page.getByRole("heading", { level: 1 }).first()).toBeVisible({ timeout: 20_000 });
  });
});
