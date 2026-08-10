"use client";

import { ChevronDown } from "lucide-react";
import * as React from "react";
import { cn } from "@/lib/utils";

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  placeholder?: string;
  wrapperClassName?: string;
}

const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, wrapperClassName, children, placeholder, ...props }, ref) => (
    <div className={cn("relative inline-flex items-center", wrapperClassName)}>
      <select
        ref={ref}
        className={cn(
          "min-h-11 w-full cursor-pointer touch-manipulation appearance-none rounded-[var(--radius-input)] border border-[var(--color-rule)] bg-[var(--color-paper)] px-3 pr-9 text-sm font-semibold text-[var(--color-ink)] transition-[background-color,border-color,color] duration-[var(--dur-micro)] ease-[var(--ease-out)] hover:border-[var(--color-rule-2)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus)] disabled:cursor-not-allowed disabled:opacity-40 aria-invalid:border-[var(--color-danger)]",
          className
        )}
        {...props}
      >
        {placeholder && (
          <option value="" disabled>
            {placeholder}
          </option>
        )}
        {children}
      </select>
      <ChevronDown className="pointer-events-none absolute right-3 h-3.5 w-3.5 text-[var(--color-muted-foreground)]" />
    </div>
  )
);
Select.displayName = "Select";

const SelectItem = React.forwardRef<
  HTMLOptionElement,
  React.OptionHTMLAttributes<HTMLOptionElement>
>(({ className, ...props }, ref) => (
  <option
    ref={ref}
    className={cn("bg-[var(--color-surface)] text-[var(--color-foreground)]", className)}
    {...props}
  />
));
SelectItem.displayName = "SelectItem";

export { Select, SelectItem };
