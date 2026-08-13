"use client";

import * as React from "react";
import type {
  MatrixCell,
  MatrixCharacter,
  MatrixGrid,
  MatrixSelection,
  MatrixViewSummary,
  SynergyMatrixMetric,
} from "./types";
import {
  buildCharacterIndex,
  getGridCell,
  getGridIndex,
  getGridMetricValue,
  getMetricBaseline,
  MATRIX_CELL_SIZE,
  MATRIX_HEADER_HEIGHT,
  MATRIX_LABEL_WIDTH,
} from "./utils";

interface CanvasHoverState {
  cell: MatrixCell;
  x: number;
  y: number;
}

interface SynergyMatrixCanvasProps {
  characters: MatrixCharacter[];
  order: number[];
  grid: MatrixGrid;
  metric: SynergyMatrixMetric;
  minGames: number;
  summary: MatrixViewSummary;
  selected: MatrixSelection | null;
  onSelect: (selection: MatrixSelection) => void;
  onHoverChange: (hover: CanvasHoverState | null) => void;
  ariaLabel: string;
}

function metricColor(
  metric: SynergyMatrixMetric,
  grid: MatrixGrid,
  index: number | null,
  minGames: number,
  maxAbs: number,
  maxGames: number
): string {
  if (index == null || grid.games[index] < minGames) return "rgba(95, 103, 118, 0.09)";
  if (metric === "games") {
    const intensity = Math.min(
      1,
      Math.log10(grid.games[index] + 1) / Math.log10(maxGames + 1 || 2)
    );
    return `rgba(72, 145, 192, ${0.16 + intensity * 0.72})`;
  }

  const value = getGridMetricValue(metric, grid, index);
  const baseline = getMetricBaseline(metric);
  const delta = value - baseline;
  const intensity = Math.min(1, Math.abs(delta) / Math.max(maxAbs, 1));
  const alpha = 0.18 + intensity * 0.74;
  return delta >= 0 ? `rgba(50, 171, 118, ${alpha})` : `rgba(220, 82, 82, ${alpha})`;
}

function drawMatrix(args: {
  canvas: HTMLCanvasElement;
  order: number[];
  grid: MatrixGrid;
  characterIndex: Map<number, number>;
  metric: SynergyMatrixMetric;
  minGames: number;
  summary: MatrixViewSummary;
  hover: MatrixSelection | null;
  selected: MatrixSelection | null;
}) {
  const { canvas, order, grid, characterIndex, metric, minGames, summary, hover, selected } = args;
  const context = canvas.getContext("2d");
  if (!context) return;

  const size = order.length * MATRIX_CELL_SIZE;
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const pixelSize = Math.max(1, Math.ceil(size * dpr));

  if (canvas.width !== pixelSize || canvas.height !== pixelSize) {
    canvas.width = pixelSize;
    canvas.height = pixelSize;
  }

  context.setTransform(dpr, 0, 0, dpr, 0, 0);
  context.clearRect(0, 0, size, size);
  const sourceIndexes = order.map((code) => characterIndex.get(code) ?? -1);

  for (let rowIndex = 0; rowIndex < order.length; rowIndex += 1) {
    const rowCode = order[rowIndex];
    for (let colIndex = 0; colIndex < order.length; colIndex += 1) {
      const colCode = order[colIndex];
      const x = colIndex * MATRIX_CELL_SIZE;
      const y = rowIndex * MATRIX_CELL_SIZE;

      if (rowCode === colCode) {
        context.fillStyle = "rgba(148, 163, 184, 0.18)";
      } else {
        const sourceRowIndex = sourceIndexes[rowIndex];
        const sourceColIndex = sourceIndexes[colIndex];
        const index =
          sourceRowIndex < 0 || sourceColIndex < 0
            ? null
            : sourceRowIndex * grid.size + sourceColIndex;
        context.fillStyle = metricColor(
          metric,
          grid,
          index,
          minGames,
          summary.maxAbs,
          summary.maxGames
        );
      }

      context.fillRect(x, y, MATRIX_CELL_SIZE, MATRIX_CELL_SIZE);
    }
  }

  context.strokeStyle = "rgba(148, 163, 184, 0.16)";
  context.lineWidth = 1;
  for (let index = 0; index <= order.length; index += 1) {
    const offset = index * MATRIX_CELL_SIZE + 0.5;
    context.beginPath();
    context.moveTo(offset, 0);
    context.lineTo(offset, size);
    context.stroke();
    context.beginPath();
    context.moveTo(0, offset);
    context.lineTo(size, offset);
    context.stroke();
  }

  const drawBand = (selection: MatrixSelection, fillStyle: string, strokeStyle: string) => {
    const rowIndex = order.indexOf(selection.rowCode);
    const colIndex = order.indexOf(selection.colCode);
    if (rowIndex < 0 || colIndex < 0) return;

    context.fillStyle = fillStyle;
    context.fillRect(0, rowIndex * MATRIX_CELL_SIZE, size, MATRIX_CELL_SIZE);
    context.fillRect(colIndex * MATRIX_CELL_SIZE, 0, MATRIX_CELL_SIZE, size);
    context.strokeStyle = strokeStyle;
    context.lineWidth = 2;
    context.strokeRect(
      colIndex * MATRIX_CELL_SIZE + 1,
      rowIndex * MATRIX_CELL_SIZE + 1,
      MATRIX_CELL_SIZE - 2,
      MATRIX_CELL_SIZE - 2
    );
  };

  if (hover) {
    drawBand(hover, "rgba(255, 255, 255, 0.08)", "rgba(255, 255, 255, 0.55)");
  }
  if (selected) {
    drawBand(selected, "rgba(245, 158, 11, 0.12)", "rgba(245, 158, 11, 0.95)");
  }
}

export function SynergyMatrixCanvas({
  characters,
  order,
  grid,
  metric,
  minGames,
  summary,
  selected,
  onSelect,
  onHoverChange,
  ariaLabel,
}: SynergyMatrixCanvasProps) {
  const scrollRef = React.useRef<HTMLDivElement>(null);
  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  const cornerRef = React.useRef<HTMLDivElement>(null);
  const columnHeaderRef = React.useRef<HTMLDivElement>(null);
  const rowHeaderRef = React.useRef<HTMLDivElement>(null);
  const characterMap = React.useMemo(
    () => new Map(characters.map((character) => [character.code, character])),
    [characters]
  );
  const characterIndex = React.useMemo(() => buildCharacterIndex(characters), [characters]);
  const [hoverSelection, setHoverSelection] = React.useState<MatrixSelection | null>(null);

  React.useEffect(() => {
    const scrollElement = scrollRef.current;
    if (!scrollElement) return;

    const syncHeaders = () => {
      const { scrollLeft, scrollTop } = scrollElement;
      if (cornerRef.current) {
        cornerRef.current.style.transform = `translate(${scrollLeft}px, ${scrollTop}px)`;
      }
      if (columnHeaderRef.current) {
        columnHeaderRef.current.style.transform = `translateY(${scrollTop}px)`;
      }
      if (rowHeaderRef.current) {
        rowHeaderRef.current.style.transform = `translateX(${scrollLeft}px)`;
      }
    };

    syncHeaders();
    scrollElement.addEventListener("scroll", syncHeaders, { passive: true });
    return () => scrollElement.removeEventListener("scroll", syncHeaders);
  }, []);

  React.useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    drawMatrix({
      canvas,
      order,
      grid,
      characterIndex,
      metric,
      minGames,
      summary,
      hover: hoverSelection,
      selected,
    });
  }, [characterIndex, grid, hoverSelection, metric, minGames, order, selected, summary]);

  const getSelectionFromPoint = React.useCallback(
    (clientX: number, clientY: number): { selection: MatrixSelection; cell: MatrixCell } | null => {
      const canvas = canvasRef.current;
      if (!canvas) return null;
      const rect = canvas.getBoundingClientRect();
      const x = clientX - rect.left;
      const y = clientY - rect.top;
      if (x < 0 || y < 0 || x >= rect.width || y >= rect.height) return null;

      const colIndex = Math.floor(x / MATRIX_CELL_SIZE);
      const rowIndex = Math.floor(y / MATRIX_CELL_SIZE);
      const rowCode = order[rowIndex];
      const colCode = order[colIndex];
      if (!rowCode || !colCode || rowCode === colCode) return null;

      const cell = getGridCell(grid, characters, characterIndex, rowCode, colCode);
      if (!cell || cell.games < minGames) return null;
      return { selection: { rowCode, colCode }, cell };
    },
    [characterIndex, characters, grid, minGames, order]
  );

  const handlePointerMove = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const hit = getSelectionFromPoint(event.clientX, event.clientY);
    if (!hit) {
      setHoverSelection(null);
      onHoverChange(null);
      return;
    }
    setHoverSelection(hit.selection);
    onHoverChange({ cell: hit.cell, x: event.clientX, y: event.clientY });
  };

  const handlePointerLeave = () => {
    setHoverSelection(null);
    onHoverChange(null);
  };

  const moveSelection = React.useCallback(
    (rowDelta: number, colDelta: number) => {
      if (order.length < 2) return;
      const rowIndex = Math.max(0, order.indexOf(selected?.rowCode ?? order[0]));
      const colIndex = Math.max(0, order.indexOf(selected?.colCode ?? order[1]));
      let nextRowIndex = Math.max(0, Math.min(order.length - 1, rowIndex + rowDelta));
      let nextColIndex = Math.max(0, Math.min(order.length - 1, colIndex + colDelta));
      if (nextRowIndex === nextColIndex) {
        nextColIndex = Math.min(order.length - 1, nextColIndex + 1);
        if (nextRowIndex === nextColIndex) nextRowIndex = Math.max(0, nextRowIndex - 1);
      }
      const rowCode = order[nextRowIndex];
      const colCode = order[nextColIndex];
      const index = getGridIndex(grid, characterIndex, rowCode, colCode);
      if (index == null || grid.games[index] < minGames) return;
      onSelect({ rowCode, colCode });
    },
    [characterIndex, grid, minGames, onSelect, order, selected]
  );

  const handleKeyDown = (event: React.KeyboardEvent<HTMLCanvasElement>) => {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      moveSelection(1, 0);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      moveSelection(-1, 0);
    } else if (event.key === "ArrowRight") {
      event.preventDefault();
      moveSelection(0, 1);
    } else if (event.key === "ArrowLeft") {
      event.preventDefault();
      moveSelection(0, -1);
    }
  };

  const size = order.length * MATRIX_CELL_SIZE;

  return (
    <div
      ref={scrollRef}
      className="max-h-[min(76vh,820px)] overflow-auto rounded-md border border-[var(--color-border)] bg-[var(--color-surface)]"
    >
      <div
        className="relative"
        style={{
          width: MATRIX_LABEL_WIDTH + size,
          height: MATRIX_HEADER_HEIGHT + size,
        }}
      >
        <div
          ref={cornerRef}
          className="absolute left-0 top-0 z-30 flex items-center border-b border-r border-[var(--color-border)] bg-[var(--color-surface-2)] px-3 text-[11px] font-semibold text-[var(--color-muted-foreground)]"
          style={{ width: MATRIX_LABEL_WIDTH, height: MATRIX_HEADER_HEIGHT }}
        >
          Focus / Ally
        </div>

        <div
          ref={columnHeaderRef}
          className="absolute top-0 z-20"
          style={{ left: MATRIX_LABEL_WIDTH, width: size, height: MATRIX_HEADER_HEIGHT }}
        >
          {order.map((code, index) => {
            const character = characterMap.get(code);
            return (
              <div
                key={`col-${code}`}
                className="absolute top-0 flex items-end justify-center border-b border-r border-[var(--color-border)] bg-[var(--color-surface-2)] pb-2 text-[10px] font-semibold text-[var(--color-muted-foreground)]"
                title={character?.name}
                style={{
                  left: index * MATRIX_CELL_SIZE,
                  width: MATRIX_CELL_SIZE,
                  height: MATRIX_HEADER_HEIGHT,
                }}
              >
                <span className="max-h-[74px] [writing-mode:vertical-rl]">{character?.name}</span>
              </div>
            );
          })}
        </div>

        <div
          ref={rowHeaderRef}
          className="absolute left-0 z-20"
          style={{ top: MATRIX_HEADER_HEIGHT, width: MATRIX_LABEL_WIDTH, height: size }}
        >
          {order.map((code, index) => {
            const character = characterMap.get(code);
            return (
              <div
                key={`row-${code}`}
                className="absolute left-0 flex items-center gap-2 border-b border-r border-[var(--color-border)] bg-[var(--color-surface-2)] px-2 text-[11px] font-semibold text-[var(--color-foreground)]"
                title={character?.name}
                style={{
                  top: index * MATRIX_CELL_SIZE,
                  width: MATRIX_LABEL_WIDTH,
                  height: MATRIX_CELL_SIZE,
                }}
              >
                <span className="w-6 shrink-0 font-mono text-[10px] text-[var(--color-muted-foreground)]">
                  {code}
                </span>
                <span className="truncate">{character?.name}</span>
              </div>
            );
          })}
        </div>

        <canvas
          ref={canvasRef}
          tabIndex={0}
          role="img"
          aria-label={ariaLabel}
          className="absolute cursor-crosshair outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
          style={{
            left: MATRIX_LABEL_WIDTH,
            top: MATRIX_HEADER_HEIGHT,
            width: size,
            height: size,
          }}
          onPointerMove={handlePointerMove}
          onPointerLeave={handlePointerLeave}
          onClick={(event) => {
            const hit = getSelectionFromPoint(event.clientX, event.clientY);
            if (hit) onSelect(hit.selection);
          }}
          onKeyDown={handleKeyDown}
        />
      </div>
    </div>
  );
}

export type { CanvasHoverState };
