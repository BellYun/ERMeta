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

  return (
    <TabsContext.Provider
      value={{
        value: controlled ? value! : internalValue,
        onValueChange: (v) => {
          if (!controlled) setInternalValue(v);
          onValueChange?.(v);
        },
      }}
    >
      <div className={cn("w-full", className)}>{children}</div>
    </TabsContext.Provider>
  );
}

function TabsList({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <div
      className={cn(
        "flex items-center gap-0.5 rounded-[5px] border border-[var(--color-border)] bg-[var(--color-surface-2)] p-0.5",
        "scrollbar-hide flex-nowrap overflow-x-auto",
        "sm:inline-flex",
        "[scroll-snap-type:x_mandatory]",
        className
      )}
    >
      {children}
    </div>
  );
}

interface TabsTriggerProps {
  value: string;
  className?: string;
  children: React.ReactNode;
}

function TabsTrigger({ value, className, children }: TabsTriggerProps) {
  const { value: activeValue, onValueChange } = React.useContext(TabsContext);
  const isActive = activeValue === value;

  return (
    <button
      onClick={() => onValueChange(value)}
      className={cn(
        "inline-flex min-h-[30px] shrink-0 touch-manipulation items-center justify-center rounded px-3 py-1 text-xs font-bold transition-colors [scroll-snap-align:start]",
        isActive
          ? "bg-[var(--color-accent-muted)] text-[var(--color-accent-foreground)] shadow-[inset_0_-2px_0_color-mix(in_srgb,var(--color-accent)_76%,transparent)]"
          : "text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)] hover:bg-[var(--color-surface-2)]",
        className
      )}
    >
      {children}
    </button>
  );
}

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
