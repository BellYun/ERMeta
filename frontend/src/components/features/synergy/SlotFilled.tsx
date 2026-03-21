"use client"

import Image from "next/image"
import { X } from "lucide-react"
import { getCharacterMiniWebpUrl } from "@/lib/characterMap"

export function SlotFilled({
  code,
  name,
  onRemove,
}: {
  code: number
  name: string
  onRemove: () => void
}) {
  return (
    <div className="flex flex-1 items-center gap-3 rounded-lg border border-[var(--color-primary)]/50 bg-[var(--color-primary)]/10 px-4 py-3">
      <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-md bg-[var(--color-border)]">
        <Image
          src={getCharacterMiniWebpUrl(code)}
          alt={name}
          fill
          className="object-cover"
          sizes="40px"
        />
      </div>
      <span className="flex-1 text-sm font-medium text-[var(--color-foreground)]">
        {name}
      </span>
      <button
        onClick={onRemove}
        className="rounded-md p-0.5 text-[var(--color-muted-foreground)] hover:bg-[var(--color-surface-2)] hover:text-[var(--color-foreground)] transition-colors"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  )
}
