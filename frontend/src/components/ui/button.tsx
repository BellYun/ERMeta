import { cva, type VariantProps } from "class-variance-authority";
import * as React from "react";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 rounded-xl border text-sm font-semibold tracking-[-0.03em] transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]/24 focus-visible:ring-offset-0 disabled:pointer-events-none disabled:opacity-40",
  {
    variants: {
      variant: {
        default:
          "border-[rgba(96,165,250,0.22)] bg-[rgba(96,165,250,0.14)] text-[var(--color-primary-hover)] shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] hover:border-[rgba(147,197,253,0.32)] hover:bg-[rgba(96,165,250,0.2)]",
        outline:
          "border-[var(--color-border)] bg-[rgba(255,255,255,0.03)] text-[var(--color-foreground)] hover:border-[var(--color-border-light)] hover:bg-[rgba(255,255,255,0.06)]",
        ghost:
          "border-transparent bg-transparent text-[var(--color-muted-foreground)] hover:border-[var(--color-border)] hover:bg-[rgba(255,255,255,0.05)] hover:text-[var(--color-foreground)]",
        secondary:
          "border-[var(--color-border)] bg-[rgba(255,255,255,0.04)] text-[var(--color-foreground)] hover:border-[var(--color-border-light)] hover:bg-[rgba(255,255,255,0.07)]",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-8 px-3 text-xs",
        lg: "h-11 px-6 text-base",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => {
    return (
      <button className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
