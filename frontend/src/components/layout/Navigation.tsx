"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"

const navLinks = [
  { href: "/", label: "메타 분석" },
  { href: "/synergy-detail", label: "조합 추천" },
  { href: "/character/1", label: "캐릭터 분석" },
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
            "px-3 py-1.5 rounded-md text-sm font-medium transition-colors",
            href.startsWith("/character/") ? pathname.startsWith("/character/") : pathname === href
              ? "text-[var(--color-primary)] bg-[var(--color-primary)]/10"
              : "text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)]"
          )}
        >
          {label}
        </Link>
      ))}
    </nav>
  )
}
