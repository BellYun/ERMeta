export const MINIMUM_GAMES_OPTIONS = [0, 10, 30, 50, 100] as const;

export function parseMinimumGamesParam(value: string | null): number {
  if (value == null) return 0;
  const parsed = Number(value);
  return MINIMUM_GAMES_OPTIONS.includes(parsed as (typeof MINIMUM_GAMES_OPTIONS)[number])
    ? parsed
    : 0;
}
