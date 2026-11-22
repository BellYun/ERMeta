"use client";

import { useLocale } from "next-intl";
import { type FormEvent, useEffect, useRef, useState } from "react";
import {
  AI_COACH_MESSAGE_MAX_LENGTH,
  AI_COACH_NICKNAME_MAX_LENGTH,
  useAICoach,
} from "@/hooks/useAICoach";
import copyByLocale from "../../../../messages/ai-coach.json";

export function AICoachWidget() {
  const locale = useLocale() as keyof typeof copyByLocale;
  const copy = copyByLocale[locale] ?? copyByLocale.ko;
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState("");
  const [nicknameDraft, setNicknameDraft] = useState<string | null>(null);
  const { messages, streamStatus, nickname, setNickname, sendMessage, stop, clear, retry } =
    useAICoach();
  const messageListRef = useRef<HTMLDivElement>(null);
  const isAtBottomRef = useRef(true);
  const isBusy = streamStatus !== "idle";

  function handleScroll() {
    const list = messageListRef.current;
    if (list) {
      isAtBottomRef.current = list.scrollHeight - list.scrollTop - list.clientHeight <= 24;
    }
  }

  useEffect(() => {
    const list = messageListRef.current;
    if (list && isAtBottomRef.current) {
      list.scrollTop = list.scrollHeight;
    }
  }, [isOpen, messages]);

  function handleSend(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!input.trim() || isBusy) return;
    void sendMessage(input);
    setInput("");
  }

  function handleNicknameSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (nicknameDraft === null) return;
    setNickname(nicknameDraft);
    setNicknameDraft(null);
  }

  return (
    <div className="fixed bottom-[calc(env(safe-area-inset-bottom)+4.5rem)] right-4 z-50 lg:bottom-6 lg:right-6">
      {!isOpen ? (
        <button
          type="button"
          onClick={() => {
            isAtBottomRef.current = true;
            setIsOpen(true);
          }}
          className="rounded-full bg-cyan-700 px-4 py-3 font-medium text-white shadow-lg transition hover:bg-cyan-600"
        >
          <span aria-hidden="true">💬</span> {copy.title}
        </button>
      ) : (
        <section
          aria-label={copy.title}
          className="flex h-[28rem] max-h-[calc(100dvh-5.5rem-env(safe-area-inset-bottom))] w-80 max-w-[calc(100vw-2rem)] flex-col rounded-xl border border-zinc-700 bg-zinc-900 text-white shadow-2xl lg:max-h-[calc(100dvh-3rem)]"
        >
          <div className="flex items-center justify-between gap-2 border-b border-zinc-800 p-3">
            <h2 className="text-sm font-semibold">{copy.title}</h2>
            <div className="flex items-center gap-3 text-xs text-zinc-400">
              <button
                type="button"
                onClick={clear}
                disabled={messages.length === 0}
                className="hover:text-white disabled:opacity-50"
              >
                {copy.clear}
              </button>
              <button type="button" onClick={() => setIsOpen(false)} className="hover:text-white">
                {copy.close} <span aria-hidden="true">✕</span>
              </button>
            </div>
          </div>

          <form onSubmit={handleNicknameSave} className="flex gap-2 border-b border-zinc-800 p-2">
            <input
              type="text"
              aria-label={copy.nickname}
              value={nicknameDraft ?? nickname}
              onChange={(event) => setNicknameDraft(event.target.value)}
              placeholder={copy.nickname}
              maxLength={AI_COACH_NICKNAME_MAX_LENGTH}
              className="min-w-0 flex-1 rounded bg-zinc-800 px-3 py-1.5 text-xs text-white placeholder-zinc-400 focus-visible:outline-cyan-500"
            />
            <button
              type="submit"
              disabled={nicknameDraft === null}
              className="rounded bg-zinc-700 px-3 text-xs hover:bg-zinc-600 disabled:opacity-50"
            >
              {copy.save}
            </button>
          </form>

          <div
            ref={messageListRef}
            onScroll={handleScroll}
            role="log"
            aria-label={copy.title}
            aria-busy={isBusy}
            className="flex-1 space-y-2 overflow-y-auto p-3 text-sm"
          >
            {messages.map((message, index) => (
              <div
                key={message.id}
                className={`max-w-[85%] whitespace-pre-wrap break-words rounded-lg p-2 ${
                  message.role === "user"
                    ? "ml-auto bg-cyan-700 text-white"
                    : "mr-auto bg-zinc-800 text-zinc-200"
                }`}
              >
                {message.content}
                {message.status === "streaming" && isBusy && (
                  <>
                    {streamStatus === "waiting" && !message.content && <span>{copy.waiting}</span>}
                    <span
                      aria-hidden="true"
                      className="ml-0.5 text-cyan-300 motion-safe:animate-pulse"
                    >
                      ▋
                    </span>
                  </>
                )}
                {message.status === "aborted" && (
                  <span className="block text-xs text-amber-300">{copy.aborted}</span>
                )}
                {message.status === "error" && (
                  <p className="text-xs text-red-300">{message.errorMessage}</p>
                )}
                {(message.status === "aborted" || message.status === "error") &&
                  index === messages.length - 1 && (
                    <button
                      type="button"
                      onClick={() => void retry()}
                      disabled={isBusy}
                      className="mt-1 block text-xs text-cyan-300 hover:underline disabled:opacity-50"
                    >
                      {copy.retry}
                    </button>
                  )}
              </div>
            ))}
          </div>

          <div className="flex flex-wrap gap-1 border-t border-zinc-800 px-2 pt-2">
            {copy.quickQuestions.map((question) => (
              <button
                key={question}
                type="button"
                onClick={() => void sendMessage(question)}
                disabled={isBusy}
                className="rounded-full border border-zinc-700 px-2 py-1 text-xs text-zinc-200 hover:border-cyan-500 disabled:opacity-50"
              >
                {question}
              </button>
            ))}
          </div>
          <form onSubmit={handleSend} className="flex gap-2 p-2">
            <input
              type="text"
              aria-label={copy.question}
              value={input}
              onChange={(event) => setInput(event.target.value)}
              placeholder={copy.question}
              maxLength={AI_COACH_MESSAGE_MAX_LENGTH}
              disabled={isBusy}
              className="min-w-0 flex-1 rounded bg-zinc-800 px-3 py-1.5 text-xs text-white placeholder-zinc-400 focus-visible:outline-cyan-500 disabled:opacity-50"
            />
            {isBusy ? (
              <button
                type="button"
                onClick={stop}
                className="rounded bg-zinc-700 px-3 py-1.5 text-xs font-medium hover:bg-zinc-600"
              >
                {copy.stop}
              </button>
            ) : (
              <button
                type="submit"
                disabled={!input.trim()}
                className="rounded bg-cyan-700 px-3 py-1.5 text-xs font-medium hover:bg-cyan-600 disabled:opacity-50"
              >
                {copy.send}
              </button>
            )}
          </form>
        </section>
      )}
    </div>
  );
}
