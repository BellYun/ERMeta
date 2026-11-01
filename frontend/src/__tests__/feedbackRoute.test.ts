import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "../app/api/feedback/route";
let requestId = 0;
const context = {
  schemaVersion: 1,
  capsuleId: "feedback-test",
  capturedAt: "2026-11-01T00:00:00.000Z",
  page: { path: "/ko/character/12", query: { tier: "MITHRIL_PLUS", nickname: "private" } },
  client: {},
  breadcrumbs: [
    { ageMs: 100, type: "interaction", name: "click", metadata: { email: "user@example.com" } },
  ],
  unexpected: "private",
};
function submit(body: unknown) {
  return POST(
    new Request("http://localhost/api/feedback", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-forwarded-for": `test-${requestId++}` },
      body: JSON.stringify(body),
    })
  );
}
beforeEach(() => {
  vi.stubEnv("GOOGLE_SHEETS_WEBHOOK_URL", "https://example.com/webhook");
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("ok")));
  vi.spyOn(console, "error").mockImplementation(() => {});
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});
describe("피드백 컨텍스트 전달", () => {
  it("정제한 행동 기록을 기존 피드백과 함께 전달한다", async () => {
    expect(
      (
        await submit({
          category: "버그 신고",
          message: " 오류 발생 ",
          contact: "reply@example.com",
          context,
        })
      ).status
    ).toBe(201);
    const payload = JSON.parse(vi.mocked(fetch).mock.calls[0][1]!.body as string);
    expect(payload).toMatchObject({
      category: "버그 신고",
      message: "오류 발생",
      contact: "reply@example.com",
    });
    expect(payload.context.page.query).toEqual({ tier: "MITHRIL_PLUS" });
    expect(payload.context.breadcrumbs).toEqual([
      { ageMs: 100, type: "interaction", name: "click", metadata: { email: "[email]" } },
    ]);
    expect(payload.context).not.toHaveProperty("unexpected");
  });
  it.each([undefined, { schemaVersion: 2 }])(
    "유효한 컨텍스트가 없어도 본문은 전달한다: %j",
    async (context) => {
      expect((await submit({ message: "오류 발생", context })).status).toBe(201);
      expect(JSON.parse(vi.mocked(fetch).mock.calls[0][1]!.body as string).context).toBeNull();
    }
  );
  it.each([null, [], { message: 123 }, { message: " " }])(
    "잘못된 본문을 거절한다: %j",
    async (body) => {
      expect((await submit(body)).status).toBe(400);
      expect(fetch).not.toHaveBeenCalled();
    }
  );
  it("웹훅 미설정 시 성공을 응답하지 않는다", async () => {
    vi.stubEnv("GOOGLE_SHEETS_WEBHOOK_URL", "");
    expect((await submit({ message: "오류 발생" })).status).toBe(503);
    expect(fetch).not.toHaveBeenCalled();
  });
  it("웹훅 HTTP 실패를 전달한다", async () => {
    vi.mocked(fetch).mockResolvedValue(new Response("error", { status: 500 }));
    expect((await submit({ message: "오류 발생", context })).status).toBe(502);
  });
  it("웹훅 네트워크 실패를 전달한다", async () => {
    vi.mocked(fetch).mockRejectedValue(new Error("offline"));
    expect((await submit({ message: "오류 발생", context })).status).toBe(502);
  });
});
