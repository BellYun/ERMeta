"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export interface AICoachMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
}

type AICoachError = "invalidMessage" | "requestFailed" | "rateLimited" | "streamInterrupted";

const NICKNAME_KEY = "ergg_ai_coach_nickname";

export function useAICoach() {
  const [messages, setMessages] = useState<AICoachMessage[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [nickname, setNicknameState] = useState("");
  const [error, setError] = useState<AICoachError | null>(null);
  const controllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    try {
      setNicknameState(localStorage.getItem(NICKNAME_KEY)?.slice(0, 32) ?? "");
    } catch {
      // Storage may be unavailable in private browsing. Chat still works.
    }
    return () => controllerRef.current?.abort();
  }, []);

  const setNickname = useCallback((value: string) => {
    const nextNickname = value.slice(0, 32);
    setNicknameState(nextNickname);
    try {
      localStorage.setItem(NICKNAME_KEY, nextNickname);
    } catch {
      // Keep the nickname in memory when storage is unavailable.
    }
  }, []);

  const stop = useCallback(() => {
    controllerRef.current?.abort();
    controllerRef.current = null;
    setIsStreaming(false);
  }, []);

  const clear = useCallback(() => {
    stop();
    setMessages([]);
    setSessionId(null);
    setError(null);
  }, [stop]);

  const sendMessage = useCallback(
    async (input: string) => {
      if (controllerRef.current) return;
      const message = input.trim();
      if (!message || message.length > 500) {
        setError("invalidMessage");
        return;
      }

      const controller = new AbortController();
      controllerRef.current = controller;
      const assistantId = crypto.randomUUID();
      const isCurrent = () => controllerRef.current === controller && !controller.signal.aborted;
      setMessages((previous) => [
        ...previous,
        { id: crypto.randomUUID(), role: "user", content: message },
        { id: assistantId, role: "assistant", content: "" },
      ]);
      setError(null);
      setIsStreaming(true);

      let reader: ReadableStreamDefaultReader<Uint8Array> | undefined;
      let failure: AICoachError = "requestFailed";
      try {
        const response = await fetch("/api/ai-chat/stream", {
          method: "POST",
          headers: { "Content-Type": "application/json", Accept: "text/event-stream" },
          body: JSON.stringify({
            message,
            sessionId: sessionId ?? undefined,
            nickname: nickname.trim() || undefined,
          }),
          signal: controller.signal,
        });
        if (!isCurrent()) {
          await response.body?.cancel();
          return;
        }
        if (!response.ok) {
          setError(response.status === 429 ? "rateLimited" : "requestFailed");
          return;
        }
        if (
          !response.body ||
          !response.headers.get("Content-Type")?.startsWith("text/event-stream")
        ) {
          throw new Error("Missing SSE response");
        }

        failure = "streamInterrupted";
        reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        let completed = false;

        while (!completed) {
          const { value, done } = await reader.read();
          if (!isCurrent()) return;
          buffer += decoder.decode(value, { stream: !done });

          // An SSE frame (and even a UTF-8 character) may span multiple network chunks.
          let boundary: RegExpExecArray | null;
          while ((boundary = /\r?\n\r?\n/.exec(buffer))) {
            const frame = buffer.slice(0, boundary.index);
            buffer = buffer.slice(boundary.index + boundary[0].length);
            const lines = frame.split(/\r?\n/);
            const event = lines
              .find((line) => line.startsWith("event:"))
              ?.slice(6)
              .trim();
            if (event === "done") {
              completed = true;
              break;
            }
            if (event === "error") throw new Error("SSE error");
            if (event !== "token" && event !== "session") continue;

            const data = JSON.parse(
              lines
                .filter((line) => line.startsWith("data:"))
                .map((line) => line.slice(5).replace(/^ /, ""))
                .join("\n")
            );
            if (event === "session" && typeof data?.sessionId === "string") {
              setSessionId(data.sessionId);
            } else if (event === "token" && typeof data?.text === "string") {
              const text: string = data.text;
              setMessages((previous) =>
                previous.map((entry) =>
                  entry.id === assistantId ? { ...entry, content: entry.content + text } : entry
                )
              );
            } else {
              throw new Error("Invalid SSE data");
            }
          }
          if (done && !completed) throw new Error("SSE ended before done");
        }
      } catch {
        if (isCurrent()) setError(failure);
      } finally {
        if (isCurrent()) {
          controllerRef.current = null;
          setIsStreaming(false);
        }
        if (reader) {
          await reader.cancel().catch(() => undefined);
          reader.releaseLock();
        }
      }
    },
    [nickname, sessionId]
  );

  return {
    messages,
    isStreaming,
    sessionId,
    nickname,
    error,
    setNickname,
    sendMessage,
    stop,
    clear,
  };
}
