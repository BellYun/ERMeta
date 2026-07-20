import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";

function trackL10nRequests(page: Page) {
  const requests: string[] = [];

  page.on("request", (request) => {
    const pathname = new URL(request.url()).pathname;
    if (pathname.startsWith("/l10n/")) requests.push(pathname);
  });

  return requests;
}

test("static content does not download the game dictionary", async ({ page }) => {
  const l10nRequests = trackL10nRequests(page);

  await page.goto("/ko/about");
  await page.waitForLoadState("networkidle");

  expect(l10nRequests).toEqual([]);
});

test("character detail lazily loads only item names", async ({ page }) => {
  const l10nRequests = trackL10nRequests(page);

  await page.goto("/ko/character/1", { waitUntil: "domcontentloaded" });
  await expect.poll(() => l10nRequests.length).toBeGreaterThan(0);

  expect(l10nRequests).toHaveLength(1);
  expect(l10nRequests[0]).toMatch(/^\/l10n\/chunks\/Korean\/item-names\.[a-f0-9]{12}\.json$/);
});
