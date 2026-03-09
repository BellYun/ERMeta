"use client"

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-20">
      <p className="text-sm text-[var(--color-danger)]">오류가 발생했습니다: {error.message}</p>
      <button
        onClick={reset}
        className="rounded-md border border-[var(--color-border)] px-4 py-2 text-sm text-[var(--color-foreground)] hover:bg-[var(--color-surface-2)] transition-colors"
      >
        다시 시도
      </button>
    </div>
  )
}
