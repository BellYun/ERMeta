import { cva, type VariantProps } from "class-variance-authority";
import * as React from "react";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-1 font-[var(--font-plex-mono)] text-[10px] font-semibold uppercase tracking-[0.12em] transition-colors",
  {
    variants: {
      variant: {
        default:
          "border-[rgba(96,165,250,0.18)] bg-[rgba(96,165,250,0.1)] text-[var(--color-primary-hover)]",
        secondary:
          "border-[var(--color-border)] bg-[rgba(255,255,255,0.04)] text-[var(--color-muted-foreground)]",
        outline:
          "border-[var(--color-border)] bg-[rgba(255,255,255,0.02)] text-[var(--color-muted-foreground)]",
        gold: "border-[rgba(251,191,36,0.18)] bg-[rgba(251,191,36,0.09)] text-[var(--color-accent-gold)]",
        success:
          "border-[rgba(74,222,128,0.16)] bg-[rgba(74,222,128,0.08)] text-[var(--color-success)]",
        danger:
          "border-[rgba(248,113,113,0.16)] bg-[rgba(248,113,113,0.08)] text-[var(--color-danger)]",
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
