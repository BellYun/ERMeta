import { afterEach, describe, expect, it, vi } from "vitest";
import { POST } from "@/app/api/ai-chat/stream/route";

describe("POST /api/ai-chat/stream", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("message가 없거나 빈 문자열이면 400을 반환한다", async () => {
    const req = new Request("http://localhost:3000/api/ai-chat/stream", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("message is required");
  });

  it("백엔드로 요청을 정상 중계하고 SSE 헤더를 전달한다", async () => {
    const mockBody = new ReadableStream();
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(
      new Response(mockBody, {
        status: 200,
        headers: {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
        },
      })
    );

    const req = new Request("http://localhost:3000/api/ai-chat/stream", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: "피오라 공략 알려줘" }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toBe("text/event-stream");
    expect(res.headers.get("X-Accel-Buffering")).toBe("no");
    expect(res.headers.get("Cache-Control")).toContain("no-cache");
  });

  it("백엔드 연결 실패 시 502를 반환한다", async () => {
    vi.spyOn(globalThis, "fetch").mockRejectedValueOnce(new Error("Connection refused"));

    const req = new Request("http://localhost:3000/api/ai-chat/stream", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: "테스트" }),
    });

    const res = await POST(req);
    expect(res.status).toBe(502);
    const body = await res.json();
    expect(body.error).toBe("upstream_unavailable");
  });
});
