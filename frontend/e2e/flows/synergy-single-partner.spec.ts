import { expect, test } from "@playwright/test";
test("one ally shows static partner stats on both recommendation pages", async ({ page }) => {
  let trioRequests = 0;
  await page.route(/\/api\/stats\/trios-weapon(?:\?.*)?$/, async (route) => {
    trioRequests++;
    await route.fulfill({ json: { results: [] } });
  });
  for (const url of ["/synergy-detail?ally1=1&w1=14", "/synergy?ally1=1"]) {
    await page.goto(url);
    const panel = page.getByTestId("single-partner-results");
    await expect(panel.getByRole("heading", { name: "재키 기준 내 픽 추천" })).toBeVisible();
    await expect(panel.getByTestId("single-partner-card").first()).toBeVisible();
    await expect(
      panel.getByTestId("single-partner-card").first().getByTestId("unknown-teammate")
    ).toHaveText("?미정");
    await expect(
      panel.getByTestId("single-partner-card").first().getByAltText("재키", { exact: true })
    ).toBeVisible();
    const unknownBounds = await panel
      .getByTestId("single-partner-card")
      .first()
      .getByTestId("unknown-teammate")
      .locator("div")
      .boundingBox();
    expect(unknownBounds).not.toBeNull();
    expect(unknownBounds!.width).toBe(unknownBounds!.height);
    expect(unknownBounds!.width).toBeGreaterThanOrEqual(22);

    await expect(
      panel.getByText("시즌 10·11 + 시즌 12의 12.4까지 · 다이아몬드 이상")
    ).toBeVisible();
    await expect(panel.getByTestId("single-partner-card").first()).toContainText("평균 RP");
    await expect(panel.getByTestId("single-partner-card").first()).toContainText("평균 순위");
    if (url.includes("synergy-detail")) {
      const zahir = panel
        .getByTestId("single-partner-card")
        .filter({ has: page.locator('a[href="/character/5?weapon=5"]') });
      await expect(zahir).toContainText("19.1%");
      await expect(zahir).toContainText("+6.26");
      await expect(zahir).toContainText("157");
      await expect(zahir).toContainText("4.02");
    }
    await panel.getByLabel("정렬", { exact: true }).selectOption("totalGames");
    await panel.getByLabel("최소 표본", { exact: true }).selectOption("100");
    await expect(page).toHaveURL(/minGames=100/);
    expect(trioRequests).toBe(0);
    if (url.includes("synergy-detail")) {
      await panel.getByRole("heading").click();
      await page.screenshot({
        path: test.info().outputPath("ermeta-single-partner.png"),
      });
    }
    await panel.getByRole("button", { name: "아군 초기화하기" }).click();
    await expect(panel).toHaveCount(0);
  }
});

test("changing the selected ally ignores late JSON from the previous selection", async ({
  page,
}) => {
  let release: () => void = () => {};
  let started: () => void = () => {};
  let completed: () => void = () => {};
  const blocked = new Promise<void>((resolve) => {
    release = resolve;
  });
  const requested = new Promise<void>((resolve) => {
    started = resolve;
  });
  const fulfilled = new Promise<void>((resolve) => {
    completed = resolve;
  });
  await page.route("**/data/pick-partners/**/001-14.json", async (route) => {
    started();
    await blocked;
    await route.fulfill({ response: await route.fetch() });
    completed();
  });
  await page.goto("/synergy-detail?ally1=1&w1=14");
  await requested;
  await page.evaluate(() => window.history.replaceState(null, "", "/synergy-detail?ally1=6&w1=8"));
  const panel = page.getByTestId("single-partner-results");
  await expect(panel.getByRole("heading", { name: "나딘 기준 내 픽 추천" })).toBeVisible();
  const first = panel.getByTestId("single-partner-card").first();
  await expect(first).toBeVisible();
  const current = await first.textContent();
  release();
  await fulfilled;
  await expect(first).toHaveText(current ?? "");
});
