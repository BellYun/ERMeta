"use client";

import { useState } from "react";
import { MessageCircle, X, Check } from "lucide-react";

type Category = "버그 신고" | "기능 제안" | "일반 문의";
type FormState = "idle" | "submitting" | "success" | "error";

const CATEGORIES: Category[] = ["버그 신고", "기능 제안", "일반 문의"];

export default function FeedbackWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [category, setCategory] = useState<Category>("일반 문의");
  const [message, setMessage] = useState("");
  const [contact, setContact] = useState("");
  const [formState, setFormState] = useState<FormState>("idle");

  const handleToggle = () => {
    if (formState === "submitting") return;
    setIsOpen((prev) => !prev);
    if (isOpen) {
      setFormState("idle");
    }
  };

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
    <div className="fixed bottom-6 right-6 z-40 flex flex-col items-end gap-3">
      {/* Form Panel */}
      <div
        className={[
          "w-[calc(100vw-2rem)] max-w-sm sm:w-80",
          "rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] shadow-xl",
          "transition-all duration-200 origin-bottom-right",
          isOpen
            ? "opacity-100 translate-y-0 pointer-events-auto"
            : "opacity-0 translate-y-4 pointer-events-none",
          // On small screens keep left margin
          "sm:right-0",
        ].join(" ")}
        style={{ position: "relative" }}
      >
        {formState === "success" ? (
          <div className="flex flex-col items-center justify-center gap-3 p-6 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--color-primary)]">
              <Check className="h-6 w-6 text-white" />
            </div>
            <p className="text-[var(--color-foreground)] font-medium">
              소중한 의견 감사합니다!
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-4 flex flex-col gap-4">
            {/* Header */}
            <p className="text-sm font-semibold text-[var(--color-foreground)]">피드백 보내기</p>

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
              <p className="text-xs text-red-400">
                전송에 실패했습니다. 다시 시도해주세요.
              </p>
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
      <button
        onClick={handleToggle}
        aria-label={isOpen ? "피드백 닫기" : "피드백 보내기"}
        className={[
          "flex h-12 w-12 items-center justify-center rounded-full shadow-lg transition-colors",
          "bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-white",
        ].join(" ")}
      >
        {isOpen ? <X className="h-5 w-5" /> : <MessageCircle className="h-5 w-5" />}
      </button>
    </div>
  );
}
