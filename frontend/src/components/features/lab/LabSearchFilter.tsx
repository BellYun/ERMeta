"use client";

import * as React from "react";

interface Props {
  value: string;
  onChange: (v: string) => void;
}

export function LabSearchFilter({ value, onChange }: Props) {
  return (
    <div className="dashboard-panel p-3">
      <input
        type="search"
        placeholder="실험체 이름 검색..."
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-9 w-full rounded-md border border-[var(--color-border)] bg-[var(--color-surface-2)] px-3 text-sm font-medium text-[var(--color-foreground)] outline-none transition-colors placeholder:text-[var(--color-muted-foreground)] focus:border-[var(--color-accent)] focus:ring-2 focus:ring-[var(--color-accent-muted)]"
      />
    </div>
  );
}
