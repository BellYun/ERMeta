import type {
  CharacterMatrixModel,
  CharacterMatrixPayload,
  MatrixGrid,
  MatrixViewSettings,
  MatrixViewSummary,
  MatrixWorkerTiming,
} from "./types";
import { getMetricBaseline, getMetricValue } from "./utils";

type WorkerInboundMessage =
  | { type: "load"; url: string; settings: MatrixViewSettings }
  | { type: "view"; settings: MatrixViewSettings };

type WorkerOutboundMessage =
  | {
      type: "ready";
      model: CharacterMatrixModel;
      grid: MatrixGrid;
      summary: MatrixViewSummary;
      timing: MatrixWorkerTiming;
    }
  | { type: "view"; summary: MatrixViewSummary }
  | { type: "error"; message: string };

let model: CharacterMatrixPayload | null = null;

function average(values: number[]): number {
  if (values.length === 0) return Number.NEGATIVE_INFINITY;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function buildSummary(settings: MatrixViewSettings): MatrixViewSummary {
  if (!model) {
    throw new Error("matrix_model_not_ready");
  }

  const visibleCells = model.cells.filter((cell) => cell.games >= settings.minGames);
  const outgoing = new Map<number, number[]>();
  const incoming = new Map<number, number[]>();
  const gamesByCode = new Map<number, number>();

  for (const cell of visibleCells) {
    const value = cell.rpLift;
    const outgoingValues = outgoing.get(cell.rowCode) ?? [];
    outgoingValues.push(value);
    outgoing.set(cell.rowCode, outgoingValues);

    const incomingValues = incoming.get(cell.colCode) ?? [];
    incomingValues.push(value);
    incoming.set(cell.colCode, incomingValues);

    gamesByCode.set(cell.rowCode, (gamesByCode.get(cell.rowCode) ?? 0) + cell.games);
    gamesByCode.set(cell.colCode, (gamesByCode.get(cell.colCode) ?? 0) + cell.games);
  }

  const characters = [...model.characters];
  characters.sort((a, b) => {
    if (settings.sort === "name") return a.name.localeCompare(b.name, "ko-KR");
    if (settings.sort === "outgoingRpLift") {
      return average(outgoing.get(b.code) ?? []) - average(outgoing.get(a.code) ?? []);
    }
    if (settings.sort === "incomingRpLift") {
      return average(incoming.get(b.code) ?? []) - average(incoming.get(a.code) ?? []);
    }
    if (settings.sort === "games") {
      return (gamesByCode.get(b.code) ?? 0) - (gamesByCode.get(a.code) ?? 0);
    }
    return a.code - b.code;
  });

  const baseline = getMetricBaseline(settings.metric);
  const values = visibleCells.map((cell) =>
    Math.abs(getMetricValue(settings.metric, cell) - baseline)
  );
  const maxGames = visibleCells.reduce((max, cell) => Math.max(max, cell.games), 0);
  const maxAbs = Math.max(...values, 1);

  const topPositive = [...visibleCells]
    .filter((cell) => cell.rpLift > 0)
    .sort((a, b) => b.rpLift - a.rpLift || b.games - a.games)
    .slice(0, 8);

  const topNegative = [...visibleCells]
    .filter((cell) => cell.rpLift < 0)
    .sort((a, b) => a.rpLift - b.rpLift || b.games - a.games)
    .slice(0, 8);

  return {
    order: characters.map((character) => character.code),
    topPositive,
    topNegative,
    visibleCellCount: visibleCells.length,
    maxGames,
    maxAbs,
  };
}

function buildGrid(payload: CharacterMatrixPayload): MatrixGrid {
  const size = payload.characters.length;
  const length = size * size;
  const characterIndex = new Map(
    payload.characters.map((character, index) => [character.code, index])
  );
  const grid: MatrixGrid = {
    size,
    games: new Uint32Array(length),
    winRate: new Float32Array(length),
    avgRP: new Float32Array(length),
    avgRank: new Float32Array(length),
    rpLift: new Float32Array(length),
    winRateLift: new Float32Array(length),
  };

  for (const cell of payload.cells) {
    const rowIndex = characterIndex.get(cell.rowCode);
    const colIndex = characterIndex.get(cell.colCode);
    if (rowIndex == null || colIndex == null) continue;
    const index = rowIndex * size + colIndex;
    grid.games[index] = cell.games;
    grid.winRate[index] = cell.winRate;
    grid.avgRP[index] = cell.avgRP;
    grid.avgRank[index] = cell.avgRank;
    grid.rpLift[index] = cell.rpLift;
    grid.winRateLift[index] = cell.winRateLift;
  }

  return grid;
}

function toModel(payload: CharacterMatrixPayload): CharacterMatrixModel {
  const { cells: _cells, ...metadata } = payload;
  return metadata;
}

function getTransferList(grid: MatrixGrid): Transferable[] {
  return [
    grid.games.buffer,
    grid.winRate.buffer,
    grid.avgRP.buffer,
    grid.avgRank.buffer,
    grid.rpLift.buffer,
    grid.winRateLift.buffer,
  ];
}

async function loadMatrix(url: string, settings: MatrixViewSettings) {
  const fetchStartedAt = performance.now();
  const response = await fetch(url, { cache: "force-cache" });
  if (!response.ok) throw new Error("matrix_fetch_failed");
  const json = await response.text();
  const fetchEndedAt = performance.now();

  const parseStartedAt = performance.now();
  const payload = JSON.parse(json) as CharacterMatrixPayload;
  const parseEndedAt = performance.now();

  const gridStartedAt = performance.now();
  const grid = buildGrid(payload);
  const gridEndedAt = performance.now();
  model = payload;

  const responseMessage: WorkerOutboundMessage = {
    type: "ready",
    model: toModel(payload),
    grid,
    summary: buildSummary(settings),
    timing: {
      fetchMs: fetchEndedAt - fetchStartedAt,
      parseMs: parseEndedAt - parseStartedAt,
      gridBuildMs: gridEndedAt - gridStartedAt,
    },
  };
  self.postMessage(responseMessage, { transfer: getTransferList(grid) });
}

async function handleMessage(message: WorkerInboundMessage) {
  try {
    if (message.type === "load") {
      await loadMatrix(message.url, message.settings);
      return;
    }

    const response: WorkerOutboundMessage = {
      type: "view",
      summary: buildSummary(message.settings),
    };
    self.postMessage(response);
  } catch (error) {
    const response: WorkerOutboundMessage = {
      type: "error",
      message: error instanceof Error ? error.message : "unknown_worker_error",
    };
    self.postMessage(response);
  }
}

self.onmessage = (event: MessageEvent<WorkerInboundMessage>) => {
  void handleMessage(event.data);
};
