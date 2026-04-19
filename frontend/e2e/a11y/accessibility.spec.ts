import AxeBuilder from "@axe-core/playwright";
import { test, expect, type Page } from "@playwright/test";

/**
 * axe-core 기반 접근성 자동 검증 (WCAG 2.1 AA)
 *
 * CI에서 PR마다 실행되어 접근성 회귀를 자동 차단.
 * Supabase subscription / analytics beacon 등으로 networkidle이 도달하지
 * 않아 CI에서 타임아웃이 발생했던 이슈가 있어 domcontentloaded + 주요
 * heading 가시성으로 대체.
 */

async function gotoAndAnalyze(page: Page, path: string) {
  await page.goto(path, { waitUntil: "domcontentloaded" });
  await page.locator("h1, h2").first().waitFor({ state: "visible", timeout: 15_000 });

  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
    .analyze();

  expect(results.violations, formatViolations(results.violations)).toHaveLength(0);
}

test.describe("접근성 (WCAG 2.1 AA)", () => {
  test("홈 페이지 — 메타 분석", async ({ page }) => {
    await gotoAndAnalyze(page, "/");
  });

  test("캐릭터 분석 페이지", async ({ page }) => {
    await gotoAndAnalyze(page, "/character/1");
  });

  test("조합 추천 페이지", async ({ page }) => {
    await gotoAndAnalyze(page, "/synergy-detail");
  });
});

/** axe 위반 결과를 사람이 읽기 쉬운 형태로 포매팅 */
function formatViolations(
  violations: Array<{
    id: string;
    impact?: string | null;
    description: string;
    nodes: Array<{ html: string }>;
  }>
) {
  if (violations.length === 0) return "No violations";
  return violations
    .map(
      (v) =>
        `[${v.impact ?? "unknown"}] ${v.id}: ${v.description}\n` +
        v.nodes.map((n) => `  - ${n.html.slice(0, 120)}`).join("\n")
    )
    .join("\n\n");
}
