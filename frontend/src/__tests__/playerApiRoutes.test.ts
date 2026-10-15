import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "@/app/api/multi-search/players/route";
import { GET } from "@/app/api/multi-search/recent-matches/route";

describe("멀티서치의 새 플레이어 API 연결", () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    vi.stubEnv("ENABLE_MULTI_SEARCH", "true");
    vi.stubEnv("PLAYER_API_BASE_URL", "http://localhost:3001/");
    vi.stubGlobal("fetch", fetchMock);
    fetchMock.mockReset();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("시즌·모드를 넣어 새 비교 API를 호출하고 일부 실패를 유지한다", async () => {
    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify({
          seasonId: 39,
          matchingMode: 3,
          summary: { requested: 2, ok: 0, failed: 2 },
          results: [
            { input: "A", status: "not_found", code: "PLAYER_NOT_FOUND" },
            { input: "B", status: "error", code: "BSER_UNAVAILABLE" },
          ],
        }),
        { status: 200 }
      )
    );

    const response = await POST(
      new NextRequest("http://localhost/api/multi-search/players", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nicknames: ["A", "B"] }),
      })
    );
    expect(response.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledWith(
      "http://localhost:3001/v1/players/compare",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ nicknames: ["A", "B"], seasonId: 39, matchingMode: 3 }),
      })
    );
    expect((await response.json()).results).toMatchObject([
      { status: "not_found", reason: "nickname_not_found" },
      { status: "error", reason: "bser_api_unavailable" },
    ]);
  });

  it("닉네임을 URL 인코딩하고 새 전적 API의 404를 화면 상태로 변환한다", async () => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ code: "PLAYER_NOT_FOUND" }), { status: 404 })
    );
    const response = await GET(
      new NextRequest(
        "http://localhost/api/multi-search/recent-matches?nickname=%ED%95%9C%20%EA%B8%80&limit=10"
      )
    );
    expect(fetchMock.mock.calls[0][0].toString()).toBe(
      "http://localhost:3001/v1/players/%ED%95%9C%20%EA%B8%80/matches?limit=10"
    );
    expect(await response.json()).toMatchObject({
      input: "한 글",
      status: "not_found",
      matches: [],
    });
  });

  it("설정이 없으면 기존 Railway 경로를 유지한다", async () => {
    vi.stubEnv("PLAYER_API_BASE_URL", "");
    fetchMock.mockResolvedValue(new Response(JSON.stringify({ results: [] }), { status: 200 }));
    await POST(
      new NextRequest("http://localhost/api/multi-search/players", {
        method: "POST",
        body: JSON.stringify({ nicknames: ["A"] }),
      })
    );
    expect(fetchMock.mock.calls[0][0]).toBe(
      "https://ermeta-production.up.railway.app/multi-search/players"
    );
  });
});
