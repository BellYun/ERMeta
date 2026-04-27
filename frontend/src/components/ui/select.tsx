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
          "h-10 sm:h-10 w-full appearance-none rounded-xl border border-[var(--color-border)] bg-[rgba(255,255,255,0.04)] px-3 pr-9 text-sm font-medium text-[var(--color-foreground)] shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] focus:outline-none focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/12 cursor-pointer transition-colors touch-manipulation backdrop-blur-xl",
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
  <option ref={ref} className={cn("bg-[#0f172a]", className)} {...props} />
));
SelectItem.displayName = "SelectItem";

export { Select, SelectItem };
