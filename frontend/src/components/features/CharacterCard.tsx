import Image from "next/image"
import { cn } from "@/lib/utils"

interface CharacterCardProps {
  name: string
  imageUrl: string
  rateChange: number
  className?: string
}

export function CharacterCard({ name, imageUrl, rateChange, className }: CharacterCardProps) {
  const isUp = rateChange >= 0

  return (
    <div
      className={cn(
        "flex items-center gap-3 rounded-lg bg-[var(--color-surface-2)] px-3 py-2.5 hover:bg-[var(--color-border)] transition-colors",
        className
      )}
    >
      <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-md bg-[var(--color-border)]">
        <Image
          src={imageUrl}
          alt={name}
          fill
          className="object-cover"
          sizes="48px"
        />
      </div>
      <div className="flex flex-col min-w-0">
        <span className="text-sm font-medium text-[var(--color-foreground)] truncate">{name}</span>
        <span
          className={cn(
            "text-xs font-semibold",
            isUp ? "text-[var(--color-accent-gold)]" : "text-[var(--color-danger)]"
          )}
        >
          {isUp ? "+" : ""}
          {rateChange.toFixed(1)} RP
        </span>
      </div>
    </div>
  )
}
