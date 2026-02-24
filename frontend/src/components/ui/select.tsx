"use client"

import * as React from "react"
import { ChevronDown } from "lucide-react"
import { cn } from "@/lib/utils"

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  placeholder?: string
}

const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, children, placeholder, ...props }, ref) => (
    <div className="relative inline-flex items-center">
      <select
        ref={ref}
        className={cn(
          "h-9 appearance-none rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-3 pr-8 text-sm text-[var(--color-foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] cursor-pointer",
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
