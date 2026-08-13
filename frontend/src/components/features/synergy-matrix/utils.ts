import type {
  MatrixCell,
  MatrixCharacter,
  MatrixGrid,
  MatrixSelection,
  SynergyMatrixMetric,
} from "./types";

export const MATRIX_CELL_SIZE = 34;
export const MATRIX_LABEL_WIDTH = 132;
export const MATRIX_HEADER_HEIGHT = 92;

export function formatSigned(value: number, digits = 1): string {
  if (!Number.isFinite(value)) return "-";
  return `${value > 0 ? "+" : ""}${value.toFixed(digits)}`;
}

export function formatMetricValue(metric: SynergyMatrixMetric, cell: MatrixCell): string {
  if (metric === "games") return cell.games.toLocaleString("ko-KR");
  if (metric === "winRate" || metric === "winRateLift") {
    const value = metric === "winRate" ? cell.winRate : cell.winRateLift;
    return metric === "winRate" ? `${value.toFixed(1)}%` : `${formatSigned(value, 1)}pp`;
  }
  const value = metric === "avgRP" ? cell.avgRP : cell.rpLift;
  return formatSigned(value, 1);
}

export function getMetricValue(metric: SynergyMatrixMetric, cell: MatrixCell): number {
  if (metric === "games") return cell.games;
  return cell[metric];
}

export function getGridMetricValue(
  metric: SynergyMatrixMetric,
  grid: MatrixGrid,
  index: number
): number {
  if (metric === "games") return grid.games[index];
  return grid[metric][index];
}

export function getMetricBaseline(metric: SynergyMatrixMetric): number {
  if (metric === "winRate") return 12.5;
  return 0;
}

export function isPositiveMetric(metric: SynergyMatrixMetric, value: number): boolean {
  if (metric === "games") return value > 0;
  return value >= getMetricBaseline(metric);
}

export function buildCharacterIndex(characters: MatrixCharacter[]): Map<number, number> {
  return new Map(characters.map((character, index) => [character.code, index]));
}

export function getGridIndex(
  grid: MatrixGrid,
  characterIndex: Map<number, number>,
  rowCode: number,
  colCode: number
): number | null {
  const rowIndex = characterIndex.get(rowCode);
  const colIndex = characterIndex.get(colCode);
  if (rowIndex == null || colIndex == null) return null;
  return rowIndex * grid.size + colIndex;
}

export function getGridCell(
  grid: MatrixGrid,
  characters: MatrixCharacter[],
  characterIndex: Map<number, number>,
  rowCode: number,
  colCode: number
): MatrixCell | null {
  const index = getGridIndex(grid, characterIndex, rowCode, colCode);
  if (index == null || grid.games[index] === 0) return null;
  const row = characters[characterIndex.get(rowCode) ?? -1];
  const col = characters[characterIndex.get(colCode) ?? -1];
  if (!row || !col) return null;

  return {
    rowCode,
    rowName: row.name,
    colCode,
    colName: col.name,
    games: grid.games[index],
    winRate: grid.winRate[index],
    avgRP: grid.avgRP[index],
    avgRank: grid.avgRank[index],
    rpLift: grid.rpLift[index],
    winRateLift: grid.winRateLift[index],
  };
}

export function findCharacter(
  characters: MatrixCharacter[],
  code: number | null
): MatrixCharacter | null {
  if (code == null) return null;
  return characters.find((character) => character.code === code) ?? null;
}

export function parseSelectionSearchParams(
  searchParams: URLSearchParams | ReadonlyURLSearchParams
): MatrixSelection | null {
  const rowCode = Number.parseInt(searchParams.get("row") ?? "", 10);
  const colCode = Number.parseInt(searchParams.get("col") ?? "", 10);
  if (!Number.isFinite(rowCode) || !Number.isFinite(colCode) || rowCode <= 0 || colCode <= 0) {
    return null;
  }
  return { rowCode, colCode };
}

export function parseMetricSearchParam(value: string | null): SynergyMatrixMetric | null {
  if (
    value === "rpLift" ||
    value === "winRateLift" ||
    value === "avgRP" ||
    value === "winRate" ||
    value === "games"
  ) {
    return value;
  }
  return null;
}

type ReadonlyURLSearchParams = Pick<URLSearchParams, "get">;
