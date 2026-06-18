"use client";

import { AlertTriangle, RefreshCw } from "lucide-react";
import { useEffect } from "react";
import { NoIndexMeta } from "@/components/seo/NoIndexMeta";
import { captureException } from "@/lib/sentry-client";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    captureException(error, {
      tags: { errorBoundary: "page", page: "root" },
    });
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center gap-4 py-20 text-center">
      <NoIndexMeta />
      <AlertTriangle className="h-10 w-10 text-[var(--color-danger)]" />
      <h2 className="text-base font-semibold text-[var(--color-foreground)]">
        화면을 불러오지 못했습니다
      </h2>
      <p className="text-xs text-[var(--color-muted-foreground)]">잠시 후 다시 시도해 주세요.</p>
      <button
        onClick={reset}
        className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--color-surface-2)] border border-[var(--color-border)] px-4 py-2 text-sm font-medium text-[var(--color-foreground)] hover:bg-[var(--color-surface)] transition-colors"
      >
        <RefreshCw className="h-3.5 w-3.5" />
        새로고침
      </button>
    </div>
  );
}
