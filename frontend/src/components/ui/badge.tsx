import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors",
  {
    variants: {
      variant: {
        default: "bg-[var(--color-primary)]/15 text-[var(--color-primary)] border border-[var(--color-primary)]/30",
        secondary: "bg-[var(--color-surface-2)] text-[var(--color-muted-foreground)] border border-[var(--color-border)]",
        outline: "border border-[var(--color-border)] text-[var(--color-foreground)]",
        gold: "bg-[var(--color-accent-gold)]/15 text-[var(--color-accent-gold)] border border-[var(--color-accent-gold)]/30",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />
}

export { Badge, badgeVariants }
