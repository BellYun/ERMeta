"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

interface TabsContextValue {
  value: string;
  onValueChange: (value: string) => void;
}

const TabsContext = React.createContext<TabsContextValue>({
  value: "",
  onValueChange: () => {},
});

interface TabsProps {
  defaultValue?: string;
  value?: string;
  onValueChange?: (value: string) => void;
  className?: string;
  children: React.ReactNode;
}

function Tabs({ defaultValue, value, onValueChange, className, children }: TabsProps) {
  const [internalValue, setInternalValue] = React.useState(defaultValue ?? "");
  const controlled = value !== undefined;
  const activeValue = value ?? internalValue;
  const handleValueChange = React.useCallback(
    (nextValue: string) => {
      if (!controlled) setInternalValue(nextValue);
      onValueChange?.(nextValue);
    },
    [controlled, onValueChange]
  );
  const contextValue = React.useMemo(
    () => ({ value: activeValue, onValueChange: handleValueChange }),
    [activeValue, handleValueChange]
  );

  return (
    <TabsContext.Provider value={contextValue}>
      <div className={cn("w-full", className)}>{children}</div>
    </TabsContext.Provider>
  );
}

const TabsList = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, children, onKeyDown, ...props }, ref) => {
    const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
      onKeyDown?.(event);
      if (event.defaultPrevented) return;

      const tabs = Array.from(
        event.currentTarget.querySelectorAll<HTMLButtonElement>('[role="tab"]:not(:disabled)')
      );
      const currentIndex = tabs.indexOf(document.activeElement as HTMLButtonElement);
      if (currentIndex < 0) return;

      let nextIndex: number | null = null;
      if (event.key === "ArrowRight") nextIndex = (currentIndex + 1) % tabs.length;
      if (event.key === "ArrowLeft") nextIndex = (currentIndex - 1 + tabs.length) % tabs.length;
      if (event.key === "Home") nextIndex = 0;
      if (event.key === "End") nextIndex = tabs.length - 1;
      if (nextIndex === null) return;

      event.preventDefault();
      tabs[nextIndex]?.focus({ preventScroll: true });
      tabs[nextIndex]?.click();
    };

    return (
      <div
        ref={ref}
        role="tablist"
        className={cn(
          "flex items-center gap-0.5 rounded-[5px] border border-[var(--color-border)] bg-[var(--color-surface-2)] p-0.5",
          "scrollbar-hide flex-nowrap overflow-x-auto",
          "sm:inline-flex",
          "[scroll-snap-type:x_mandatory]",
          className
        )}
        onKeyDown={handleKeyDown}
        {...props}
      >
        {children}
      </div>
    );
  }
);
TabsList.displayName = "TabsList";

interface TabsTriggerProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  value: string;
}

const TabsTrigger = React.forwardRef<HTMLButtonElement, TabsTriggerProps>(
  ({ value, className, children, onClick, ...props }, ref) => {
    const { value: activeValue, onValueChange } = React.useContext(TabsContext);
    const isActive = activeValue === value;

    return (
      <button
        ref={ref}
        type="button"
        role="tab"
        aria-selected={isActive}
        tabIndex={isActive ? 0 : -1}
        onClick={(event) => {
          onValueChange(value);
          onClick?.(event);
        }}
        className={cn(
          "inline-flex min-h-[30px] shrink-0 touch-manipulation items-center justify-center rounded px-3 py-1 text-xs font-bold transition-colors [scroll-snap-align:start] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus)] disabled:cursor-not-allowed disabled:opacity-55",
          isActive
            ? "bg-[var(--color-accent-muted)] text-[var(--color-accent-foreground)] shadow-[inset_0_-2px_0_color-mix(in_srgb,var(--color-accent)_76%,transparent)]"
            : "text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)] hover:bg-[var(--color-surface-2)]",
          className
        )}
        {...props}
      >
        {children}
      </button>
    );
  }
);
TabsTrigger.displayName = "TabsTrigger";

interface TabsContentProps {
  value: string;
  className?: string;
  children: React.ReactNode;
}

function TabsContent({ value, className, children }: TabsContentProps) {
  const { value: activeValue } = React.useContext(TabsContext);
  if (activeValue !== value) return null;
  return <div className={cn("mt-5", className)}>{children}</div>;
}

export { Tabs, TabsList, TabsTrigger, TabsContent };
