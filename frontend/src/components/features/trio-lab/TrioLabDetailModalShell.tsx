"use client";

import { X } from "lucide-react";
import { useCallback, useEffect } from "react";
import type { ReactNode } from "react";
import { useRouter } from "@/i18n/navigation";

interface TrioLabDetailModalShellProps {
  children: ReactNode;
  closeHref: string;
}

export function TrioLabDetailModalShell({ children, closeHref }: TrioLabDetailModalShellProps) {
  const router = useRouter();

  const closeModal = useCallback(() => {
    // Intercepted modal is opened through client-side navigation, so history.back()
    // cleanly clears the parallel slot. Fallback keeps direct/edge cases safe.
    if (window.history.length > 1) {
      window.history.back();
      return;
    }
    router.replace(closeHref, { scroll: false });
  }, [closeHref, router]);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        closeModal();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [closeModal]);

  return (
    <div
      className="fixed inset-0 z-[120] flex items-start justify-center bg-[rgba(3,6,14,0.82)] px-3 py-4 backdrop-blur-sm sm:px-5 sm:py-6 lg:px-8"
      onClick={closeModal}
      aria-label="조합 실험실로 돌아가기"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="조합 상세 미리보기"
        onClick={(event) => event.stopPropagation()}
        className="relative z-[1] flex max-h-full w-full max-w-6xl flex-col overflow-hidden rounded-[28px] border border-[var(--color-border)] bg-[rgba(6,10,22,0.98)] shadow-[0_36px_120px_-48px_rgba(0,0,0,0.92)]"
      >
        <div className="flex items-center justify-between border-b border-[var(--color-border)] px-4 py-3 sm:px-5">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--color-muted-foreground)]">
            Trio Detail Preview
          </p>
          <button
            type="button"
            onClick={closeModal}
            aria-label="미리보기 닫기"
            className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-[var(--color-border)] bg-[var(--color-surface-3)] text-[var(--color-foreground)] transition-colors hover:border-[var(--color-border-light)] hover:bg-[rgba(255,255,255,0.08)]"
          >
            <X className="h-4 w-4" strokeWidth={2.2} />
          </button>
        </div>
        <div className="min-h-0 overflow-y-auto px-3 py-4 sm:px-5 sm:py-5">
          <div className="page-shell mx-auto flex max-w-6xl flex-col gap-5 lg:gap-6">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
