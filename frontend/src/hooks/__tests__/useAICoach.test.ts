import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useAICoach } from "../useAICoach";

// The repository runs Vitest in Node without a DOM renderer. Keep a small hook
// host here so the actual fetch/ReadableStream lifecycle needs no new dependency.
const host = vi.hoisted(() => ({
  slots: [] as unknown[],
  cursor: 0,
  effect: undefined as (() => (() => void) | void) | undefined,
}));
vi.mock("react", () => ({
  useState(initial: unknown) {
    const index = host.cursor++;
    if (!(index in host.slots)) host.slots[index] = initial;
    return [
      host.slots[index],
      (next: unknown) => {
        host.slots[index] = typeof next === "function" ? next(host.slots[index]) : next;
      },
    ];
  },
  useRef(initial: unknown) {
    const index = host.cursor++;
    if (!(index in host.slots)) host.slots[index] = { current: initial };
    return host.slots[index];
  },
  useCallback: (callback: unknown) => callback,
  useEffect: (effect: () => (() => void) | void) => {
    host.effect = effect;
  },
}));

const encoder = new TextEncoder();
const nicknameKey = "ergg_ai_coach_nickname";
let cleanup: (() => void) | void;

function renderCoach() {
  host.cursor = 0;
  return CoachHost();
}

function CoachHost() {
  return useAICoach();
}

function mockStream() {
  let stream!: ReadableStreamDefaultController<Uint8Array>;
  const cancel = vi.fn();
  const response = new Response(
    new ReadableStream<Uint8Array>({
      start(controller) {
        stream = controller;
      },
      cancel,
    }),
    { headers: { "Content-Type": "text/event-stream; charset=utf-8" } }
  );
  vi.mocked(fetch).mockImplementationOnce(async (_url, init) => {
    init?.signal?.addEventListener(
      "abort",
      () => stream.error(new DOMException("Aborted", "AbortError")),
      { once: true }
    );
    return response;
  });
  return {
    push: (value: string | Uint8Array) =>
      stream.enqueue(typeof value === "string" ? encoder.encode(value) : value),
    close: () => stream.close(),
    cancel,
  };
}

beforeEach(() => {
  host.slots = [];
  host.cursor = 0;
  host.effect = undefined;
  const storage = new Map([[nicknameKey, "루미아"]]);
  vi.stubGlobal("localStorage", {
    getItem: vi.fn((key: string) => storage.get(key) ?? null),
    setItem: vi.fn((key: string, value: string) => storage.set(key, value)),
  });
  vi.stubGlobal("fetch", vi.fn());
  renderCoach();
  cleanup = host.effect?.();
});

afterEach(() => {
  cleanup?.();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("useAICoach", () => {
  it("세션과 토큰을 실시간 반영하고 청크·한글 바이트·CRLF 경계를 처리한다", async () => {
    const stream = mockStream();
    const pending = renderCoach().sendMessage("  이번 패치 추천해 줘  ");
    expect(renderCoach().isStreaming).toBe(true);
    expect(renderCoach().messages.map((entry) => entry.role)).toEqual(["user", "assistant"]);
    expect(JSON.parse(vi.mocked(fetch).mock.calls[0][1]!.body as string)).toEqual({
      message: "이번 패치 추천해 줘",
      nickname: "루미아",
    });
    stream.push(": keepalive\r\n\r\nevent: sess");
    stream.push('ion\r\ndata: {"sessionId":"session-1"}\r');
    stream.push("\n\r\n");
    await vi.waitFor(() => expect(renderCoach().sessionId).toBe("session-1"));

    const token = encoder.encode('event: token\ndata: {"text":"안녕"}\n\n');
    const splitAt = encoder.encode('event: token\ndata: {"text":"').length + 1;
    stream.push(token.slice(0, splitAt));
    stream.push(token.slice(splitAt));
    await vi.waitFor(() => expect(renderCoach().messages[1].content).toBe("안녕"));
    expect(renderCoach().isStreaming).toBe(true);
    stream.push(
      'event: ping\ndata: ignored\n\nevent: token\ndata: {\ndata: "text":" 코치야"}\n\nevent: done\ndata: {}\n\n'
    );
    await pending;
    expect(renderCoach().messages[1].content).toBe("안녕 코치야");
    expect(renderCoach().error).toBeNull();
    expect(renderCoach().isStreaming).toBe(false);
    expect(stream.cancel).toHaveBeenCalled();
    expect(new Set(renderCoach().messages.map((entry) => entry.id)).size).toBe(2);

    const next = mockStream();
    const followup = renderCoach().sendMessage("그다음은?");
    expect(JSON.parse(vi.mocked(fetch).mock.calls[1][1]!.body as string).sessionId).toBe(
      "session-1"
    );
    next.push('event: token\ndata: {"text":"다음"}\n\nevent: done\ndata: {}\n\n');
    await followup;
    expect(renderCoach().messages).toHaveLength(4);
  });

  it("중단 시 fetch를 즉시 취소하고 부분 응답을 보존한다", async () => {
    const stream = mockStream();
    const pending = renderCoach().sendMessage("질문");
    stream.push('event: token\ndata: {"text":"부분 답변"}\n\n');
    await vi.waitFor(() => expect(renderCoach().messages[1].content).toBe("부분 답변"));
    const signal = vi.mocked(fetch).mock.calls[0][1]!.signal!;
    renderCoach().stop();
    expect(signal.aborted).toBe(true);
    expect(renderCoach().isStreaming).toBe(false);
    await pending;
    expect(renderCoach().error).toBeNull();
    expect(renderCoach().messages[1].content).toBe("부분 답변");
  });

  it("새 대화 이후 도착한 이전 응답이 새 메시지나 스트리밍 상태를 변경하지 않는다", async () => {
    let resolveOld!: (response: Response) => void;
    vi.mocked(fetch).mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveOld = resolve;
        })
    );
    const oldPending = renderCoach().sendMessage("이전 질문");
    const oldSignal = vi.mocked(fetch).mock.calls[0][1]!.signal!;
    renderCoach().clear();
    expect(oldSignal.aborted).toBe(true);
    expect(renderCoach()).toMatchObject({
      messages: [],
      sessionId: null,
      error: null,
      nickname: "루미아",
    });

    const next = mockStream();
    const newPending = renderCoach().sendMessage("새 질문");
    resolveOld(
      new Response(
        'event: session\ndata: {"sessionId":"old"}\n\nevent: token\ndata: {"text":"old"}\n\n'
      )
    );
    await oldPending;
    expect(renderCoach().isStreaming).toBe(true);
    expect(renderCoach().sessionId).toBeNull();
    expect(renderCoach().messages.map((entry) => entry.content)).toEqual(["새 질문", ""]);
    next.push('event: session\ndata: {"sessionId":"new"}\n\nevent: done\ndata: {}\n\n');
    await newPending;
    expect(renderCoach().sessionId).toBe("new");
    renderCoach().clear();
    expect(renderCoach()).toMatchObject({
      messages: [],
      sessionId: null,
      error: null,
      isStreaming: false,
    });
  });

  it.each([400, 429, 503])("HTTP %s 오류를 표시하고 스트리밍을 종료한다", async (status) => {
    vi.mocked(fetch).mockResolvedValue(new Response("unavailable", { status }));
    await renderCoach().sendMessage("질문");
    expect(renderCoach().error).toBe(status === 429 ? "rateLimited" : "requestFailed");
    expect(renderCoach().isStreaming).toBe(false);
    renderCoach().clear();
    expect(renderCoach().error).toBeNull();
  });

  it("네트워크 오류를 처리한다", async () => {
    vi.mocked(fetch).mockRejectedValue(new TypeError("offline"));
    await renderCoach().sendMessage("질문");
    expect(renderCoach()).toMatchObject({ error: "requestFailed", isStreaming: false });
  });

  it.each([
    new Response(null, { headers: { "Content-Type": "text/event-stream" } }),
    new Response("<html>error</html>", { headers: { "Content-Type": "text/html" } }),
  ])("SSE 본문이 없는 응답을 거절한다", async (response) => {
    vi.mocked(fetch).mockResolvedValue(response);
    await renderCoach().sendMessage("질문");
    expect(renderCoach()).toMatchObject({ error: "requestFailed", isStreaming: false });
  });

  it.each([
    'event: error\ndata: {"message":"provider failed"}\n\n',
    "event: token\ndata: invalid-json\n\n",
    'event: token\ndata: {"text":12}\n\n',
    'event: token\ndata: {"text":"잘린 응답"}',
  ])("SSE 오류나 비정상 종료를 알리고 부분 응답을 보존한다: %s", async (frame) => {
    const stream = mockStream();
    const pending = renderCoach().sendMessage("질문");
    stream.push('event: token\ndata: {"text":"부분"}\n\n' + frame);
    stream.close();
    await pending;
    expect(renderCoach()).toMatchObject({ error: "streamInterrupted", isStreaming: false });
    expect(renderCoach().messages[1].content).toBe("부분");
  });

  it("빈 질문·500자 초과·중복 전송을 막는다", async () => {
    await renderCoach().sendMessage("  ");
    await renderCoach().sendMessage("가".repeat(501));
    expect(fetch).not.toHaveBeenCalled();
    expect(renderCoach().error).toBe("invalidMessage");
    const stream = mockStream();
    const pending = renderCoach().sendMessage("질문");
    await renderCoach().sendMessage("중복");
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(renderCoach().error).toBeNull();
    stream.push("event: done\ndata: {}\n\n");
    await pending;
  });

  it("닉네임을 불러오고 수정 시 저장하며 저장소 오류에도 동작한다", () => {
    expect(renderCoach().nickname).toBe("루미아");
    renderCoach().setNickname("새닉네임");
    expect(localStorage.setItem).toHaveBeenCalledWith(nicknameKey, "새닉네임");
    expect(renderCoach().nickname).toBe("새닉네임");
    vi.mocked(localStorage.setItem).mockImplementation(() => {
      throw new Error("denied");
    });
    expect(() => renderCoach().setNickname("가".repeat(40))).not.toThrow();
    expect(renderCoach().nickname).toHaveLength(32);
    vi.mocked(localStorage.getItem).mockImplementation(() => {
      throw new Error("denied");
    });
    expect(() => host.effect?.()).not.toThrow();
  });

  it("언마운트 시 진행 중인 요청을 취소한다", async () => {
    mockStream();
    const pending = renderCoach().sendMessage("질문");
    await vi.waitFor(() => expect(fetch).toHaveBeenCalled());
    cleanup?.();
    expect(vi.mocked(fetch).mock.calls[0][1]!.signal!.aborted).toBe(true);
    await pending;
    expect(renderCoach().error).toBeNull();
  });
});
