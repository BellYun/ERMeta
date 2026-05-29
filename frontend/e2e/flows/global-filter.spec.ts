import { expect, test } from "@playwright/test";

// 사용자 여정: 홈에서 티어 필터를 바꾸면 서버 재호출 없이 클라이언트가 raw home stats를 합산한다.
// 패치 필터 변경 시에는 해당 패치의 raw home stats를 새로 가져온다.
// Supabase secrets 없으면 patches가 비어 FilterContext 기본값이 세팅되지 않아 테스트를 건너뛴다.
const hasSupabase = !!process.env.NEXT_PUBLIC_SUPABASE_URL;

test.describe("Flow: Global Filter → 홈 메타 재계산", () => {
  test.skip(!hasSupabase, "NEXT_PUBLIC_SUPABASE_URL 미주입 (fork PR 등) → 실 DB 의존 테스트 skip");

  test("'미스릴' 단일 옵션 없이 '미스릴+' 기본값과 다이아 선택 상태를 노출한다", async ({
    page,
  }) => {
    await page.goto("/");

    await expect(page.getByRole("radio", { name: "미스릴", exact: true })).toHaveCount(0);
    await expect(page.getByRole("radio", { name: "미스릴+", exact: true })).toHaveAttribute(
      "aria-checked",
      "true",
      { timeout: 15_000 }
    );

    const diamondButton = page.getByRole("radio", { name: "다이아", exact: true });
    await expect(diamondButton).toBeVisible({ timeout: 15_000 });

    await diamondButton.click();
    await expect(diamondButton).toHaveAttribute("aria-checked", "true");
  });

  test("다른 패치로 select 변경 시 home stats API를 새 patchVersion 으로 호출한다", async ({
    page,
  }) => {
    await page.goto("/");

    const patchSelect = page.getByRole("combobox", { name: "패치 선택" });
    await expect(patchSelect).toBeVisible({ timeout: 15_000 });

    const allValues = await patchSelect.evaluate((el) =>
      Array.from((el as HTMLSelectElement).options).map((o) => o.value)
    );
    const currentValue = await patchSelect.inputValue();
    const nextPatch = allValues.find((v) => v && v !== currentValue);
    test.skip(!nextPatch, "다른 패치 옵션이 없으면 검증 불가");

    const responsePromise = page.waitForResponse(
      (res) =>
        res.url().includes("/api/meta/home-stats") &&
        res.url().includes(`patchVersion=${encodeURIComponent(nextPatch!)}`),
      { timeout: 15_000 }
    );

    await patchSelect.selectOption(nextPatch!);

    const response = await responsePromise;
    expect(response.status()).toBe(200);
  });
});
