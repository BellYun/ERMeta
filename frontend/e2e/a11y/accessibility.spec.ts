import AxeBuilder from "@axe-core/playwright";
import { test, expect } from "@playwright/test";

/**
 * axe-core 기반 접근성 자동 검증 (WCAG 2.1 AA)
 *
 * 주요 페이지를 순회하며 접근성 위반을 검출한다.
 * CI에서 PR마다 실행되어 접근성 회귀를 자동 차단.
 */

test.describe("접근성 (WCAG 2.1 AA)", () => {
  test("홈 페이지 — 메타 분석", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
      .analyze();

    expect(results.violations, formatViolations(results.violations)).toHaveLength(0);
  });

  test("캐릭터 분석 페이지", async ({ page }) => {
    await page.goto("/character/1");
    await page.waitForLoadState("networkidle");

    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
      .analyze();

    expect(results.violations, formatViolations(results.violations)).toHaveLength(0);
  });

  test("조합 추천 페이지", async ({ page }) => {
    await page.goto("/synergy-detail");
    await page.waitForLoadState("networkidle");

    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
      .analyze();

    expect(results.violations, formatViolations(results.violations)).toHaveLength(0);
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
