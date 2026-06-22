import { cva, type VariantProps } from "class-variance-authority";
import * as React from "react";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 rounded-[5px] border text-sm font-bold transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--color-border-light)] focus-visible:ring-offset-0 disabled:pointer-events-none disabled:opacity-40",
  {
    variants: {
      variant: {
        default:
          "border-[var(--color-accent)] bg-[var(--color-accent-muted)] text-[var(--color-accent-foreground)] shadow-[inset_0_-2px_0_color-mix(in_srgb,var(--color-accent)_76%,transparent)] hover:bg-[color-mix(in_srgb,var(--color-accent-muted)_86%,var(--color-surface))]",
        outline:
          "border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-foreground)] hover:border-[var(--color-border-light)] hover:bg-[var(--color-surface-2)]",
        ghost:
          "border-transparent bg-transparent text-[var(--color-muted-foreground)] hover:border-[var(--color-border)] hover:bg-[var(--color-surface-2)] hover:text-[var(--color-foreground)]",
        secondary:
          "border-[var(--color-border)] bg-[var(--color-surface-2)] text-[var(--color-foreground)] hover:border-[var(--color-border-light)] hover:bg-[var(--color-surface-2)]",
      },
      size: {
        default: "h-[34px] px-3.5 py-2",
        sm: "h-[30px] px-3 text-xs",
        lg: "h-10 px-4 text-sm",
        icon: "h-[34px] w-[34px]",
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
