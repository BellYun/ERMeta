"use client"

import * as React from "react"
import { ChevronDown } from "lucide-react"
import { cn } from "@/lib/utils"

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  placeholder?: string
  wrapperClassName?: string
}

const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, wrapperClassName, children, placeholder, ...props }, ref) => (
    <div className={cn("relative inline-flex items-center", wrapperClassName)}>
      <select
        ref={ref}
        className={cn(
          "h-11 sm:h-9 w-full appearance-none rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-2)] px-3 pr-8 text-sm text-[var(--color-foreground)] focus:outline-none focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary-glow)] cursor-pointer transition-colors touch-manipulation",
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
      <ChevronDown className="pointer-events-none absolute right-2 h-4 w-4 text-[var(--color-muted-foreground)]" />
    </div>
  )
)
Select.displayName = "Select"

const SelectItem = React.forwardRef<
  HTMLOptionElement,
  React.OptionHTMLAttributes<HTMLOptionElement>
>(({ className, ...props }, ref) => (
  <option ref={ref} className={cn("bg-[var(--color-surface)]", className)} {...props} />
))
SelectItem.displayName = "SelectItem"

export { Select, SelectItem }
