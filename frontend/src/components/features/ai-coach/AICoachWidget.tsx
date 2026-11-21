"use client";

import { useState } from "react";

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
}

/**
 * AI 코치 대화 UI 최소 뼈대(Skeleton)
 * - 통신 기본기(스트리밍, 낙관적 업데이트, 에러 처리, 연타 방지 등)를 직접 구현해볼 수 있는 기본 컴포넌트
 */
export function AICoachWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // TODO: 직접 구현해볼 통신 로직 영역
  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userText = input.trim();
    setInput("");

    // 1. 낙관적 업데이트 예시 (사용자 메시지 선반영)
    const userMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content: userText,
    };
    setMessages((prev) => [...prev, userMsg]);
    setIsLoading(true);

    try {
      // 2. 백엔드 스트리밍 통신 (직접 스트림 처리 작성)
      const res = await fetch("/api/ai-chat/stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: userText }),
      });

      if (!res.ok) {
        throw new Error(`HTTP Error: ${res.status}`);
      }

      // TODO: ReadableStream / TextDecoder / SSE 파싱 직접 구현
      if (process.env.NODE_ENV !== "production") {
        console.warn("Response stream received:", res.status);
      }
    } catch (err) {
      console.error("Chat error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-50">
      {/* 1. 토글 버튼 */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="rounded-full bg-cyan-600 px-4 py-3 text-white shadow-lg transition hover:bg-cyan-500 font-medium"
        >
          💬 AI 코치
        </button>
      )}

      {/* 2. 최소 대화창 껍데기 */}
      {isOpen && (
        <div className="flex h-96 w-80 flex-col rounded-xl border border-zinc-700 bg-zinc-900 text-white shadow-2xl">
          {/* 헤더 */}
          <div className="flex items-center justify-between border-b border-zinc-800 p-3">
            <span className="font-semibold text-sm">AI 코치 (통신 테스트)</span>
            <button
              onClick={() => setIsOpen(false)}
              className="text-zinc-400 hover:text-white text-xs px-2 py-1"
            >
              닫기 ✕
            </button>
          </div>

          {/* 메시지 목록 영역 */}
          <div className="flex-1 overflow-y-auto p-3 space-y-2 text-sm">
            {messages.length === 0 && (
              <p className="text-zinc-500 text-xs text-center mt-10">
                메시지를 입력해 스트리밍 통신을 테스트해보세요.
              </p>
            )}
            {messages.map((m) => (
              <div
                key={m.id}
                className={`p-2 rounded-lg max-w-[85%] ${
                  m.role === "user"
                    ? "ml-auto bg-cyan-700 text-white"
                    : "mr-auto bg-zinc-800 text-zinc-200"
                }`}
              >
                {m.content}
              </div>
            ))}
          </div>

          {/* 입력창 & 전송 버튼 */}
          <div className="border-t border-zinc-800 p-2 flex gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              placeholder="질문을 입력하세요..."
              disabled={isLoading}
              className="flex-1 rounded bg-zinc-800 px-3 py-1.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-cyan-500 disabled:opacity-50"
            />
            <button
              onClick={handleSend}
              disabled={isLoading || !input.trim()}
              className="rounded bg-cyan-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-cyan-500 disabled:opacity-50"
            >
              전송
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
