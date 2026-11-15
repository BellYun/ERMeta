import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { dynamic, POST } from "../app/api/ai-chat/stream/route";

function request(body: unknown = { message: "추천해 줘" }, signal?: AbortSignal) {
  return new Request("http://localhost/api/ai-chat/stream", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal,
  });
}

beforeEach(() => {
  vi.stubGlobal("fetch", vi.fn());
  vi.stubEnv("NEST_API_BASE_URL", "http://coach:4000/");
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe("AI 코치 SSE 프록시", () => {
  it("허용된 필드만 전송하고 버퍼링 없이 SSE 바이트를 전달한다", async () => {
    let source!: ReadableStreamDefaultController<Uint8Array>;
    const upstream = new ReadableStream<Uint8Array>({
      start(controller) {
        source = controller;
      },
    });
    vi.mocked(fetch).mockResolvedValue(
      new Response(upstream, {
        headers: { "Content-Type": "text/event-stream; charset=utf-8" },
      })
    );
    const req = request({
      message: "질문",
      sessionId: "session",
      nickname: "루미아",
      userId: "discard",
    });
    const response = await POST(req);
    expect(dynamic).toBe("force-dynamic");
    expect(fetch).toHaveBeenCalledWith(
      "http://coach:4000/api/ai-chat/stream",
      expect.objectContaining({
        method: "POST",
        cache: "no-store",
        signal: req.signal,
        body: JSON.stringify({ message: "질문", sessionId: "session", nickname: "루미아" }),
      })
    );
    expect(response.headers.get("Cache-Control")).toBe("no-cache, no-transform");
    expect(response.headers.get("X-Accel-Buffering")).toBe("no");
    const reader = response.body!.getReader();
    const token = new TextEncoder().encode('event: token\ndata: {"text":"안녕"}\n\n');
    source.enqueue(token);
    expect((await reader.read()).value).toEqual(token);
    source.close();
    expect((await reader.read()).done).toBe(true);
  });

  it("기본 주소를 사용하고 클라이언트 취소 신호를 업스트림까지 전달한다", async () => {
    vi.unstubAllEnvs();
    const previous = process.env.NEST_API_BASE_URL;
    delete process.env.NEST_API_BASE_URL;
    try {
      const controller = new AbortController();
      vi.mocked(fetch).mockImplementation(
        async (_url, init) =>
          new Promise((_resolve, reject) => {
            init?.signal?.addEventListener("abort", () =>
              reject(new DOMException("Aborted", "AbortError"))
            );
          })
      );
      const pending = POST(request(undefined, controller.signal));
      await vi.waitFor(() => expect(fetch).toHaveBeenCalled());
      controller.abort();
      expect((await pending).status).toBe(499);
      expect(vi.mocked(fetch).mock.calls[0][0]).toBe("http://localhost:4000/api/ai-chat/stream");
      expect(vi.mocked(fetch).mock.calls[0][1]!.signal!.aborted).toBe(true);
    } finally {
      if (previous !== undefined) process.env.NEST_API_BASE_URL = previous;
    }
  });

  it("스트리밍 시작 후에도 연결 취소가 업스트림에 전파된다", async () => {
    const controller = new AbortController();
    vi.mocked(fetch).mockResolvedValue(
      new Response("", { headers: { "Content-Type": "text/event-stream" } })
    );
    await POST(request(undefined, controller.signal));
    controller.abort();
    expect(vi.mocked(fetch).mock.calls[0][1]!.signal!.aborted).toBe(true);
  });

  it("업스트림 HTTP 상태·오류 본문·Retry-After를 보존한다", async () => {
    vi.mocked(fetch).mockResolvedValue(
      Response.json(
        { message: "quota" },
        {
          status: 429,
          headers: { "Retry-After": "60" },
        }
      )
    );
    const response = await POST(request());
    expect(response.status).toBe(429);
    expect(response.headers.get("Retry-After")).toBe("60");
    expect(await response.json()).toEqual({ message: "quota" });
  });

  it.each([null, [], { message: " " }, { message: 1 }, { message: "a".repeat(501) }])(
    "잘못된 요청을 거절한다: %j",
    async (body) => {
      expect((await POST(request(body))).status).toBe(400);
      expect(fetch).not.toHaveBeenCalled();
    }
  );

  it("깨진 JSON 요청을 거절한다", async () => {
    expect(
      (
        await POST(
          new Request("http://localhost/api/ai-chat/stream", { method: "POST", body: "{" })
        )
      ).status
    ).toBe(400);
    expect(fetch).not.toHaveBeenCalled();
  });

  it("업스트림 네트워크 실패나 잘못된 스트림에 502를 반환한다", async () => {
    vi.mocked(fetch).mockRejectedValueOnce(new Error("offline"));
    expect((await POST(request())).status).toBe(502);
    vi.mocked(fetch).mockResolvedValueOnce(new Response("not SSE"));
    expect((await POST(request())).status).toBe(502);
  });
});
