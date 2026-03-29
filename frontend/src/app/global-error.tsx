"use client"

import * as Sentry from "@sentry/nextjs"
import { useEffect } from "react"

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    Sentry.captureException(error, {
      tags: { errorBoundary: "global" },
    })
  }, [error])

  return (
    <html lang="ko">
      <body>
        <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-[#0a0a0f] text-white">
          <h2 className="text-lg font-semibold">예기치 못한 오류가 발생했습니다</h2>
          <p className="text-sm text-gray-400">문제가 자동으로 보고되었습니다</p>
          <button
            onClick={reset}
            className="rounded-md border border-gray-700 px-4 py-2 text-sm hover:bg-gray-800 transition-colors"
          >
            다시 시도
          </button>
        </div>
      </body>
    </html>
  )
}
