import { expect, test } from "@playwright/test";

test.skip(
  process.env.ENABLE_MULTI_SEARCH !== "true" &&
    process.env.NEXT_PUBLIC_ENABLE_MULTI_SEARCH !== "true",
  "멀티서치 기능 플래그가 필요합니다."
);

test("전적 더 보기에서 중복을 제거하고 닉네임 변경 시 목록을 초기화한다", async ({ page }) => {
  let loadMoreAttempts = 0;
  const match = {
    gameId: "9007199254740993",
    seasonId: 41,
    matchingMode: 3,
    matchingTeamMode: 3,
    characterNum: 38,
    gameRank: 2,
    playerKill: 5,
    playerAssistant: 6,
    startDtm: "2026-10-18T00:00:00.000Z",
  };

  await page.route("**/api/multi-search/recent-matches?**", async (route) => {
    const query = new URL(route.request().url()).searchParams;
    const nickname = query.get("nickname");
    const cursor = query.get("cursor");
    const base = {
      input: nickname,
      nickname,
      lastSyncedAt: "2026-10-19T00:00:00.000Z",
      isStale: nickname === "A",
    };
    if (nickname === "A" && cursor && ++loadMoreAttempts === 1) {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          ...base,
          status: "error",
          matches: [],
          reason: "rate_limited",
          retryAfter: 7,
        }),
      });
      return;
    }
    const payload =
      nickname === "A"
        ? cursor
          ? {
              ...base,
              status: "ok",
              matches: [match, { ...match, gameId: "9007199254740994" }],
              nextCursor: null,
            }
          : { ...base, status: "ok", matches: [match], nextCursor: "second" }
        : nickname === "B"
          ? { ...base, status: "no_matches", matches: [], nextCursor: null }
          : nickname === "C"
            ? { ...base, status: "error", matches: [], reason: "rate_limited", retryAfter: 7 }
            : nickname === "D"
              ? { ...base, status: "not_found", matches: [], reason: "nickname_not_found" }
              : { ...base, status: "error", matches: [], reason: "bser_api_unavailable" };
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(payload),
    });
  });

  await page.goto("/ko/multi-search");
  const input = page.getByPlaceholder("내 닉네임");
  await expect(async () => {
    await input.fill("A");
    await expect(input).toHaveAttribute("value", "A", { timeout: 500 });
  }).toPass();
  await page.getByRole("button", { name: "전적 검색" }).click();

  const list = page.getByRole("heading", { name: "A 전적 목록" }).locator("..");
  await expect(list.getByRole("listitem")).toHaveCount(1);
  await expect(list).toContainText("최신 조회 실패로 저장된 기록 표시");
  await list.getByRole("button", { name: "더 보기" }).click();
  await expect(list).toContainText("7초 뒤 다시 시도해주세요.");
  await expect(list.getByRole("listitem")).toHaveCount(1);
  await list.getByRole("button", { name: "더 보기" }).click();
  await expect(list.getByRole("listitem")).toHaveCount(2);
  await expect(list.getByRole("button", { name: "더 보기" })).toHaveCount(0);

  await input.fill("B");
  await expect(page.getByRole("heading", { name: "A 전적 목록" })).toHaveCount(0);
  await page.getByRole("button", { name: "전적 검색" }).click();
  await expect(page.getByRole("heading", { name: "B 전적 목록" }).locator("..")).toContainText(
    "최근 90일 동안 조회 가능한 경기가 없습니다."
  );

  await input.fill("C");
  await page.getByRole("button", { name: "전적 검색" }).click();
  await expect(page.getByRole("heading", { name: "C 전적 목록" }).locator("..")).toContainText(
    "7초 뒤 다시 시도해주세요."
  );

  await input.fill("D");
  await page.getByRole("button", { name: "전적 검색" }).click();
  await expect(page.getByRole("heading", { name: "D 전적 목록" }).locator("..")).toContainText(
    "닉네임을 찾을 수 없습니다."
  );

  await input.fill("E");
  await page.getByRole("button", { name: "전적 검색" }).click();
  await expect(page.getByRole("heading", { name: "E 전적 목록" }).locator("..")).toContainText(
    "전적 API가 응답하지 않습니다."
  );
});

test("멀티서치에서 공식 실험체 통계와 플레이어별 요청 제한을 함께 표시한다", async ({ page }) => {
  await page.route("**/api/multi-search/players", async (route) => {
    const { nicknames } = route.request().postDataJSON() as { nicknames: string[] };
    const results = nicknames.map((nickname) =>
      nickname === "B"
        ? { input: nickname, status: "error", reason: "rate_limited", retryAfter: 7 }
        : {
            input: nickname,
            nickname,
            status: "ok",
            source: "bser_official",
            fetchedAt: "2026-10-19T00:00:00.000Z",
            isStale: nickname === "A",
            mmr: 3000,
            rank: 100,
            totalGames: 20,
            totalWins: 5,
            winRate: 25,
            top3Rate: 50,
            averageKills: 4,
            topCharacters: [
              {
                characterCode: 38,
                totalGames: 10,
                wins: 3,
                winRate: 30,
                top3Rate: 60,
                averageRank: 2.5,
              },
            ],
          }
    );
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        seasonId: 41,
        matchingMode: 3,
        results,
        summary: {
          requested: results.length,
          ok: results.filter((result) => result.status === "ok").length,
          failed: results.filter((result) => result.status !== "ok").length,
        },
      }),
    });
  });

  await page.goto("/ko/multi-search");
  const ownInput = page.getByPlaceholder("내 닉네임");
  await expect(async () => {
    await ownInput.fill("A");
    await expect(ownInput).toHaveAttribute("value", "A", { timeout: 500 });
  }).toPass();
  await page.getByRole("button", { name: "내 정보 검색" }).click();
  await expect(page.getByRole("heading", { name: "A" })).toBeVisible();
  await expect(page.getByText("최신 조회 실패로 저장된 통계 표시")).toBeVisible();
  await page.getByPlaceholder("팀원 1 닉네임").fill("B");
  await page.getByPlaceholder("팀원 2 닉네임").fill("C");
  await page.getByRole("button", { name: "팀원 검색" }).click();

  await expect(page.getByText("일부 플레이어 정보를 불러오지 못했습니다.")).toBeVisible();
  await expect(page.getByText("7초 뒤 다시 시도해주세요.")).toBeVisible();
  await expect(page.getByText("10게임 · 승률 30%")).toHaveCount(3);
});
