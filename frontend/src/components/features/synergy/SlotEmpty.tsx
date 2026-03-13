"use client"

import { Users } from "lucide-react"

export function SlotEmpty({ index }: { index: number }) {
  return (
    <div className="flex flex-1 items-center gap-3 rounded-xl border border-dashed border-[var(--color-border)] px-4 py-3">
      <div className="flex h-10 w-10 items-center justify-center rounded-md bg-[var(--color-surface-2)] text-[var(--color-border)]">
        <Users className="h-5 w-5" />
      </div>
      <span className="text-sm text-[var(--color-border)]">
        아군 캐릭터 {index + 1} 선택
      </span>
    </div>
  )
}
