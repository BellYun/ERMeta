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
    <nav className="flex items-center gap-1">
      {navLinks.map(({ href, label }) => (
        <Link
          key={href}
          href={href}
          className={cn(
            "px-2 py-1.5 sm:px-3 rounded-md text-sm font-medium transition-colors",
            pathname === href
              ? "bg-[var(--color-surface-2)] text-[var(--color-foreground)]"
              : "text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)] hover:bg-[var(--color-surface-2)]"
          )}
        >
          {label}
        </Link>
      ))}
    </nav>
  )
}
