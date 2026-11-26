"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  status?: "streaming" | "completed" | "aborted" | "error";
  errorMessage?: string;
}

type StreamStatus = "idle" | "waiting" | "streaming";

export const AI_COACH_MESSAGE_MAX_LENGTH = 500;
export const AI_COACH_NICKNAME_MAX_LENGTH = 32;
const NICKNAME_STORAGE_KEY = "ergg_ai_coach_nickname";
const QUOTA_ERROR = "오늘 일일 질문 한도(30회)를 초과했습니다. 내일 09:00(KST)에 초기화됩니다.";
const SERVER_ERROR = "서버와 통신 중 오류가 발생했습니다.";
const NETWORK_ERROR = "네트워크 연결이 끊겼습니다.";

function readNickname() {
  try {
    return (window.localStorage.getItem(NICKNAME_STORAGE_KEY) ?? "").slice(
      0,
      AI_COACH_NICKNAME_MAX_LENGTH
    );
  } catch {
    return "";
  }
}

export function parseEvent(frame: string) {
  let event = "";
  const data: string[] = [];

  for (const line of frame.split(/\r?\n/)) {
    if (line.startsWith("event:")) event = line.slice(6).trim();
    if (line.startsWith("data:")) data.push(line.slice(5).replace(/^ /, ""));
  }

  return { event, data: data.join("\n") };
}

export function useAICoach() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [streamStatus, setStreamStatus] = useState<StreamStatus>("idle");
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [nickname, setSavedNickname] = useState(readNickname);
  const controllerRef = useRef<AbortController | null>(null);
  const readerRef = useRef<ReadableStreamDefaultReader<Uint8Array> | null>(null);
  const pendingTextRef = useRef<{ assistantId: string; text: string } | null>(null);
  const rafIdRef = useRef<number | null>(null);

  const flushPendingText = useCallback(() => {
    if (rafIdRef.current !== null) {
      window.cancelAnimationFrame(rafIdRef.current);
      rafIdRef.current = null;
    }

    const pending = pendingTextRef.current;
    if (pending === null) return;

    pendingTextRef.current = null;
    setMessages((previous) =>
      previous.map((entry) =>
        entry.id === pending.assistantId
          ? { ...entry, content: entry.content + pending.text }
          : entry
      )
    );
  }, []);

  const stop = useCallback(() => {
    flushPendingText();
    controllerRef.current?.abort();
  }, [flushPendingText]);

  // 1. 컴포넌트 언마운트 및 브라우저 이탈(pagehide) 시 즉시 Abort
  useEffect(() => {
    window.addEventListener("pagehide", stop);
    return () => {
      window.removeEventListener("pagehide", stop);
      stop();
    };
  }, [stop]);

  // 2. 탭 전환/알트탭 방치(visibilitychange) 감지: 15초 이상 백그라운드 지속 시 자동 Abort (고아 토큰 차단)
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const handleVisibility = () => {
      if (document.hidden && streamStatus !== "idle") {
        timer = setTimeout(() => {
          if (document.hidden) {
            stop();
          }
        }, 15_000);
      } else if (!document.hidden) {
        clearTimeout(timer);
      }
    };
    document.addEventListener("visibilitychange", handleVisibility);
    return () => {
      clearTimeout(timer);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [streamStatus, stop]);

  function setNickname(name: string) {
    const value = name.trim().slice(0, AI_COACH_NICKNAME_MAX_LENGTH);
    setSavedNickname(value);
    try {
      window.localStorage.setItem(NICKNAME_STORAGE_KEY, value);
    } catch {
      // Keep the nickname for the current visit when browser storage is unavailable.
    }
  }

  async function sendMessage(input: string) {
    const message = input.trim();
    if (
      !message ||
      message.length > AI_COACH_MESSAGE_MAX_LENGTH ||
      streamStatus !== "idle" ||
      controllerRef.current
    )
      return;

    const userId = crypto.randomUUID();
    const assistantId = crypto.randomUUID();
    const controller = new AbortController();
    controllerRef.current = controller;

    setMessages((previous) => [
      ...previous,
      { id: userId, role: "user", content: message },
      { id: assistantId, role: "assistant", content: "", status: "streaming" },
    ]);
    setStreamStatus("waiting");

    function updateAssistant(update: (message: ChatMessage) => ChatMessage) {
      setMessages((previous) =>
        previous.map((entry) => (entry.id === assistantId ? update(entry) : entry))
      );
    }

    function fail(errorMessage: string) {
      updateAssistant((entry) => ({ ...entry, status: "error", errorMessage }));
    }

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
      controller.signal.throwIfAborted();

      if (!response.ok || !response.body) {
        fail(response.status === 429 ? QUOTA_ERROR : SERVER_ERROR);
        return;
      }

      const reader = response.body.getReader();
      readerRef.current = reader;
      const decoder = new TextDecoder();
      let buffer = "";
      let hasToken = false;

      while (true) {
        const { done, value } = await reader.read();
        controller.signal.throwIfAborted();
        buffer += done ? decoder.decode() : decoder.decode(value, { stream: true });
        const frames = buffer.split(/\r?\n\r?\n/);
        buffer = frames.pop() ?? "";

        for (const frame of frames) {
          const { event, data } = parseEvent(frame);
          if (event === "done") {
            updateAssistant((entry) => ({ ...entry, status: "completed" }));
            return;
          }
          if (event !== "token" && event !== "session" && event !== "error") continue;

          const payload = JSON.parse(data) as {
            text?: string;
            sessionId?: string;
            message?: string;
          } | null;
          if (event === "error") {
            fail(typeof payload?.message === "string" ? payload.message : SERVER_ERROR);
            return;
          }
          if (event === "session" && typeof payload?.sessionId === "string") {
            setSessionId(payload.sessionId);
          }
          if (event === "token" && typeof payload?.text === "string" && payload.text.length > 0) {
            if (!hasToken) {
              hasToken = true;
              setStreamStatus("streaming");
            }

            pendingTextRef.current ??= { assistantId, text: "" };
            pendingTextRef.current.text += payload.text;
            if (
              typeof window !== "undefined" &&
              typeof window.requestAnimationFrame === "function"
            ) {
              if (rafIdRef.current === null) {
                rafIdRef.current = window.requestAnimationFrame(() => {
                  rafIdRef.current = null;
                  flushPendingText();
                });
              }
            } else {
              flushPendingText();
            }
          }
        }

        if (done) {
          fail(NETWORK_ERROR);
          return;
        }
      }
    } catch (error) {
      if (
        controller.signal.aborted ||
        (error instanceof DOMException && error.name === "AbortError")
      ) {
        updateAssistant((entry) => ({ ...entry, status: "aborted" }));
      } else {
        fail(NETWORK_ERROR);
      }
    } finally {
      flushPendingText();
      const reader = readerRef.current;
      if (reader) {
        void reader.cancel().catch(() => {});
        reader.releaseLock();
      }
      readerRef.current = null;
      controllerRef.current = null;
      setStreamStatus("idle");
    }
  }

  function clear() {
    stop();
    setMessages([]);
    setSessionId(null);
  }

  function retry() {
    const [lastUser, lastAssistant] = messages.slice(-2);
    if (
      lastUser?.role === "user" &&
      (lastAssistant?.status === "error" || lastAssistant?.status === "aborted")
    ) {
      return sendMessage(lastUser.content);
    }
  }

  return {
    messages,
    streamStatus,
    sessionId,
    nickname,
    setNickname,
    sendMessage,
    stop,
    clear,
    retry,
  };
}
