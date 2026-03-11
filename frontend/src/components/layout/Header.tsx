import Link from "next/link"
import { Badge } from "@/components/ui/badge"
import { Navigation } from "./Navigation"

const CURRENT_PATCH = "10.4"

export function Header() {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-[var(--color-border)] bg-[var(--color-surface)]/95 backdrop-blur-sm">
      <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between gap-2">
        <Link href="/" className="flex items-center gap-2 shrink-0">
          <span className="text-lg font-bold text-[var(--color-primary)]">ER&GG</span>
        </Link>

        <div className="flex-1 flex justify-center">
          <Navigation />
        </div>

        <div className="shrink-0 hidden sm:block">
          <Badge variant="gold">패치 {CURRENT_PATCH}</Badge>
        </div>
      </div>
    </header>
  )
}
