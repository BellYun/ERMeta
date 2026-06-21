import { cva, type VariantProps } from "class-variance-authority";
import * as React from "react";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-md border px-2 py-0.5 text-[10px] font-semibold",
  {
    variants: {
      variant: {
        default:
          "border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-foreground)]",
        secondary:
          "border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-muted-foreground)]",
        outline:
          "border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-muted-foreground)]",
        gold: "border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-foreground)]",
        success:
          "border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-success)]",
        danger: "border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-danger)]",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
