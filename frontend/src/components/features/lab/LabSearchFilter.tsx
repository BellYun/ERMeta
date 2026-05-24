"use client";

import * as React from "react";

interface Props {
  value: string;
  onChange: (v: string) => void;
}

export function LabSearchFilter({ value, onChange }: Props) {
  return (
    <input
      type="search"
      placeholder="캐릭터 이름 검색..."
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-2)] px-3 py-2 text-sm text-[var(--color-foreground)] placeholder:text-[var(--color-muted-foreground)] outline-none focus:border-[var(--color-primary)] transition-colors"
    />
  );
}
