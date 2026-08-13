"use client";

import { Copy, ExternalLink, Loader2, SlidersHorizontal } from "lucide-react";
import Image from "next/image";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import * as React from "react";
import { getCharacterMiniWebpUrl } from "@/lib/characterMap";
import { withCurrentRouteLocale } from "@/lib/localizedPath";
import { cn } from "@/lib/utils";
import { SynergyMatrixCanvas, type CanvasHoverState } from "./SynergyMatrixCanvas";
import type {
  CharacterMatrixModel,
  MatrixCell,
  MatrixCharacter,
  MatrixCopy,
  MatrixGrid,
  MatrixSelection,
  MatrixViewSettings,
  MatrixViewSummary,
  MatrixWorkerTiming,
  SynergyMatrixMetric,
  SynergyMatrixSort,
} from "./types";
import {
  buildCharacterIndex,
  findCharacter,
  formatMetricValue,
  formatSigned,
  getGridCell,
  parseMetricSearchParam,
  parseSelectionSearchParams,
} from "./utils";

const DATA_URL = "/data/synergy-matrix/_character_matrix.json";
const DEFAULT_SETTINGS: MatrixViewSettings = {
  metric: "rpLift",
  minGames: 200,
  sort: "code",
};
const EMPTY_CHARACTERS: MatrixCharacter[] = [];

type WorkerMessage =
  | {
      type: "ready";
      model: CharacterMatrixModel;
      grid: MatrixGrid;
      summary: MatrixViewSummary;
      timing: MatrixWorkerTiming;
    }
  | { type: "view"; summary: MatrixViewSummary }
  | { type: "error"; message: string };

const METRIC_OPTIONS: SynergyMatrixMetric[] = [
  "rpLift",
  "winRateLift",
  "avgRP",
  "winRate",
  "games",
];

const SORT_OPTIONS: SynergyMatrixSort[] = [
  "code",
  "name",
  "outgoingRpLift",
  "incomingRpLift",
  "games",
];

function parseMinGames(raw: string | null): number {
  const value = Number.parseInt(raw ?? "", 10);
  if (!Number.isFinite(value)) return DEFAULT_SETTINGS.minGames;
  return Math.max(40, Math.min(2000, value));
}

function parseSort(raw: string | null): SynergyMatrixSort {
  return SORT_OPTIONS.includes(raw as SynergyMatrixSort)
    ? (raw as SynergyMatrixSort)
    : DEFAULT_SETTINGS.sort;
}

function buildSettingsFromParams(searchParams: URLSearchParams): MatrixViewSettings {
  return {
    metric: parseMetricSearchParam(searchParams.get("metric")) ?? DEFAULT_SETTINGS.metric,
    minGames: parseMinGames(searchParams.get("minGames")),
    sort: parseSort(searchParams.get("sort")),
  };
}

function MiniPortrait({ code, name }: { code: number; name: string }) {
  return (
    <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-md border border-[var(--color-border)] bg-[var(--color-surface-2)]">
      <Image
        src={getCharacterMiniWebpUrl(code)}
        alt={name}
        fill
        sizes="40px"
        className="object-cover"
        unoptimized
      />
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: "up" | "down" }) {
  return (
    <div className="min-w-0 rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-2 py-1.5">
      <p className="text-[10px] font-semibold text-[var(--color-muted-foreground)]">{label}</p>
      <p
        className={cn(
          "mt-1 truncate font-mono text-sm font-bold text-[var(--color-foreground)]",
          tone === "up" && "text-[var(--color-stat-up)]",
          tone === "down" && "text-[var(--color-stat-down)]"
        )}
      >
        {value}
      </p>
    </div>
  );
}

function PairList({
  title,
  cells,
  onSelect,
}: {
  title: string;
  cells: MatrixCell[];
  onSelect: (selection: MatrixSelection) => void;
}) {
  return (
    <div className="rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] p-3">
      <h3 className="text-xs font-bold text-[var(--color-foreground)]">{title}</h3>
      <div className="mt-2 flex flex-col gap-1.5">
        {cells.slice(0, 5).map((cell) => (
          <button
            key={`${cell.rowCode}-${cell.colCode}`}
            type="button"
            data-matrix-pair={`${cell.rowCode}:${cell.colCode}`}
            onClick={() => onSelect({ rowCode: cell.rowCode, colCode: cell.colCode })}
            className="grid grid-cols-[1fr_auto] items-center gap-2 rounded-md border border-[var(--color-border)] bg-[var(--color-surface-2)] px-2 py-1.5 text-left hover:border-[var(--color-border-light)]"
          >
            <span className="min-w-0 truncate text-[11px] font-semibold text-[var(--color-foreground)]">
              {cell.rowName} → {cell.colName}
            </span>
            <span
              className={cn(
                "font-mono text-[11px] font-bold",
                cell.rpLift >= 0 ? "text-[var(--color-stat-up)]" : "text-[var(--color-stat-down)]"
              )}
            >
              {formatSigned(cell.rpLift, 1)}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

export function SynergyMatrixClient({ copy }: { copy: MatrixCopy }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const workerRef = React.useRef<Worker | null>(null);
  const settingsRef = React.useRef<MatrixViewSettings>(DEFAULT_SETTINGS);
  const lastWorkerSettingsRef = React.useRef<string | null>(null);
  const [model, setModel] = React.useState<CharacterMatrixModel | null>(null);
  const [grid, setGrid] = React.useState<MatrixGrid | null>(null);
  const [summary, setSummary] = React.useState<MatrixViewSummary | null>(null);
  const [settings, setSettings] = React.useState<MatrixViewSettings>(() => {
    return buildSettingsFromParams(new URLSearchParams(searchParams.toString()));
  });
  const [selected, setSelected] = React.useState<MatrixSelection | null>(() => {
    return parseSelectionSearchParams(new URLSearchParams(searchParams.toString()));
  });
  const [hover, setHover] = React.useState<CanvasHoverState | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [copied, setCopied] = React.useState(false);
  const [isWorkerReady, setIsWorkerReady] = React.useState(false);

  React.useEffect(() => {
    settingsRef.current = settings;
  }, [settings]);

  React.useEffect(() => {
    const worker = new Worker(new URL("./synergyMatrix.worker.ts", import.meta.url), {
      type: "module",
    });
    workerRef.current = worker;
    let cancelled = false;

    worker.onmessage = (event: MessageEvent<WorkerMessage>) => {
      if (cancelled) return;
      const message = event.data;
      if (message.type === "error") {
        setError(message.message);
        return;
      }
      setSummary(message.summary);
      if (message.type === "ready") {
        setModel(message.model);
        setGrid(message.grid);
        setIsWorkerReady(true);
        performance.measure("synergy-matrix-worker-fetch", {
          start: 0,
          duration: message.timing.fetchMs,
        });
        performance.measure("synergy-matrix-worker-parse", {
          start: 0,
          duration: message.timing.parseMs,
        });
        performance.measure("synergy-matrix-worker-grid", {
          start: 0,
          duration: message.timing.gridBuildMs,
        });
      }
    };

    const initialSettings = settingsRef.current;
    lastWorkerSettingsRef.current = JSON.stringify(initialSettings);
    worker.postMessage({ type: "load", url: DATA_URL, settings: initialSettings });

    return () => {
      cancelled = true;
      worker.terminate();
      workerRef.current = null;
    };
  }, [copy.loadFailed]);

  React.useEffect(() => {
    if (!isWorkerReady) return;
    const key = JSON.stringify(settings);
    if (lastWorkerSettingsRef.current === key) return;
    lastWorkerSettingsRef.current = key;
    workerRef.current?.postMessage({ type: "view", settings });
  }, [isWorkerReady, settings]);

  React.useEffect(() => {
    if (selected || !summary?.topPositive.length) return;
    const first = summary.topPositive[0];
    setSelected({ rowCode: first.rowCode, colCode: first.colCode });
  }, [selected, summary]);

  const updateUrl = React.useCallback(
    (nextSelection: MatrixSelection | null, nextSettings: MatrixViewSettings) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set("metric", nextSettings.metric);
      params.set("minGames", String(nextSettings.minGames));
      params.set("sort", nextSettings.sort);
      if (nextSelection) {
        params.set("row", String(nextSelection.rowCode));
        params.set("col", String(nextSelection.colCode));
      }
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    },
    [pathname, router, searchParams]
  );

  const updateSettings = React.useCallback(
    (next: MatrixViewSettings) => {
      setSettings(next);
      updateUrl(selected, next);
    },
    [selected, updateUrl]
  );

  const handleSelect = React.useCallback(
    (selection: MatrixSelection) => {
      setSelected(selection);
      updateUrl(selection, settingsRef.current);
    },
    [updateUrl]
  );

  const characters = model?.characters ?? EMPTY_CHARACTERS;
  const characterIndex = React.useMemo(() => buildCharacterIndex(characters), [characters]);
  const order = summary?.order ?? characters.map((character) => character.code);
  const activeCell =
    hover?.cell ??
    (selected && grid
      ? getGridCell(grid, characters, characterIndex, selected.rowCode, selected.colCode)
      : null) ??
    null;
  const activeRow = findCharacter(characters, activeCell?.rowCode ?? null);
  const activeCol = findCharacter(characters, activeCell?.colCode ?? null);
  const teamDataHref =
    activeCell != null
      ? withCurrentRouteLocale(
          pathname,
          `/synergy-detail?ally1=${activeCell.rowCode}&ally2=${activeCell.colCode}`
        )
      : withCurrentRouteLocale(pathname, "/synergy-detail");

  async function copyCurrentLink() {
    if (typeof window === "undefined") return;
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1400);
    } catch {
      setCopied(false);
    }
  }

  if (error) {
    return (
      <section className="dashboard-panel p-5 text-sm text-[var(--color-danger)]">
        {copy.loadFailed}: {error}
      </section>
    );
  }

  if (!model || !grid || !summary) {
    return (
      <section className="dashboard-panel flex min-h-[360px] items-center justify-center gap-2 p-5 text-sm font-semibold text-[var(--color-muted-foreground)]">
        <Loader2 className="h-4 w-4 animate-spin" />
        {copy.loading}
      </section>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <section className="dashboard-panel p-3 sm:p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div className="flex min-w-0 items-center gap-2 text-xs font-semibold text-[var(--color-muted-foreground)]">
            <SlidersHorizontal className="h-4 w-4" />
            <span>
              {model.characterCount} characters · {summary.visibleCellCount.toLocaleString("ko-KR")}{" "}
              cells
            </span>
          </div>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-[auto_auto_auto_auto]">
            <label className="min-w-0">
              <span className="mb-1 block text-[11px] font-semibold text-[var(--color-muted-foreground)]">
                {copy.controls.metric}
              </span>
              <select
                value={settings.metric}
                onChange={(event) =>
                  updateSettings({
                    ...settings,
                    metric: event.target.value as SynergyMatrixMetric,
                  })
                }
                className="h-9 w-full rounded-md border border-[var(--color-border)] bg-[var(--color-surface-2)] px-2 text-xs font-semibold text-[var(--color-foreground)] outline-none focus:border-[var(--color-accent)]"
              >
                {METRIC_OPTIONS.map((metric) => (
                  <option key={metric} value={metric}>
                    {copy.metrics[metric]}
                  </option>
                ))}
              </select>
            </label>

            <label className="min-w-0">
              <span className="mb-1 block text-[11px] font-semibold text-[var(--color-muted-foreground)]">
                {copy.controls.sort}
              </span>
              <select
                value={settings.sort}
                onChange={(event) =>
                  updateSettings({
                    ...settings,
                    sort: event.target.value as SynergyMatrixSort,
                  })
                }
                className="h-9 w-full rounded-md border border-[var(--color-border)] bg-[var(--color-surface-2)] px-2 text-xs font-semibold text-[var(--color-foreground)] outline-none focus:border-[var(--color-accent)]"
              >
                {SORT_OPTIONS.map((sort) => (
                  <option key={sort} value={sort}>
                    {copy.sortOptions[sort]}
                  </option>
                ))}
              </select>
            </label>

            <label className="min-w-0">
              <span className="mb-1 block text-[11px] font-semibold text-[var(--color-muted-foreground)]">
                {copy.controls.minGames}: {settings.minGames.toLocaleString("ko-KR")}
              </span>
              <input
                type="range"
                min={40}
                max={1200}
                step={40}
                value={settings.minGames}
                onChange={(event) =>
                  updateSettings({ ...settings, minGames: Number(event.target.value) })
                }
                className="h-9 w-full accent-[var(--color-accent)]"
              />
            </label>

            <label className="min-w-0">
              <span className="mb-1 block text-[11px] font-semibold text-[var(--color-muted-foreground)]">
                {copy.controls.focus}
              </span>
              <select
                value={selected?.rowCode ?? ""}
                onChange={(event) => {
                  const rowCode = Number(event.target.value);
                  const colCode =
                    selected?.colCode && selected.colCode !== rowCode
                      ? selected.colCode
                      : order.find((code) => code !== rowCode);
                  if (rowCode && colCode) handleSelect({ rowCode, colCode });
                }}
                className="h-9 w-full rounded-md border border-[var(--color-border)] bg-[var(--color-surface-2)] px-2 text-xs font-semibold text-[var(--color-foreground)] outline-none focus:border-[var(--color-accent)]"
              >
                {order.map((code) => {
                  const character = findCharacter(characters, code);
                  return (
                    <option key={code} value={code}>
                      {character?.name ?? code}
                    </option>
                  );
                })}
              </select>
            </label>
          </div>
        </div>
      </section>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
        <section className="dashboard-panel min-w-0 p-3 sm:p-4">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs font-semibold text-[var(--color-muted-foreground)]">
              {copy.hoverHelp}
            </p>
            <div className="flex items-center gap-2 text-[10px] font-semibold text-[var(--color-muted-foreground)]">
              <span className="inline-flex items-center gap-1">
                <span className="h-2.5 w-2.5 rounded-sm bg-[rgba(50,171,118,0.8)]" />
                Positive
              </span>
              <span className="inline-flex items-center gap-1">
                <span className="h-2.5 w-2.5 rounded-sm bg-[rgba(220,82,82,0.8)]" />
                Negative
              </span>
            </div>
          </div>
          <SynergyMatrixCanvas
            characters={characters}
            order={order}
            grid={grid}
            metric={settings.metric}
            minGames={settings.minGames}
            summary={summary}
            selected={selected}
            onSelect={handleSelect}
            onHoverChange={setHover}
            ariaLabel={copy.accessibilityTitle}
          />
        </section>

        <aside className="flex min-w-0 flex-col gap-3">
          <section className="dashboard-panel p-3 sm:p-4" data-accent="true">
            {activeCell && activeRow && activeCol ? (
              <div className="flex flex-col gap-3">
                <div className="flex items-center gap-2 text-[11px] font-semibold text-[var(--color-muted-foreground)]">
                  <span>{copy.selectedPair}</span>
                </div>
                <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
                  <div className="min-w-0">
                    <MiniPortrait code={activeRow.code} name={activeRow.name} />
                    <p className="mt-1 truncate text-sm font-bold text-[var(--color-foreground)]">
                      {activeRow.name}
                    </p>
                  </div>
                  <span className="text-[var(--color-muted-foreground)]">→</span>
                  <div className="min-w-0">
                    <MiniPortrait code={activeCol.code} name={activeCol.name} />
                    <p className="mt-1 truncate text-sm font-bold text-[var(--color-foreground)]">
                      {activeCol.name}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <Stat
                    label={copy.rpLift}
                    value={formatSigned(activeCell.rpLift, 1)}
                    tone={activeCell.rpLift >= 0 ? "up" : "down"}
                  />
                  <Stat
                    label={copy.winRateLift}
                    value={`${formatSigned(activeCell.winRateLift, 1)}pp`}
                    tone={activeCell.winRateLift >= 0 ? "up" : "down"}
                  />
                  <Stat label={copy.winRate} value={`${activeCell.winRate.toFixed(1)}%`} />
                  <Stat label={copy.averageRp} value={formatSigned(activeCell.avgRP, 1)} />
                  <Stat label={copy.averageRank} value={`#${activeCell.avgRank.toFixed(1)}`} />
                  <Stat label={copy.sample} value={activeCell.games.toLocaleString("ko-KR")} />
                </div>

                <div className="flex flex-wrap gap-2">
                  <a
                    href={teamDataHref}
                    className="inline-flex h-9 items-center gap-1.5 rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-3 text-xs font-semibold text-[var(--color-foreground)] hover:border-[var(--color-border-light)]"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                    {copy.openTeamData}
                  </a>
                  <button
                    type="button"
                    onClick={copyCurrentLink}
                    className="inline-flex h-9 items-center gap-1.5 rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-3 text-xs font-semibold text-[var(--color-foreground)] hover:border-[var(--color-border-light)]"
                  >
                    <Copy className="h-3.5 w-3.5" />
                    {copied ? copy.copied : copy.copyLink}
                  </button>
                </div>
              </div>
            ) : (
              <p className="text-sm text-[var(--color-muted-foreground)]">{copy.noCell}</p>
            )}
          </section>

          <PairList title={copy.topPositive} cells={summary.topPositive} onSelect={handleSelect} />
          <PairList title={copy.topNegative} cells={summary.topNegative} onSelect={handleSelect} />
        </aside>
      </div>

      {hover && (
        <div
          className="pointer-events-none fixed z-50 max-w-[260px] rounded-md border border-[var(--color-border-light)] bg-[var(--color-surface)] px-3 py-2 text-xs shadow-lg"
          style={{ left: hover.x + 14, top: hover.y + 14 }}
        >
          <p className="font-bold text-[var(--color-foreground)]">
            {hover.cell.rowName} → {hover.cell.colName}
          </p>
          <p className="mt-1 font-mono text-[var(--color-muted-foreground)]">
            {copy.metrics[settings.metric]} {formatMetricValue(settings.metric, hover.cell)}
          </p>
          <p className="mt-1 text-[var(--color-muted-foreground)]">
            {copy.sample} {hover.cell.games.toLocaleString("ko-KR")}
          </p>
        </div>
      )}
    </div>
  );
}
