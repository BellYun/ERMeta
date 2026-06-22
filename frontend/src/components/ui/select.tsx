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
          "h-9 sm:h-9 w-full appearance-none rounded-[5px] border border-[var(--color-border)] bg-[var(--color-surface)] px-3 pr-9 text-sm font-bold text-[var(--color-foreground)] focus:outline-none focus:border-[var(--color-accent)] focus:ring-1 focus:ring-[var(--color-accent)] cursor-pointer touch-manipulation",
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
