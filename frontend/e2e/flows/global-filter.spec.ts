import { expect, test } from "@playwright/test";

// 랭킹에서 티어를 바꾸면 클라이언트가 같은 패치의 통계를 다시 합산한다.
// 패치를 바꾸면 해당 정적 통계 파일을 불러온다.
test.describe("Flow: Global Filter → 랭킹 재계산", () => {
  test("다이아+가 기본이고 미스릴+를 선택할 수 있다", async ({ page }) => {
    await page.goto("/rankings");

    await expect(page.getByRole("radio", { name: "미스릴", exact: true })).toHaveCount(0);
    await expect(page.getByRole("radio", { name: "다이아+", exact: true })).toHaveAttribute(
      "aria-checked",
      "true",
      { timeout: 15_000 }
    );

    const mithrilButton = page.getByRole("radio", { name: "미스릴+", exact: true });
    await mithrilButton.click();
    await expect(mithrilButton).toHaveAttribute("aria-checked", "true");
  });

  test("다른 패치를 선택하면 해당 정적 통계 파일을 읽는다", async ({ page }) => {
    await page.goto("/rankings");

    const patchSelect = page.getByRole("combobox", { name: "패치 선택" });
    await expect(patchSelect).toBeVisible({ timeout: 15_000 });

    const allValues = await patchSelect.evaluate((el) =>
      Array.from((el as HTMLSelectElement).options).map((o) => o.value)
    );
    const currentValue = await patchSelect.inputValue();
    const nextPatch = allValues.find((v) => v && v !== currentValue);
    expect(nextPatch).toBeDefined();

    const responsePromise = page.waitForResponse(
      (res) =>
        res.url().includes("/data/season-stats/") &&
        new URL(res.url()).pathname.endsWith(`/stats/${nextPatch}.json`),
      { timeout: 15_000 }
    );

    await patchSelect.selectOption(nextPatch!);

    const response = await responsePromise;
    expect(response.status()).toBe(200);
  });
});
