import { expect, test } from "@playwright/test";

test.describe("Flow: 성공 조합 프로토타입 분석", () => {
  test("반복 상승 유형 조합의 근거와 교전 운영을 함께 표시", async ({ page }) => {
    const runtimeErrors: string[] = [];
    page.on("pageerror", (error) => runtimeErrors.push(error.message));
    await page.route("**/api/stats/trios-weapon*", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          results: [
            {
              character1: 1,
              weaponType1: 16,
              character2: 3,
              weaponType2: 21,
              character3: 48,
              weaponType3: 3,
              mainCore1: 0,
              mainCore2: 0,
              mainCore3: 0,
              totalGames: 420,
              winRate: 28.2,
              averageRP: 11.4,
              averageRank: 3.2,
            },
          ],
        }),
      });
    });
    await page.route("**/api/traits/names*", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ names: {} }),
      });
    });
    await page.route("**/api/analysis/composition-affinity", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          snapshotId: "season10-11-good-composition-prototypes-v1",
          results: {
            "1:16|3:21|48:3": {
              key: "1:16|3:21|48:3",
              classifiedMembers: 3,
              matchedMembers: 1,
              members: [
                {
                  characterCode: 1,
                  weapon: 16,
                  characterName: "재키",
                  weaponName: "양손검",
                  classification: {
                    role: "전사",
                    groupName: "추격 지속형",
                    subtype: "추격 지속전형",
                    firstOrderType: "추격 지속전",
                  },
                  trend: null,
                },
                {
                  characterCode: 3,
                  weapon: 21,
                  characterName: "피오라",
                  weaponName: "레이피어",
                  classification: {
                    role: "전사",
                    groupName: "진입 마무리형",
                    subtype: "진입 마무리형",
                    firstOrderType: "진입 마무리",
                  },
                  trend: null,
                },
                {
                  characterCode: 48,
                  weapon: 3,
                  characterName: "띠아",
                  weaponName: "방망이",
                  classification: {
                    role: "스킬딜러",
                    groupName: "포킹 장악형",
                    subtype: "포킹 장악형",
                    firstOrderType: "포킹 장악",
                  },
                  trend: {
                    roleComposition: "전사 + 전사 + 스킬딜러",
                    games: 1_243,
                    adjustedResidual: 3.548,
                  },
                },
              ],
              prototype: {
                match: "exact",
                key: "스킬딜러:포킹 장악|전사:진입 마무리|전사:추격 지속전",
                roleComposition: "스킬딜러 + 전사 + 전사",
                members: [
                  { role: "스킬딜러", type: "포킹 장악" },
                  { role: "전사", type: "진입 마무리" },
                  { role: "전사", type: "추격 지속전" },
                ],
                memberMatches: [
                  {
                    characterCode: 1,
                    weapon: 16,
                    sourceType: "추격 지속전",
                    role: "전사",
                    type: "추격 지속전",
                    similarity: 1,
                  },
                  {
                    characterCode: 3,
                    weapon: 21,
                    sourceType: "진입 마무리",
                    role: "전사",
                    type: "진입 마무리",
                    similarity: 1,
                  },
                  {
                    characterCode: 48,
                    weapon: 3,
                    sourceType: "포킹 장악",
                    role: "스킬딜러",
                    type: "포킹 장악",
                    similarity: 1,
                  },
                ],
                similarity: 1,
                minimumSimilarity: 1,
                observations: 15,
                supportingProfiles: 15,
                reliableObservations: 15,
                reliableRate: 1,
                contextGames: 15_135,
                adjustedResidual: 2.057,
              },
            },
          },
        }),
      });
    });

    await page.goto("/synergy-detail");
    const allySection = page
      .locator("section")
      .filter({ has: page.getByRole("heading", { name: "아군 선택" }) })
      .first();
    const firstCell = allySection.locator("button[title]:has(img[alt])").first();
    await expect(firstCell).toBeVisible({ timeout: 25_000 });
    await firstCell.click();

    const card = page
      .locator('div[role="button"][tabindex="0"]')
      .filter({ has: page.locator('a[href^="/character/"]') })
      .first();
    await expect(card).toBeVisible({ timeout: 20_000 });
    await card.click();

    const prototype = card.locator(
      'xpath=following-sibling::div//div[@data-successful-composition-prototype="exact"]'
    );
    await expect(prototype).toBeVisible();
    await expect(prototype.getByText("실험체별 역할")).toBeVisible();
    await expect(prototype.locator("[data-prototype-member-duty]")).toHaveCount(3);
    await expect(prototype.locator("[data-character-type]")).toHaveCount(3);
    await expect(
      prototype.getByText("전사 · 추격 지속형 · 추격 지속전형", {
        exact: true,
      })
    ).toBeVisible();
    await expect(prototype.getByText(/new 유형/)).toHaveCount(0);
    await expect(prototype.getByText(/프로필|신뢰 관측|보정 평균/)).toHaveCount(0);
    await expect(page.getByText(/성공 유형 조합 일치/)).toHaveCount(0);
    await expect(
      card.locator("xpath=following-sibling::div//div[@data-combat-doctrine]")
    ).toBeVisible();
    await expect(page.getByText("성공 조합 패턴 일치").first()).toBeVisible();
    await expect(
      page.locator("[data-nextjs-dialog], .vite-error-overlay, #webpack-dev-server-client-overlay")
    ).toHaveCount(0);
    for (const width of [320, 375, 414, 768]) {
      await page.setViewportSize({ width, height: 900 });
      await expect
        .poll(() =>
          page.evaluate(
            () => document.documentElement.scrollWidth > document.documentElement.clientWidth
          )
        )
        .toBe(false);
    }
    expect(runtimeErrors).toEqual([]);
  });
});
