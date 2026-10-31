import { getAverageRP } from "@/lib/rpMetric";

export interface BuildSummary {
  mainCore: number | null;
  weapon: number | null;
  chest: number | null;
  head: number | null;
  arm: number | null;
  leg: number | null;
  totalGames: number;
  pickRate: number;
  winRate: number;
  averageRank: number;
  averageRP: number;
}

export interface SlotItem {
  code: number;
  totalGames: number;
  pickRate: number;
  winRate: number;
}

export interface CoreItem {
  code: number;
  totalGames: number;
  pickRate: number;
  winRate: number;
}

export interface EquipmentBuildResult {
  topBuilds: BuildSummary[];
  slotPopularity: {
    weapon: SlotItem[];
    chest: SlotItem[];
    head: SlotItem[];
    arm: SlotItem[];
    leg: SlotItem[];
  };
  coreItems: CoreItem[];
}

export type EquipmentRow = {
  mainCore: number | null;
  weapon: number | null;
  chest: number | null;
  head: number | null;
  arm: number | null;
  leg: number | null;
  totalGames: number;
  totalWins: number;
  rankSum: number;
  totalRP: number;
};

export interface EquipmentStatsOptions {
  patchVersion: string;
  tier: string;
  bestWeapon: number | null;
  legendOnly: boolean;
  itemGrades: Readonly<Record<string, string>>;
  weaponItemTypes: Readonly<Record<string, number>>;
}

/** 입력 행·매핑을 변경하지 않고 필터 적용 후의 표본을 분모로 집계한다. */
export function buildEquipmentStats(
  inputRows: readonly EquipmentRow[],
  options: EquipmentStatsOptions
): EquipmentBuildResult {
  const { patchVersion, tier, bestWeapon, legendOnly, itemGrades, weaponItemTypes } = options;
  let rows = inputRows;
  if (bestWeapon !== null) {
    rows = rows.filter(
      (row) => row.weapon != null && weaponItemTypes[String(row.weapon)] === bestWeapon
    );
  }
  if (legendOnly) {
    rows = rows.filter((row) =>
      [row.weapon, row.chest, row.head, row.arm, row.leg].every(
        (code) => code != null && itemGrades[String(code)] === "Legend"
      )
    );
  }

  const grandTotal = rows.reduce((s, r) => s + r.totalGames, 0);

  // ① topBuilds — mainCore+weapon+chest+head+arm+leg 조합 그룹화
  const buildMap = new Map<
    string,
    {
      mainCore: number | null;
      weapon: number | null;
      chest: number | null;
      head: number | null;
      arm: number | null;
      leg: number | null;
      games: number;
      wins: number;
      rankSum: number;
      rpSum: number;
    }
  >();

  for (const row of rows) {
    const key = `${row.mainCore ?? ""}|${row.weapon ?? ""}|${row.chest ?? ""}|${row.head ?? ""}|${row.arm ?? ""}|${row.leg ?? ""}`;
    const existing = buildMap.get(key);
    if (existing) {
      existing.games += row.totalGames;
      existing.wins += row.totalWins;
      existing.rankSum += row.rankSum;
      existing.rpSum += row.totalRP;
    } else {
      buildMap.set(key, {
        mainCore: row.mainCore,
        weapon: row.weapon,
        chest: row.chest,
        head: row.head,
        arm: row.arm,
        leg: row.leg,
        games: row.totalGames,
        wins: row.totalWins,
        rankSum: row.rankSum,
        rpSum: row.totalRP,
      });
    }
  }

  const topBuilds: BuildSummary[] = [...buildMap.values()]
    .sort((a, b) => b.games - a.games)
    .slice(0, 5)
    .map((b) => ({
      mainCore: b.mainCore,
      weapon: b.weapon,
      chest: b.chest,
      head: b.head,
      arm: b.arm,
      leg: b.leg,
      totalGames: b.games,
      pickRate: grandTotal > 0 ? (b.games / grandTotal) * 100 : 0,
      winRate: b.games > 0 ? (b.wins / b.games) * 100 : 0,
      averageRank: b.games > 0 ? b.rankSum / b.games : 0,
      averageRP: getAverageRP(b.rpSum, b.games, patchVersion, tier),
    }));

  // ② slotPopularity
  const slots = ["weapon", "chest", "head", "arm", "leg"] as const;
  const slotPopularity = {} as EquipmentBuildResult["slotPopularity"];
  for (const slot of slots) {
    const slotTotal = rows.reduce((s, r) => s + (r[slot] != null ? r.totalGames : 0), 0);
    slotPopularity[slot] = aggregateSlot(rows, slot, slotTotal);
  }

  // ③ coreItems — 5슬롯 전체에서 itemCode 집계
  const coreMap = new Map<number, { games: number; wins: number }>();
  for (const row of rows) {
    for (const slot of slots) {
      const code = row[slot];
      if (code == null) continue;
      const existing = coreMap.get(code);
      if (existing) {
        existing.games += row.totalGames;
        existing.wins += row.totalWins;
      } else {
        coreMap.set(code, { games: row.totalGames, wins: row.totalWins });
      }
    }
  }

  const coreItems: CoreItem[] = [...coreMap.entries()]
    .sort((a, b) => b[1].games - a[1].games)
    .slice(0, 5)
    .map(([code, { games, wins }]) => ({
      code,
      totalGames: games,
      pickRate: grandTotal > 0 ? (games / grandTotal) * 100 : 0,
      winRate: games > 0 ? (wins / games) * 100 : 0,
    }));

  return { topBuilds, slotPopularity, coreItems };
}

function aggregateSlot(
  rows: readonly EquipmentRow[],
  slot: keyof Pick<EquipmentRow, "weapon" | "chest" | "head" | "arm" | "leg">,
  slotTotal: number,
  limit = 5
): SlotItem[] {
  const map = new Map<number, { games: number; wins: number }>();
  for (const row of rows) {
    const code = row[slot];
    if (code == null) continue;
    const existing = map.get(code);
    if (existing) {
      existing.games += row.totalGames;
      existing.wins += row.totalWins;
    } else {
      map.set(code, { games: row.totalGames, wins: row.totalWins });
    }
  }
  return [...map.entries()]
    .sort((a, b) => b[1].games - a[1].games)
    .slice(0, limit)
    .map(([code, { games, wins }]) => ({
      code,
      totalGames: games,
      pickRate: slotTotal > 0 ? (games / slotTotal) * 100 : 0,
      winRate: games > 0 ? (wins / games) * 100 : 0,
    }));
}
