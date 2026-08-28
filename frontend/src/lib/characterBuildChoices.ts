export interface SkillOrderStatsRow {
  best_weapon?: number | null;
  skill_order: unknown;
  total_games: number | null;
  total_wins: number | null;
  total_rp: number | null;
}

export interface TacticalSkillStatsRow {
  tactical_skill_group: number | null;
  total_games: number | null;
  total_wins: number | null;
  total_rank_sum: number | null;
  total_rp: number | null;
}

export interface SkillOrderChoice {
  skills: number[];
  totalGames: number;
  pickRate: number;
  winRate: number;
  averageRP: number;
}

export interface TacticalSkillChoice {
  code: number;
  totalGames: number;
  pickRate: number;
  winRate: number;
  averageRank: number;
  averageRP: number;
}

function finiteNumber(value: unknown): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function normalizeSkillOrder(value: unknown, bestWeapon: number | null | undefined): number[] {
  if (!Array.isArray(value)) return [];

  return value
    .map((code) => Number(code))
    .filter((code) => Number.isInteger(code) && code > 0)
    .filter((code) => {
      if (code < 3_000_000 || code >= 4_000_000) return true;
      if (!Number.isInteger(bestWeapon) || Number(bestWeapon) <= 0) return true;

      return code === 3_000_000 + Number(bestWeapon) * 1_000;
    });
}

export function aggregateSkillOrderChoices(
  rows: SkillOrderStatsRow[],
  limit = 5
): SkillOrderChoice[] {
  const grouped = new Map<
    string,
    { skills: number[]; totalGames: number; totalWins: number; totalRP: number }
  >();

  for (const row of rows) {
    const skills = normalizeSkillOrder(row.skill_order, row.best_weapon);
    const totalGames = finiteNumber(row.total_games);
    if (skills.length === 0 || totalGames <= 0) continue;

    const key = skills.join(":");
    const current = grouped.get(key);
    if (current) {
      current.totalGames += totalGames;
      current.totalWins += finiteNumber(row.total_wins);
      current.totalRP += finiteNumber(row.total_rp);
    } else {
      grouped.set(key, {
        skills,
        totalGames,
        totalWins: finiteNumber(row.total_wins),
        totalRP: finiteNumber(row.total_rp),
      });
    }
  }

  const grandTotal = [...grouped.values()].reduce((sum, row) => sum + row.totalGames, 0);

  return [...grouped.values()]
    .sort((left, right) => right.totalGames - left.totalGames)
    .slice(0, Math.max(0, limit))
    .map((row) => ({
      skills: row.skills,
      totalGames: row.totalGames,
      pickRate: grandTotal > 0 ? (row.totalGames / grandTotal) * 100 : 0,
      winRate: row.totalGames > 0 ? (row.totalWins / row.totalGames) * 100 : 0,
      averageRP: row.totalGames > 0 ? row.totalRP / row.totalGames : 0,
    }));
}

export function aggregateTacticalSkillChoices(
  rows: TacticalSkillStatsRow[],
  limit = 5
): TacticalSkillChoice[] {
  const grouped = new Map<
    number,
    {
      totalGames: number;
      totalWins: number;
      totalRankSum: number;
      totalRP: number;
    }
  >();

  for (const row of rows) {
    const code = finiteNumber(row.tactical_skill_group);
    const totalGames = finiteNumber(row.total_games);
    if (!Number.isInteger(code) || code <= 0 || totalGames <= 0) continue;

    const current = grouped.get(code);
    if (current) {
      current.totalGames += totalGames;
      current.totalWins += finiteNumber(row.total_wins);
      current.totalRankSum += finiteNumber(row.total_rank_sum);
      current.totalRP += finiteNumber(row.total_rp);
    } else {
      grouped.set(code, {
        totalGames,
        totalWins: finiteNumber(row.total_wins),
        totalRankSum: finiteNumber(row.total_rank_sum),
        totalRP: finiteNumber(row.total_rp),
      });
    }
  }

  const grandTotal = [...grouped.values()].reduce((sum, row) => sum + row.totalGames, 0);

  return [...grouped.entries()]
    .sort((left, right) => right[1].totalGames - left[1].totalGames)
    .slice(0, Math.max(0, limit))
    .map(([code, row]) => ({
      code,
      totalGames: row.totalGames,
      pickRate: grandTotal > 0 ? (row.totalGames / grandTotal) * 100 : 0,
      winRate: row.totalGames > 0 ? (row.totalWins / row.totalGames) * 100 : 0,
      averageRank: row.totalGames > 0 ? row.totalRankSum / row.totalGames : 0,
      averageRP: row.totalGames > 0 ? row.totalRP / row.totalGames : 0,
    }));
}

export type SkillSlotLabel = "Q" | "W" | "E" | "R" | "T" | "D" | "S";

export function getSkillSlotLabel(characterCode: number, skillCode: number): SkillSlotLabel {
  const normalizedGroup = Math.floor(skillCode / 100) * 100;
  const characterSkillBase = 1_000_000 + characterCode * 1_000;
  const offset = normalizedGroup - characterSkillBase;

  if (offset === 100) return "T";
  if (offset === 200) return "Q";
  if (offset === 300) return "W";
  if (offset === 400) return "E";
  if (offset === 500) return "R";
  if (skillCode >= 3_000_000 && skillCode < 4_000_000) return "D";
  return "S";
}

export function normalizeSkillGroupCode(skillCode: number): number {
  return Math.floor(skillCode / 100) * 100;
}
