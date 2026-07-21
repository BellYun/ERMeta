import { expect, test } from "@playwright/test";

test("keeps the selected theme when the locale changes", async ({ page }, testInfo) => {
  await page.addInitScript(() => {
    localStorage.setItem("ergg-theme", "dark");
  });

  await page.goto("/ko/about");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");

  if (testInfo.project.name === "chromium-mobile") {
    await page.getByRole("button", { name: "메뉴 열기" }).click();
  }

  const languageSelect = page.getByRole("combobox", { name: "언어 선택" });
  await expect(async () => {
    await languageSelect.selectOption("English");
    await expect(page).toHaveURL(/\/en\/about$/, { timeout: 1_000 });
  }).toPass({ timeout: 15_000 });

  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await expect(page.locator("html")).toHaveCSS("color-scheme", "dark");
  await expect(page.getByRole("button", { name: "Switch to light mode" })).toBeVisible();
  await expect.poll(() => page.evaluate(() => localStorage.getItem("ergg-theme"))).toBe("dark");
});
