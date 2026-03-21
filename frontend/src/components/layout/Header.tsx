import Link from "next/link"
import { Badge } from "@/components/ui/badge"
import { Navigation } from "./Navigation"

const CURRENT_PATCH = "10.5"

export function Header() {
  return (
    <header className="sticky top-0 z-50 w-full bg-[var(--color-surface)]/90 backdrop-blur-md">
      <div className="h-[1px] bg-gradient-to-r from-transparent via-[var(--color-primary)] to-transparent" />
      <div className="max-w-6xl mx-auto px-4 sm:px-4 h-12 sm:h-14 flex items-center justify-between gap-2">
        <Link href="/" className="flex items-center gap-2 shrink-0 group">
          <div className="flex items-center gap-1.5">
            <div className="h-7 w-7 rounded-lg bg-gradient-to-br from-[var(--color-primary)] to-[var(--color-accent-purple)] flex items-center justify-center text-[11px] font-black text-white shadow-[0_0_12px_var(--color-primary-glow)]">
              ER
            </div>
            <div className="flex flex-col leading-tight">
              <span className="text-lg font-bold bg-gradient-to-r from-[var(--color-foreground)] to-[var(--color-muted-foreground)] bg-clip-text text-transparent group-hover:from-[var(--color-primary)] group-hover:to-[var(--color-foreground)] transition-all duration-300">
                ER&GG
              </span>
              <span className="text-[9px] font-medium text-[var(--color-muted-foreground)] -mt-0.5">
                이리와지지
              </span>
            </div>
          </div>
        </Link>

        {/* Desktop: center navigation */}
        <div className="flex-1 hidden sm:flex justify-center">
          <Navigation />
        </div>

        {/* Mobile: push badge to right, Desktop: show badge */}
        <div className="shrink-0 ml-auto sm:ml-0">
          <Badge variant="gold" className="text-[10px] sm:text-xs">패치 {CURRENT_PATCH}</Badge>
        </div>
      </div>
      <div className="h-[1px] bg-[var(--color-border)]" />
    </header>
  )
}
