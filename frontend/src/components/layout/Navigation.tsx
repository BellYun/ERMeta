"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"

const navLinks = [
  { href: "/", label: "메타 분석" },
  { href: "/synergy", label: "조합 추천" },
  { href: "/character-analysis", label: "캐릭터 분석" },
]

export function Navigation() {
  const pathname = usePathname()

  return (
    <nav className="flex items-center gap-0.5 rounded-lg bg-[var(--color-surface-2)]/60 p-1">
      {navLinks.map(({ href, label }) => (
        <Link
          key={href}
          href={href}
          className={cn(
            "px-3 py-1.5 rounded-md text-sm font-medium transition-all duration-200",
            pathname === href
              ? "bg-[var(--color-primary)]/15 text-[var(--color-primary)] shadow-[0_0_8px_var(--color-primary-glow)]"
              : "text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)] hover:bg-[var(--color-surface-3)]"
          )}
        >
          {label}
        </Link>
      ))}
    </nav>
  )
}
