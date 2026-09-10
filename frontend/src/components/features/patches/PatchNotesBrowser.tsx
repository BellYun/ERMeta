"use client";

import { useState, type ReactNode } from "react";
import { useRouter } from "@/i18n/navigation";

export function PatchVersionSelect({
  versions,
  current,
  label,
}: {
  versions: string[];
  current: string;
  label: string;
}) {
  const router = useRouter();
  return (
    <label className="flex min-w-0 items-center gap-3 text-sm text-[var(--color-muted-foreground)]">
      <span className="shrink-0">{label}</span>
      <select
        value={current}
        onChange={(event) => router.push(`/patches/${event.target.value}`)}
        className="min-h-11 min-w-0 flex-1 rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-3 text-sm text-[var(--color-foreground)] focus-visible:outline-2 focus-visible:outline-[var(--color-accent)] sm:max-w-60"
      >
        {versions.map((version) => (
          <option key={version} value={version}>
            {version}
          </option>
        ))}
      </select>
    </label>
  );
}

type Filter = "all" | "buff" | "nerf" | "rework";

export function PatchNotesBrowser({
  entries,
  labels,
  midContent,
}: {
  entries: { code: number; name: string; types: string[]; content: ReactNode }[];
  labels: Record<Filter | "search" | "empty" | "reset", string>;
  midContent?: ReactNode;
}) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const normalized = query.trim().toLocaleLowerCase();
  const visible = entries.filter(
    (entry) =>
      entry.name.toLocaleLowerCase().includes(normalized) &&
      (filter === "all" || entry.types.includes(filter))
  );
  const renderedEntries = visible.map((entry) => <div key={entry.code}>{entry.content}</div>);
  if (midContent && renderedEntries.length > 0) {
    renderedEntries.splice(
      Math.min(3, renderedEntries.length),
      0,
      <div key="patch-mid-content-ad">{midContent}</div>
    );
  }

  return (
    <section className="min-w-0">
      <div className="mb-4 flex flex-col gap-3">
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          aria-label={labels.search}
          placeholder={labels.search}
          className="min-h-11 w-full rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-3 text-sm text-[var(--color-foreground)] focus-visible:outline-2 focus-visible:outline-[var(--color-accent)]"
        />
        <div role="group" aria-label={labels.all} className="flex flex-wrap gap-2">
          {(["all", "buff", "nerf", "rework"] as const).map((type) => (
            <button
              key={type}
              type="button"
              aria-pressed={filter === type}
              onClick={() => setFilter(type)}
              className={`inline-flex min-h-11 items-center gap-2 whitespace-nowrap rounded-md border px-3 text-sm focus-visible:outline-2 focus-visible:outline-[var(--color-accent)] active:bg-[var(--color-surface-2)] ${filter === type ? "border-[var(--color-accent)] bg-[var(--color-surface-2)] font-semibold text-[var(--color-foreground)]" : "border-[var(--color-border)] text-[var(--color-muted-foreground)] hover:bg-[var(--color-surface-2)]"}`}
            >
              {labels[type]}
              <span className="text-xs tabular-nums text-[var(--color-muted-foreground)]">
                {entries.filter((entry) => type === "all" || entry.types.includes(type)).length}
              </span>
            </button>
          ))}
        </div>
      </div>
      <div className="grid min-w-0 gap-4">{renderedEntries}</div>
      {visible.length === 0 && (
        <div
          role="status"
          className="rounded-md border border-[var(--color-border)] p-6 text-sm text-[var(--color-muted-foreground)]"
        >
          <p>{labels.empty}</p>
          <button
            type="button"
            onClick={() => {
              setQuery("");
              setFilter("all");
            }}
            className="mt-2 min-h-11 underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-[var(--color-accent)]"
          >
            {labels.reset}
          </button>
        </div>
      )}
    </section>
  );
}
