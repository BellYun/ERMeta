import { cva, type VariantProps } from "class-variance-authority";
import * as React from "react";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex min-h-11 items-center justify-center gap-2 whitespace-nowrap rounded-[var(--radius-button)] border text-sm font-semibold leading-none transition-[background-color,border-color,color,transform] duration-[var(--dur-micro)] ease-[var(--ease-out)] active:translate-y-px focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus)] disabled:cursor-not-allowed disabled:bg-[var(--color-paper-2)] disabled:text-[var(--color-muted)] disabled:opacity-55 data-[state=loading]:cursor-wait data-[state=error]:border-[var(--color-danger)] data-[state=success]:border-[var(--color-success)]",
  {
    variants: {
      variant: {
        default:
          "border-[var(--color-accent)] bg-[var(--color-accent)] text-[var(--color-accent-ink)] hover:border-[var(--color-accent-hover)] hover:bg-[var(--color-accent-hover)]",
        outline:
          "border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-foreground)] hover:border-[var(--color-border-light)] hover:bg-[var(--color-surface-2)]",
        ghost:
          "border-transparent bg-transparent text-[var(--color-muted-foreground)] hover:border-[var(--color-border)] hover:bg-[var(--color-surface-2)] hover:text-[var(--color-foreground)]",
        secondary:
          "border-[var(--color-border)] bg-[var(--color-surface-2)] text-[var(--color-foreground)] hover:border-[var(--color-border-light)] hover:bg-[var(--color-surface-2)]",
      },
      size: {
        default: "px-4 py-2",
        sm: "min-h-10 px-3 text-xs",
        lg: "min-h-12 px-5 text-sm",
        icon: "h-11 w-11 p-0",
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
