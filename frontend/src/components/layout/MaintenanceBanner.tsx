"use client"

import { useState } from "react"
import { AlertTriangle, X } from "lucide-react"

export function MaintenanceBanner() {
  const [dismissed, setDismissed] = useState(false)

  if (dismissed) return null

  return (
    <div className="relative bg-[var(--color-accent-gold)]/10 border border-[var(--color-accent-gold)]/30 text-[var(--color-accent-gold)] px-4 py-2.5 text-center text-sm">
      <div className="flex items-center justify-center gap-2">
        <AlertTriangle className="h-4 w-4 shrink-0" />
        <span>
          현재 DB 부하로 인해 일부 데이터(아이템, 상세분석 등)가 일시적으로 느리거나 표시되지 않을 수 있습니다. 빠르게 복구 중이니 양해 부탁드립니다.
        </span>
      </div>
      <button
        onClick={() => setDismissed(true)}
        className="absolute right-2 top-1/2 -translate-y-1/2 p-1 hover:bg-[var(--color-accent-gold)]/20 rounded"
        aria-label="닫기"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  )
}
