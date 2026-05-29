import { getCharacterName } from "@/lib/characterMap";
import { WEAPON_KOR_BY_CODE } from "@/lib/weaponMap";

export interface TrioWeaponMember {
  character: number;
  weapon: number;
  mainCore: number | null;
}

export interface TrioWeaponCombo {
  id: string;
  members: [TrioWeaponMember, TrioWeaponMember, TrioWeaponMember];
  totalGames: number;
  winRate: number;
  averageRP: number;
  averageRank: number;
}

export interface ApiTrioWeaponRow {
  character1: number;
  weaponType1: number;
  character2: number;
  weaponType2: number;
  character3: number;
  weaponType3: number;
  mainCore1: number | null;
  mainCore2: number | null;
  mainCore3: number | null;
  totalGames: number;
  winRate: number;
  averageRP: number;
  averageRank: number;
}

export function buildComboId(members: TrioWeaponMember[]): string {
  const sorted = [...members].sort((a, b) => a.character - b.character);
  return sorted.map((m) => `${m.character}-${m.weapon}`).join("_");
}

export function parseComboId(id: string): TrioWeaponMember[] | null {
  const parts = id.split("_");
  if (parts.length !== 3) return null;
  const members: TrioWeaponMember[] = [];
  for (const p of parts) {
    const [c, w] = p.split("-").map((n) => parseInt(n, 10));
    if (!Number.isFinite(c) || !Number.isFinite(w)) return null;
    members.push({ character: c, weapon: w, mainCore: null });
  }
  return members;
}

export function apiRowToCombo(row: ApiTrioWeaponRow): TrioWeaponCombo {
  const members: [TrioWeaponMember, TrioWeaponMember, TrioWeaponMember] = [
    { character: row.character1, weapon: row.weaponType1, mainCore: row.mainCore1 },
    { character: row.character2, weapon: row.weaponType2, mainCore: row.mainCore2 },
    { character: row.character3, weapon: row.weaponType3, mainCore: row.mainCore3 },
  ];
  return {
    id: buildComboId(members),
    members,
    totalGames: row.totalGames,
    winRate: row.winRate,
    averageRP: row.averageRP,
    averageRank: row.averageRank,
  };
}

export function mergeApiRowsByComboId(rows: ApiTrioWeaponRow[]): TrioWeaponCombo[] {
  const merged = new Map<string, TrioWeaponCombo>();

  for (const row of rows) {
    const combo = apiRowToCombo(row);
    const existing = merged.get(combo.id);

    if (!existing) {
      merged.set(combo.id, combo);
      continue;
    }

    const totalGames = existing.totalGames + combo.totalGames;
    if (totalGames > 0) {
      existing.winRate =
        (existing.winRate * existing.totalGames + combo.winRate * combo.totalGames) / totalGames;
      existing.averageRP =
        (existing.averageRP * existing.totalGames + combo.averageRP * combo.totalGames) /
        totalGames;
      existing.averageRank =
        (existing.averageRank * existing.totalGames + combo.averageRank * combo.totalGames) /
        totalGames;
    }
    existing.totalGames = totalGames;
  }

  return Array.from(merged.values());
}

export function characterDisplayName(code: number): string {
  return getCharacterName(code);
}

export function weaponDisplayName(code: number): string {
  return WEAPON_KOR_BY_CODE[code] ?? `무기${code}`;
}

export function memberLabel(member: TrioWeaponMember): string {
  return `${characterDisplayName(member.character)} ${weaponDisplayName(member.weapon)}`;
}

export function trioName(combo: TrioWeaponCombo): string {
  return combo.members.map((m) => characterDisplayName(m.character)).join(" + ");
}

export type TrioSortBy = "winRate" | "averageRP" | "averageRank" | "totalGames";

export const SORT_LABELS: Record<TrioSortBy, string> = {
  averageRP: "평균 RP순",
  winRate: "승률순",
  averageRank: "평균 순위순",
  totalGames: "표본순",
};

export function scoreFromWinRate(
  winRate: number,
  games: number
): "S+" | "S" | "A" | "B" | "C" | "D" {
  if (games < 20) return "D";
  if (winRate >= 16) return "S+";
  if (winRate >= 14) return "S";
  if (winRate >= 12) return "A";
  if (winRate >= 10) return "B";
  if (winRate >= 8) return "C";
  return "D";
}
