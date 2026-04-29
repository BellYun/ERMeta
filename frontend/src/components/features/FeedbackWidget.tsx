"use client";

import { Check, MessageCircle, X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useFocusTrap } from "@/hooks/useFocusTrap";

type Category = "버그 신고" | "기능 제안" | "일반 문의";
type FormState = "idle" | "submitting" | "success" | "error";

const CATEGORIES: Category[] = ["버그 신고", "기능 제안", "일반 문의"];

export default function FeedbackWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [category, setCategory] = useState<Category>("일반 문의");
  const [message, setMessage] = useState("");
  const [contact, setContact] = useState("");
  const [formState, setFormState] = useState<FormState>("idle");

  const openPanel = useCallback(() => {
    setFormState("idle");
    setIsOpen(true);
  }, []);

  const handleClose = useCallback(() => {
    if (formState === "submitting") return;
    setIsOpen(false);
    setFormState("idle");
  }, [formState]);

  const panelRef = useFocusTrap<HTMLDivElement>({ active: isOpen, onClose: handleClose });

  const handleToggle = useCallback(() => {
    if (formState === "submitting") return;
    setIsOpen((prev) => !prev);
    if (isOpen) {
      setFormState("idle");
    }
  }, [formState, isOpen]);

  useEffect(() => {
    const handleExternalOpen = () => openPanel();
    const handleExternalToggle = () => handleToggle();

    window.addEventListener("ergg:feedback-open", handleExternalOpen);
    window.addEventListener("ergg:feedback-toggle", handleExternalToggle);
    return () => {
      window.removeEventListener("ergg:feedback-open", handleExternalOpen);
      window.removeEventListener("ergg:feedback-toggle", handleExternalToggle);
    };
  }, [openPanel, handleToggle]);

  useEffect(() => {
    window.dispatchEvent(new CustomEvent("ergg:feedback-state", { detail: { open: isOpen } }));
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (message.trim().length < 5) return;
    setFormState("submitting");
    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ category, message: message.trim(), contact: contact.trim() }),
      });
      if (!res.ok) throw new Error("request failed");
      setFormState("success");
      setTimeout(() => {
        setIsOpen(false);
        setFormState("idle");
        setMessage("");
        setContact("");
        setCategory("일반 문의");
      }, 2000);
    } catch {
      setFormState("error");
    }
  };

  return (
    // pointer-events-none 핵심: 닫힌 panel 도 layout 박스(약 358×410px)를 그대로 차지해
    // 모바일 화면 하단 ~50% 의 hit-test 를 wrapper 가 흡수하던 버그.
    // FAB / 열린 panel 에서만 pointer-events:auto 로 다시 켜고 그 외 빈 영역은 통과시킴.
    <div className="pointer-events-none fixed bottom-[calc(78px+env(safe-area-inset-bottom)+0.75rem)] right-4 z-[60] flex flex-col items-end gap-3 lg:bottom-6 lg:left-6 lg:right-auto lg:items-start xl:left-8">
      {/* Form Panel */}
      <div
        id="feedback-panel"
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label="피드백 보내기"
        inert={!isOpen}
        tabIndex={-1}
        className={[
          "w-[calc(100vw-2rem)] max-w-sm sm:w-80 lg:w-[17.5rem] xl:w-[18rem]",
          "rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] shadow-xl",
          "transition-all duration-200 origin-bottom-right focus:outline-none lg:origin-bottom-left",
          isOpen
            ? "opacity-100 translate-y-0 pointer-events-auto"
            : "opacity-0 translate-y-4 pointer-events-none",
        ].join(" ")}
        style={{ position: "relative" }}
      >
        {formState === "success" ? (
          <div className="flex flex-col items-center justify-center gap-3 p-6 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--color-primary)]">
              <Check className="h-6 w-6 text-white" />
            </div>
            <p className="text-[var(--color-foreground)] font-medium">소중한 의견 감사합니다!</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-4 flex flex-col gap-4">
            {/* Header */}
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-semibold text-[var(--color-foreground)]">피드백 보내기</p>
              <button
                type="button"
                onClick={handleClose}
                aria-label="피드백 닫기"
                className="inline-flex h-8 w-8 items-center justify-center rounded-full text-[var(--color-muted-foreground)] transition-colors hover:bg-[var(--color-surface-2)] hover:text-[var(--color-foreground)]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Category */}
            <div className="flex gap-2 flex-wrap">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setCategory(cat)}
                  className={[
                    "rounded-full px-3 py-1 text-xs font-medium border transition-colors",
                    category === cat
                      ? "bg-[var(--color-primary)] border-[var(--color-primary)] text-white"
                      : "bg-transparent border-[var(--color-border)] text-[var(--color-muted-foreground)] hover:border-[var(--color-primary)] hover:text-[var(--color-foreground)]",
                  ].join(" ")}
                >
                  {cat}
                </button>
              ))}
            </div>

            {/* Message */}
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="의견을 자유롭게 남겨주세요"
              required
              minLength={5}
              rows={4}
              className={[
                "w-full resize-none rounded-md border border-[var(--color-border)]",
                "bg-[var(--color-surface-2)] text-[var(--color-foreground)] text-sm",
                "placeholder:text-[var(--color-muted-foreground)]",
                "px-3 py-2 outline-none focus:border-[var(--color-primary)] transition-colors",
              ].join(" ")}
            />

            {/* Contact */}
            <input
              type="text"
              value={contact}
              onChange={(e) => setContact(e.target.value)}
              placeholder="답변받을 연락처 (선택)"
              className={[
                "w-full rounded-md border border-[var(--color-border)]",
                "bg-[var(--color-surface-2)] text-[var(--color-foreground)] text-sm",
                "placeholder:text-[var(--color-muted-foreground)]",
                "px-3 py-2 outline-none focus:border-[var(--color-primary)] transition-colors",
              ].join(" ")}
            />

            {/* Error */}
            {formState === "error" && (
              <p className="text-xs text-red-400">전송에 실패했습니다. 다시 시도해주세요.</p>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={formState === "submitting" || message.trim().length < 5}
              className={[
                "w-full rounded-md py-2 text-sm font-medium text-white transition-colors",
                formState === "submitting" || message.trim().length < 5
                  ? "bg-[var(--color-primary)] opacity-50 cursor-not-allowed"
                  : "bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)]",
              ].join(" ")}
            >
              {formState === "submitting" ? "보내는 중..." : "보내기"}
            </button>
          </form>
        )}
      </div>

      {/* FAB */}
      {/* pointer-events-auto 필수: wrapper 가 pointer-events-none 이므로 FAB 도 상속받아 hit-test 안 됨.
          누락 시 "의견 보내기 버튼 안 눌림" 회귀. 원칙은 feedback_fixed_wrapper_pointer_events.md. */}
      <button
        onClick={handleToggle}
        aria-label={isOpen ? "피드백 패널 접기" : "피드백 보내기"}
        className={[
          "pointer-events-auto",
          "lg:hidden",
          "flex h-12 w-12 items-center justify-center rounded-full shadow-lg transition-colors",
          "bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-white",
        ].join(" ")}
      >
        {isOpen ? <X className="h-5 w-5" /> : <MessageCircle className="h-5 w-5" />}
      </button>
    </div>
  );
}
