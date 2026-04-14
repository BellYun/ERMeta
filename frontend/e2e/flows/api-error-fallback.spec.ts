import { expect, test } from "@playwright/test";

// 사용자 여정: 필터를 바꿔 HoneyPicks client fetch가 500을 받으면, 섹션은 error 메시지 상태로
// 떨어지고(HoneyPicksSection 내부 error-state 렌더) 티어 랭킹은 정상 작동해 부분 장애 격리가 유지된다.
// NOTE: HoneyPicksSection 초기 렌더는 서버(fetchHoneyPicksServer)를 거치므로 첫 페이로드는 정상 수신된다.
//       page.route는 브라우저 요청만 가로채므로, 필터 변경 후 client re-fetch를 통해 에러를 주입한다.
test.describe("Flow: API 장애 → HoneyPicks 에러 상태", () => {
  test("honey-picks 500 주입 + 필터 변경 시 에러 메시지가 노출되고 티어 랭킹은 유지된다", async ({
    page,
  }) => {
    await page.goto("/");

    await expect(page.getByRole("heading", { name: /이번 패치 떡상/ })).toBeVisible({
      timeout: 20_000,
    });

    // 초기 SSR 데이터는 정상 노출. 이제 client fetch만 500 처리.
    await page.route("**/api/meta/honey-picks*", async (route) => {
      await route.fulfill({
        status: 500,
        contentType: "application/json",
        body: JSON.stringify({ error: "e2e: honey-picks 강제 장애" }),
      });
    });

    // 티어 변경 → HoneyPicksSection useEffect가 client fetch 재시도 → 가로챈 500 응답
    const diamondButton = page.getByRole("button", { name: "다이아" });
    await expect(diamondButton).toBeVisible();
    await diamondButton.click();

    // 에러 상태 렌더: <p>에 error 메시지 노출
    await expect(page.getByText(/e2e: honey-picks 강제 장애/)).toBeVisible({ timeout: 15_000 });

    // 티어 랭킹 섹션은 다른 API라 여전히 정상 동작해야 한다.
    await expect(page.getByRole("heading", { name: /캐릭터 순위/ })).toBeVisible();
    await expect(page.locator('a[href^="/character/"]:visible').first()).toBeVisible({
      timeout: 20_000,
    });
  });
});
