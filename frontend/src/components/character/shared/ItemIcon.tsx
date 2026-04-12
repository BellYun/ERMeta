"use client"

import Image from "next/image"
import itemImageMap from "@/../const/itemImageMap.json"
import { cn } from "@/lib/utils"
import { getItemGrade, GRADE_BG } from "./item-utils"

export function ItemIcon({ code, size = 36 }: { code: number | null; size?: number }) {
  if (code == null) {
    return (
      <div
        className="rounded-lg bg-[var(--color-surface-2)] border border-[var(--color-border)]"
        style={{ width: size, height: size }}
      />
    )
  }

  const imgPath = (itemImageMap as Record<string, string>)[String(code)]
  const grade = getItemGrade(code)
  const gradeBg = grade ? GRADE_BG[grade] : "bg-[var(--color-surface-2)]"

  if (!imgPath) {
    return (
      <div
        className={cn(
          "rounded-lg flex items-center justify-center",
          gradeBg
        )}
        style={{ width: size, height: size }}
      >
        <span className="text-[8px] text-[var(--color-muted-foreground)]">?</span>
      </div>
    )
  }

  return (
    <div
      className={cn("relative rounded-lg overflow-hidden", gradeBg)}
      style={{ width: size, height: size }}
    >
      <Image
        src={imgPath}
        alt={String(code)}
        fill
        className="rounded-lg object-cover"
        sizes={`${size}px`}
        unoptimized
      />
    </div>
  )
}
