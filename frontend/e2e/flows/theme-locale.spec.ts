import { expect, test } from "@playwright/test";

test("keeps the selected theme when the locale changes", async ({ page }, testInfo) => {
  await page.goto("/ko/about");

  await page.getByRole("button", { name: "다크모드로 전환" }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");

  if (testInfo.project.name === "chromium-mobile") {
    await page.getByRole("button", { name: "메뉴 열기" }).click();
  }

  await page.getByRole("combobox", { name: "언어 선택" }).selectOption("English");

  await expect(page).toHaveURL(/\/en\/about$/);
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await expect(page.locator("html")).toHaveCSS("color-scheme", "dark");
  await expect(page.getByRole("button", { name: "Switch to light mode" })).toBeVisible();
  await expect.poll(() => page.evaluate(() => localStorage.getItem("ergg-theme"))).toBe("dark");
});
