import { test, expect } from "@playwright/test";
const pools = [
  [
    { charCode: 1, weaponCode: 14 },
    { charCode: 2, weaponCode: 9 },
  ],
  [
    { charCode: 1, weaponCode: 14 },
    { charCode: 2, weaponCode: 9 },
  ],
  [
    { charCode: 3, weaponCode: 16 },
    { charCode: 4, weaponCode: 3 },
  ],
];
test("builds every assignment including missing records and restores pools", async ({ page }) => {
  await page.route("**/api/stats/trios-weapon?**", (route) =>
    route.fulfill({
      json: { version: 1, itemCount: 1, items: [[1, 14, 2, 9, 3, 16, 20, 4, 600, 80]] },
    })
  );
  await page.goto(`/trio-builder?pools=${encodeURIComponent(JSON.stringify(pools))}`);
  await page.getByRole("button", { name: "가능한 조합 모두 보기" }).click();
  await expect(page.getByTestId("trio-assignment")).toHaveCount(4);
  await expect(page.getByRole("status")).toContainText("가능한 조합 4개 · 통계가 있는 조합 2개");
  await expect(page.getByTestId("trio-assignment").first()).toContainText("+10.00");
  await expect(page.getByText("기록 없음", { exact: true })).toHaveCount(2);
  const a = page.getByRole("region", { name: "A 실험체 폭", exact: true });
  await a.getByRole("button", { name: "실험체 폭 편집" }).click();
  await a.getByRole("textbox").fill("재키");
  await a.getByRole("button", { name: "재키 · 도끼", exact: true }).click();
  await expect(page.getByTestId("trio-assignment")).toHaveCount(0);
  await page.reload();
  await expect(a.getByRole("button", { name: "아야 · 권총 선택 해제" })).toBeVisible();
  await page.getByRole("button", { name: "가능한 조합 모두 보기" }).click();
  await expect(page.getByTestId("trio-assignment")).toHaveCount(2);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true
  );
  await page.screenshot({
    path: test.info().outputPath("trio-builder.png"),
    fullPage: true,
  });
});
test("handles failure and ignores a late response after pool changes", async ({ page }) => {
  let release!: () => void;
  const waiting = new Promise<void>((resolve) => {
    release = resolve;
  });
  let started!: () => void;
  const requested = new Promise<void>((resolve) => {
    started = resolve;
  });
  await page.route("**/api/stats/trios-weapon?**", async (route) => {
    started();
    await waiting;
    await route.fulfill({ json: { version: 1, itemCount: 0, items: [] } }).catch(() => {});
  });
  await page.goto(`/trio-builder?pools=${encodeURIComponent(JSON.stringify(pools))}`);
  await page.getByRole("button", { name: "가능한 조합 모두 보기" }).click();
  await requested;
  await page
    .getByRole("region", { name: "A 실험체 폭", exact: true })
    .getByRole("button", { name: "초기화" })
    .click();
  release();
  await expect(page.getByRole("button", { name: "가능한 조합 모두 보기" })).toBeDisabled();
  await expect(page.getByTestId("trio-assignment")).toHaveCount(0);
  await page.unroute("**/api/stats/trios-weapon?**");
  await page.route("**/api/stats/trios-weapon?**", (route) =>
    route.fulfill({ status: 500, json: { error: "unavailable" } })
  );
  await page.goto(`/trio-builder?pools=${encodeURIComponent(JSON.stringify(pools))}`);
  await page.getByRole("button", { name: "가능한 조합 모두 보기" }).click();
  await expect(page.getByRole("status")).toContainText("통계를 불러오지 못했습니다");
  await expect(page.getByText("기록 없음", { exact: true })).toHaveCount(0);
});
