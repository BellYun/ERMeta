"use client";

import { Bot, RotateCcw, Send, Square, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useRef, useState } from "react";
import { useAICoach } from "@/hooks/useAICoach";
import { useFocusTrap } from "@/hooks/useFocusTrap";

export default function AICoachWidget() {
  const t = useTranslations("aiCoach");
  const [isOpen, setIsOpen] = useState(false);
  const [draft, setDraft] = useState("");
  const { messages, isStreaming, nickname, error, setNickname, sendMessage, stop, clear } =
    useAICoach();
  const listRef = useRef<HTMLDivElement>(null);
  const close = useCallback(() => {
    stop();
    setIsOpen(false);
  }, [stop]);
  const panelRef = useFocusTrap<HTMLDivElement>({ active: isOpen, onClose: close });

  useEffect(() => {
    if (isOpen && listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [isOpen, messages]);

  const submit = () => {
    if (!draft.trim() || isStreaming) return;
    void sendMessage(draft);
    setDraft("");
  };

  return (
    <div
      data-theme="dark"
      className="pointer-events-none fixed bottom-[calc(env(safe-area-inset-bottom)+5rem)] right-4 z-[70] flex flex-col items-end gap-3 text-[var(--color-foreground)] lg:bottom-6 lg:right-6"
    >
      {isOpen && (
        <button
          type="button"
          tabIndex={-1}
          aria-label={t("close")}
          onClick={close}
          className="pointer-events-auto fixed inset-0 -z-10 cursor-default bg-black/40"
        />
      )}
      <div
        id="ai-coach-panel"
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="ai-coach-title"
        aria-hidden={!isOpen}
        inert={!isOpen}
        tabIndex={-1}
        className={[
          "flex h-[min(36rem,calc(100dvh-10rem))] w-[calc(100vw-2rem)] max-w-sm flex-col overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-xl outline-none lg:h-[min(36rem,calc(100dvh-7rem))]",
          "transition-[opacity,transform] duration-150 motion-reduce:transition-none",
          isOpen
            ? "pointer-events-auto translate-y-0 opacity-100"
            : "pointer-events-none translate-y-2 opacity-0",
        ].join(" ")}
      >
        <header className="flex shrink-0 items-center gap-2 border-b border-[var(--color-border)] p-3">
          <Bot aria-hidden="true" className="h-5 w-5 shrink-0 text-[var(--color-accent)]" />
          <h2 id="ai-coach-title" className="flex-1 text-sm font-semibold">
            {t("title")}
          </h2>
          <button
            type="button"
            aria-label={t("newChat")}
            title={t("newChat")}
            onClick={() => {
              clear();
              setDraft("");
            }}
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md hover:bg-[var(--color-surface-2)] focus-visible:outline-2 focus-visible:outline-[var(--color-accent)]"
          >
            <RotateCcw aria-hidden="true" className="h-4 w-4" />
          </button>
          <button
            type="button"
            aria-label={t("close")}
            onClick={close}
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md hover:bg-[var(--color-surface-2)] focus-visible:outline-2 focus-visible:outline-[var(--color-accent)]"
          >
            <X aria-hidden="true" className="h-4 w-4" />
          </button>
        </header>

        <div className="shrink-0 border-b border-[var(--color-border)] px-3 py-2">
          <label
            htmlFor="ai-coach-nickname"
            className="mb-1 block text-xs text-[var(--color-muted-foreground)]"
          >
            {t("nickname")}
          </label>
          <input
            id="ai-coach-nickname"
            value={nickname}
            onChange={(event) => setNickname(event.target.value)}
            maxLength={32}
            autoComplete="off"
            placeholder={t("nicknamePlaceholder")}
            className="w-full rounded-md border border-[var(--color-border)] bg-[var(--color-surface-2)] px-3 py-2 text-sm placeholder:text-[var(--color-muted-foreground)] focus-visible:outline-2 focus-visible:outline-[var(--color-accent)]"
          />
        </div>

        <div ref={listRef} className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-3">
          {messages.length === 0 ? (
            <div className="space-y-4 py-3">
              <p className="text-sm leading-relaxed text-[var(--color-muted-foreground)]">
                {t("greeting")}
              </p>
              <div className="flex flex-wrap gap-2">
                {(["patch", "record", "composition"] as const).map((key) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => {
                      void sendMessage(t(`suggestions.${key}`));
                    }}
                    className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-2)] px-3 py-2 text-left text-sm hover:border-[var(--color-accent)] focus-visible:outline-2 focus-visible:outline-[var(--color-accent)]"
                  >
                    {t(`suggestions.${key}`)}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div
              role="log"
              aria-label={t("conversation")}
              aria-live="polite"
              aria-busy={isStreaming}
              className="space-y-3"
            >
              {messages.map((message, index) => (
                <div
                  key={message.id}
                  className={`flex flex-col gap-1 ${message.role === "user" ? "items-end" : "items-start"}`}
                >
                  <span className="text-xs text-[var(--color-muted-foreground)]">
                    {message.role === "user" ? t("you") : t("eri")}
                  </span>
                  <div
                    className={`max-w-[90%] whitespace-pre-wrap break-words rounded-lg border px-3 py-2 text-sm leading-relaxed ${message.role === "user" ? "border-[var(--color-border-light)] bg-[var(--color-surface-3)]" : "border-[var(--color-border)] bg-[var(--color-surface-2)]"}`}
                  >
                    {message.content ||
                      (isStreaming ? (
                        <span className="sr-only">{t("thinking")}</span>
                      ) : (
                        t("noResponse")
                      ))}
                    {isStreaming &&
                      message.role === "assistant" &&
                      index === messages.length - 1 && (
                        <span
                          aria-hidden="true"
                          className="ml-1 inline-block h-4 w-1 animate-pulse bg-[var(--color-accent)] align-middle motion-reduce:animate-none"
                        />
                      )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <form
          onSubmit={(event) => {
            event.preventDefault();
            submit();
          }}
          className="shrink-0 space-y-2 border-t border-[var(--color-border)] p-3"
        >
          {error && (
            <p role="alert" className="text-sm text-[var(--color-danger-readable)]">
              {t(`errors.${error}`)}
            </p>
          )}
          <label htmlFor="ai-coach-message" className="sr-only">
            {t("message")}
          </label>
          <textarea
            id="ai-coach-message"
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
                event.preventDefault();
                submit();
              }
            }}
            placeholder={t("messagePlaceholder")}
            rows={2}
            maxLength={500}
            className="block w-full resize-none rounded-md border border-[var(--color-border)] bg-[var(--color-surface-2)] px-3 py-2 text-sm placeholder:text-[var(--color-muted-foreground)] focus-visible:outline-2 focus-visible:outline-[var(--color-accent)]"
          />
          <div className="flex items-center justify-between gap-3">
            <span className="text-xs text-[var(--color-muted-foreground)]">{draft.length}/500</span>
            {isStreaming ? (
              <button
                type="button"
                onClick={stop}
                className="inline-flex items-center gap-2 rounded-md border border-[var(--color-border-light)] px-3 py-2 text-sm hover:bg-[var(--color-surface-2)] focus-visible:outline-2 focus-visible:outline-[var(--color-accent)]"
              >
                <Square aria-hidden="true" className="h-4 w-4" />
                {t("stop")}
              </button>
            ) : (
              <button
                type="submit"
                disabled={!draft.trim()}
                className="inline-flex items-center gap-2 rounded-md bg-[var(--color-accent)] px-3 py-2 text-sm font-medium text-[var(--color-accent-ink)] hover:bg-[var(--color-accent-hover)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-accent)] disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Send aria-hidden="true" className="h-4 w-4" />
                {t("send")}
              </button>
            )}
          </div>
        </form>
      </div>

      <button
        type="button"
        aria-label={isOpen ? t("close") : t("open")}
        aria-expanded={isOpen}
        aria-controls="ai-coach-panel"
        onClick={() => (isOpen ? close() : setIsOpen(true))}
        className="pointer-events-auto inline-flex h-12 items-center gap-2 rounded-lg border border-[var(--color-border-light)] bg-[var(--color-surface)] px-4 text-sm font-semibold shadow-lg hover:bg-[var(--color-surface-2)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-accent)]"
      >
        {isOpen ? (
          <X aria-hidden="true" className="h-5 w-5" />
        ) : (
          <Bot aria-hidden="true" className="h-5 w-5 text-[var(--color-accent)]" />
        )}
        {t("launcher")}
      </button>
    </div>
  );
}
