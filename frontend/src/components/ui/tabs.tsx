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
        "flex items-center rounded-2xl border border-[var(--color-border)] bg-[rgba(255,255,255,0.03)] p-1 gap-1 backdrop-blur-xl",
        "overflow-x-auto scrollbar-hide flex-nowrap",
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
        "inline-flex items-center justify-center rounded-xl px-3.5 py-2 text-xs font-semibold transition-all min-h-[38px] sm:min-h-0 touch-manipulation shrink-0 [scroll-snap-align:start]",
        isActive
          ? "bg-[rgba(96,165,250,0.14)] text-[var(--color-primary-hover)] shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]"
          : "text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)] hover:bg-[rgba(255,255,255,0.05)]",
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
