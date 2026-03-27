import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-semibold tracking-wide transition-colors",
  {
    variants: {
      variant: {
        default: "bg-[var(--color-primary)]/10 text-[var(--color-primary)]",
        secondary: "bg-[var(--color-surface-2)] text-[var(--color-muted-foreground)]",
        outline: "border border-[var(--color-border)] text-[var(--color-muted-foreground)]",
        gold: "bg-[var(--color-accent-gold)]/10 text-[var(--color-accent-gold)]",
        success: "bg-[var(--color-success)]/10 text-[var(--color-success)]",
        danger: "bg-[var(--color-danger)]/10 text-[var(--color-danger)]",
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
