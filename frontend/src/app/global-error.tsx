"use client";

import { useEffect } from "react";
import { NoIndexMeta } from "@/components/seo/NoIndexMeta";
import { captureException } from "@/lib/sentry-client";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    captureException(error, {
      tags: { errorBoundary: "global" },
    });
  }, [error]);

  return (
    <html lang="ko">
      <body>
        <NoIndexMeta />
        <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-[var(--color-background)] text-[var(--color-foreground)]">
          <h2 className="text-lg font-semibold">서비스를 불러오지 못했습니다</h2>
          <p className="text-sm text-[var(--color-muted-foreground)]">
            잠시 후 다시 시도해 주세요.
          </p>
          <button
            onClick={reset}
            className="rounded-md border border-[var(--color-border)] px-4 py-2 text-sm"
          >
            새로고침
          </button>
        </div>
      </body>
    </html>
  );
}
