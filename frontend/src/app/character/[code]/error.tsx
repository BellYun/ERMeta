"use client"

import { AlertTriangle, RefreshCw, ArrowLeft } from "lucide-react"
import Link from "next/link"
import { useEffect } from "react"
import { captureException } from "@/lib/sentry-client"

export default function CharacterError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    captureException(error, {
      tags: { errorBoundary: "page", page: "character" },
    })
  }, [error])

  return (
    <div className="flex flex-col items-center justify-center gap-4 py-20 text-center">
      <AlertTriangle className="h-10 w-10 text-[var(--color-danger)]" />
      <h2 className="text-base font-semibold text-[var(--color-foreground)]">
        캐릭터 분석 데이터를 불러오지 못했습니다
      </h2>
      <p className="text-xs text-[var(--color-muted-foreground)] max-w-sm">
        서버 연결에 문제가 있거나 일시적인 오류입니다. 문제가 자동으로 보고되었습니다.
      </p>
      <div className="flex items-center gap-3 mt-2">
        <button
          onClick={reset}
          className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--color-surface-2)] border border-[var(--color-border)] px-4 py-2 text-sm font-medium text-[var(--color-foreground)] hover:bg-[var(--color-surface)] transition-colors"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          다시 시도
        </button>
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--color-border)] px-4 py-2 text-sm text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)] transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          메인으로
        </Link>
      </div>
    </div>
  )
}
