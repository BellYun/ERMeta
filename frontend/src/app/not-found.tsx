import Link from "next/link"

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-20">
      <h2 className="text-lg font-semibold text-[var(--color-foreground)]">페이지를 찾을 수 없습니다</h2>
      <p className="text-sm text-[var(--color-muted-foreground)]">요청하신 페이지가 존재하지 않습니다.</p>
      <Link
        href="/"
        className="rounded-md border border-[var(--color-border)] px-4 py-2 text-sm text-[var(--color-foreground)] hover:bg-[var(--color-surface-2)] transition-colors"
      >
        홈으로 돌아가기
      </Link>
    </div>
  )
}
