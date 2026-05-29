import type { TrioSortBy } from "./types";

const MAX_POOL = 3;
const DEFAULT_SORT: TrioSortBy = "averageRP";
const VALID_SORTS = new Set<TrioSortBy>(["winRate", "averageRP", "averageRank", "totalGames"]);

type ParamsRecord = Record<string, string | string[] | undefined>;
type ParamsLike = URLSearchParams | { get(name: string): string | null } | ParamsRecord;

export interface TrioLabUrlState {
  pool: number[];
  sort: TrioSortBy;
  search: string;
}

function readParam(source: ParamsLike, key: string): string | null {
  if ("get" in source && typeof source.get === "function") {
    return source.get(key);
  }

  const value = (source as ParamsRecord)[key];
  if (Array.isArray(value)) {
    return value[0] ?? null;
  }
  return value ?? null;
}

export function normalizeTrioLabPool(codes: number[]): number[] {
  return Array.from(
    new Set(codes.filter((code) => Number.isFinite(code) && Number.isInteger(code) && code > 0))
  )
    .sort((a, b) => a - b)
    .slice(0, MAX_POOL);
}

export function parseTrioLabUrlState(source: ParamsLike): TrioLabUrlState {
  const rawPool = readParam(source, "pool") ?? "";
  const pool = normalizeTrioLabPool(
    rawPool
      .split(",")
      .map((value) => parseInt(value, 10))
      .filter((value) => Number.isFinite(value))
  );

  const rawSort = readParam(source, "sort");
  const sort =
    rawSort && VALID_SORTS.has(rawSort as TrioSortBy) ? (rawSort as TrioSortBy) : DEFAULT_SORT;

  return {
    pool,
    sort,
    search: readParam(source, "q") ?? "",
  };
}

export function buildTrioLabSearchParams(
  state: TrioLabUrlState,
  base?: URLSearchParams | { toString(): string }
): URLSearchParams {
  const params = new URLSearchParams(base?.toString() ?? "");
  const pool = normalizeTrioLabPool(state.pool);
  const trimmedSearch = state.search.trim();

  if (pool.length > 0) {
    params.set("pool", pool.join(","));
  } else {
    params.delete("pool");
  }

  if (state.sort !== DEFAULT_SORT) {
    params.set("sort", state.sort);
  } else {
    params.delete("sort");
  }

  if (trimmedSearch) {
    params.set("q", state.search);
  } else {
    params.delete("q");
  }

  return params;
}

export function buildTrioLabQueryString(
  state: TrioLabUrlState,
  base?: URLSearchParams | { toString(): string }
): string {
  const qs = buildTrioLabSearchParams(state, base).toString();
  return qs ? `?${qs}` : "";
}

export function buildTrioLabListHref(state: TrioLabUrlState): string {
  return `/trio-lab${buildTrioLabQueryString(state)}`;
}

export function buildTrioLabDetailHref(comboId: string, state: TrioLabUrlState): string {
  return `/trio-lab/${comboId}${buildTrioLabQueryString(state)}`;
}
