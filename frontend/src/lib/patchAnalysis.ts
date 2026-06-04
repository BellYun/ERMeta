import { unstable_cache } from "next/cache";
import {
  getNotesByPatch,
  getStatsPatchVersions,
  type CharacterPatchNote,
  type ChangeType,
} from "@/data/patch-notes";
import { type CharacterRole, getComboRoles, getCharacterName } from "@/lib/characterMap";
import {
  type CharacterRankingData,
  getCachedRankingData,
  type RankingResponse,
} from "@/lib/ranking";
import { resolveWeaponName, WEAPON_KOR_BY_CODE } from "@/lib/weaponMap";
import assassinsData from "../../public/data/lab/assassins.json";
import rangersData from "../../public/data/lab/rangers.json";
import skilldealersData from "../../public/data/lab/skilldealers.json";
import supportsData from "../../public/data/lab/supports.json";
import tanksData from "../../public/data/lab/tanks.json";
import warriorsData from "../../public/data/lab/warriors.json";

const ANALYSIS_TIER = "DIAMOND_PLUS";
const ROLES: CharacterRole[] = ["탱커", "전사", "암살자", "스킬딜러", "원거리 딜러", "지원가"];
const WEAPON_ORDER = Object.keys(WEAPON_KOR_BY_CODE).map(Number);
const WEAPON_ALIASES: Partial<Record<number, string[]>> = {
  18: ["쌍날검"],
};
const LAB_ROLE_DATA = [
  tanksData,
  warriorsData,
  assassinsData,
  skilldealersData,
  rangersData,
  supportsData,
] as Array<{
  role: string;
  groups: Array<{ id: number; label: string }>;
  characters: Array<{ characterCode: number; weapon: number; groupId: number | null }>;
}>;

function emptyRankingData(
  patchVersion: string,
  previousPatch: string | null,
  tier: string
): RankingResponse {
  return {
    rankings: [],
    previousRankings: [],
    patchVersion,
    previousPatch,
    tier,
  };
}

function hasSupabaseEnv() {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
  );
}

async function getPatchRankingData(
  currentPatch: string,
  previousPatch: string
): Promise<RankingResponse> {
  if (!hasSupabaseEnv()) {
    console.warn("[patch-analysis] Supabase env missing; using empty ranking fallback.");
    return emptyRankingData(currentPatch, previousPatch, ANALYSIS_TIER);
  }

  try {
    return await getCachedRankingData(currentPatch, ANALYSIS_TIER);
  } catch (error) {
    if (
      error instanceof Error &&
      error.message.includes("Supabase environment variables are missing")
    ) {
      console.warn("[patch-analysis] Supabase env missing; using empty ranking fallback.");
      return emptyRankingData(currentPatch, previousPatch, ANALYSIS_TIER);
    }

    throw error;
  }
}

export interface PatchCharacterMetric {
  characterNum: number;
  name: string;
  weaponCodes: number[];
  totalGames: number;
  pickRate: number;
  winRate: number;
  top3Rate: number;
  averageRP: number;
}

export interface PatchCharacterDelta {
  characterNum: number;
  name: string;
  note: CharacterPatchNote;
  current: PatchCharacterMetric | null;
  previous: PatchCharacterMetric | null;
  deltaGames: number;
  deltaPickRate: number;
  deltaWinRate: number;
  deltaTop3Rate: number;
  deltaAverageRP: number;
  changeTypes: ChangeType[];
  weaponCodes: number[];
  weaponNames: string[];
  scopeKey: string;
  scopeLabel: string;
  isAggregate: boolean;
  roles: CharacterRole[];
}

export interface PatchRoleMetric {
  role: CharacterRole;
  totalGames: number;
  pickShare: number;
  winRate: number;
  top3Rate: number;
  averageRP: number;
  previousAverageRP: number | null;
  deltaAverageRP: number | null;
}

export interface PatchAnalysisData {
  currentPatch: string;
  previousPatch: string;
  tier: string;
  asOf: string;
  totalMatches: number;
  previousTotalMatches: number;
  buffed: PatchCharacterDelta[];
  nerfed: PatchCharacterDelta[];
  mixed: PatchCharacterDelta[];
  roleMetrics: PatchRoleMetric[];
  rising: PatchCharacterDelta[];
  falling: PatchCharacterDelta[];
}

interface CharacterAccumulator {
  characterNum: number;
  totalGames: number;
  totalWins: number;
  totalTop3: number;
  totalRP: number;
  weaponCodes: Set<number>;
}

interface RoleAccumulator {
  totalGames: number;
  totalWins: number;
  totalTop3: number;
  totalRP: number;
}

function emptyMetric(characterNum: number): PatchCharacterMetric {
  return {
    characterNum,
    name: getCharacterName(characterNum),
    weaponCodes: [],
    totalGames: 0,
    pickRate: 0,
    winRate: 0,
    top3Rate: 0,
    averageRP: 0,
  };
}

function aggregateCharacters(rankings: CharacterRankingData[]) {
  const totalMatches = rankings.reduce((sum, row) => sum + row.totalGames, 0);
  const map = new Map<number, CharacterAccumulator>();

  for (const row of rankings) {
    const cur = map.get(row.characterNum) ?? {
      characterNum: row.characterNum,
      totalGames: 0,
      totalWins: 0,
      totalTop3: 0,
      totalRP: 0,
      weaponCodes: new Set<number>(),
    };
    if (row.bestWeapon > 0) {
      cur.weaponCodes.add(row.bestWeapon);
    }
    cur.totalGames += row.totalGames;
    cur.totalWins += (row.winRate / 100) * row.totalGames;
    cur.totalTop3 += (row.top3Rate / 100) * row.totalGames;
    cur.totalRP += row.averageRP * row.totalGames;
    map.set(row.characterNum, cur);
  }

  const metrics = new Map<number, PatchCharacterMetric>();
  for (const acc of map.values()) {
    metrics.set(acc.characterNum, {
      characterNum: acc.characterNum,
      name: getCharacterName(acc.characterNum),
      weaponCodes: sortWeaponCodes([...acc.weaponCodes]),
      totalGames: acc.totalGames,
      pickRate: totalMatches > 0 ? (acc.totalGames / totalMatches) * 100 : 0,
      winRate: acc.totalGames > 0 ? (acc.totalWins / acc.totalGames) * 100 : 0,
      top3Rate: acc.totalGames > 0 ? (acc.totalTop3 / acc.totalGames) * 100 : 0,
      averageRP: acc.totalGames > 0 ? acc.totalRP / acc.totalGames : 0,
    });
  }

  return { totalMatches, metrics };
}

function sortWeaponCodes(weaponCodes: number[]) {
  return [...new Set(weaponCodes)].sort((a, b) => {
    const aIndex = WEAPON_ORDER.indexOf(a);
    const bIndex = WEAPON_ORDER.indexOf(b);
    return (aIndex === -1 ? 999 : aIndex) - (bIndex === -1 ? 999 : bIndex);
  });
}

function getNoteWeaponCodes(note: CharacterPatchNote) {
  return sortWeaponCodes(
    note.changes.flatMap((change) =>
      Object.entries(WEAPON_KOR_BY_CODE)
        .filter(([weaponCode, weaponName]) => {
          const haystack = [change.target, change.description.join(" ")].join(" ");
          const aliases = WEAPON_ALIASES[Number(weaponCode)] ?? [];
          return [`${weaponName} 무기`, `${weaponName} `, ...aliases].some((keyword) =>
            haystack.includes(keyword)
          );
        })
        .map(([weaponCode]) => Number(weaponCode))
    )
  );
}

function collectCharacterWeaponCodes(characterNum: number, rankings: CharacterRankingData[]) {
  return sortWeaponCodes(
    rankings
      .filter((row) => row.characterNum === characterNum && row.bestWeapon > 0)
      .map((row) => row.bestWeapon)
  );
}

function buildCharacterMetric(
  characterNum: number,
  rankings: CharacterRankingData[],
  totalMatches: number,
  weaponCodes: number[]
): PatchCharacterMetric | null {
  const rows = rankings.filter(
    (row) =>
      row.characterNum === characterNum &&
      (weaponCodes.length === 0 || weaponCodes.includes(row.bestWeapon))
  );
  if (rows.length === 0) return null;

  const totalGames = rows.reduce((sum, row) => sum + row.totalGames, 0);
  const totalWins = rows.reduce((sum, row) => sum + (row.winRate / 100) * row.totalGames, 0);
  const totalTop3 = rows.reduce((sum, row) => sum + (row.top3Rate / 100) * row.totalGames, 0);
  const totalRP = rows.reduce((sum, row) => sum + row.averageRP * row.totalGames, 0);

  return {
    characterNum,
    name: getCharacterName(characterNum),
    weaponCodes: sortWeaponCodes(rows.map((row) => row.bestWeapon).filter((weapon) => weapon > 0)),
    totalGames,
    pickRate: totalMatches > 0 ? (totalGames / totalMatches) * 100 : 0,
    winRate: totalGames > 0 ? (totalWins / totalGames) * 100 : 0,
    top3Rate: totalGames > 0 ? (totalTop3 / totalGames) * 100 : 0,
    averageRP: totalGames > 0 ? totalRP / totalGames : 0,
  };
}

function getCharacterRoles(characterNum: number, weaponCodes: number[]) {
  const roles = new Set<CharacterRole>();

  for (const data of LAB_ROLE_DATA) {
    for (const character of data.characters) {
      if (character.characterCode !== characterNum) continue;
      if (weaponCodes.length > 0 && !weaponCodes.includes(character.weapon)) continue;
      roles.add(data.role as CharacterRole);
    }
  }

  return [...roles].sort((a, b) => ROLES.indexOf(a) - ROLES.indexOf(b));
}

function aggregateRoles(
  rankings: CharacterRankingData[],
  previousRankings: CharacterRankingData[]
) {
  const currentTotal = rankings.reduce((sum, row) => sum + row.totalGames, 0);
  const previousByRole = aggregateRoleMap(previousRankings);
  const currentByRole = aggregateRoleMap(rankings);

  return ROLES.map((role) => {
    const cur = currentByRole.get(role);
    const prev = previousByRole.get(role);
    const averageRP = cur && cur.totalGames > 0 ? cur.totalRP / cur.totalGames : 0;
    const previousAverageRP = prev && prev.totalGames > 0 ? prev.totalRP / prev.totalGames : null;
    return {
      role,
      totalGames: cur?.totalGames ?? 0,
      pickShare: currentTotal > 0 ? ((cur?.totalGames ?? 0) / currentTotal) * 100 : 0,
      winRate: cur && cur.totalGames > 0 ? (cur.totalWins / cur.totalGames) * 100 : 0,
      top3Rate: cur && cur.totalGames > 0 ? (cur.totalTop3 / cur.totalGames) * 100 : 0,
      averageRP,
      previousAverageRP,
      deltaAverageRP: previousAverageRP == null ? null : averageRP - previousAverageRP,
    };
  }).sort((a, b) => b.averageRP - a.averageRP);
}

function aggregateRoleMap(rankings: CharacterRankingData[]) {
  const map = new Map<CharacterRole, RoleAccumulator>();

  for (const row of rankings) {
    const roles = getComboRoles(row.characterNum, row.bestWeapon);
    if (roles.length === 0) continue;

    for (const role of roles) {
      const cur = map.get(role) ?? {
        totalGames: 0,
        totalWins: 0,
        totalTop3: 0,
        totalRP: 0,
      };
      cur.totalGames += row.totalGames;
      cur.totalWins += (row.winRate / 100) * row.totalGames;
      cur.totalTop3 += (row.top3Rate / 100) * row.totalGames;
      cur.totalRP += row.averageRP * row.totalGames;
      map.set(role, cur);
    }
  }

  return map;
}

function buildDeltaForScope(
  note: CharacterPatchNote,
  currentRankings: CharacterRankingData[],
  previousRankings: CharacterRankingData[],
  totalMatches: number,
  previousTotalMatches: number,
  weaponCodes: number[],
  scopeLabel: string,
  isAggregate: boolean
): PatchCharacterDelta {
  const changeTypes = [...new Set(note.changes.map((change) => change.changeType))];
  const current = buildCharacterMetric(
    note.characterCode,
    currentRankings,
    totalMatches,
    weaponCodes
  );
  const previous = buildCharacterMetric(
    note.characterCode,
    previousRankings,
    previousTotalMatches,
    weaponCodes
  );
  const currentSafe = current ?? emptyMetric(note.characterCode);
  const previousSafe = previous ?? emptyMetric(note.characterCode);

  return {
    characterNum: note.characterCode,
    name: getCharacterName(note.characterCode),
    note,
    current,
    previous,
    deltaGames: currentSafe.totalGames - previousSafe.totalGames,
    deltaPickRate: currentSafe.pickRate - previousSafe.pickRate,
    deltaWinRate: currentSafe.winRate - previousSafe.winRate,
    deltaTop3Rate: currentSafe.top3Rate - previousSafe.top3Rate,
    deltaAverageRP: currentSafe.averageRP - previousSafe.averageRP,
    changeTypes,
    weaponCodes,
    weaponNames: weaponCodes.map((weaponCode) => resolveWeaponName(weaponCode)),
    scopeKey: isAggregate ? "aggregate" : `weapon-${weaponCodes[0] ?? "unknown"}`,
    scopeLabel,
    isAggregate,
    roles: getCharacterRoles(note.characterCode, weaponCodes),
  };
}

function buildDeltas(
  note: CharacterPatchNote,
  currentRankings: CharacterRankingData[],
  previousRankings: CharacterRankingData[],
  totalMatches: number,
  previousTotalMatches: number
): PatchCharacterDelta[] {
  const noteWeaponCodes = getNoteWeaponCodes(note);
  const statWeaponCodes = sortWeaponCodes([
    ...collectCharacterWeaponCodes(note.characterCode, currentRankings),
    ...collectCharacterWeaponCodes(note.characterCode, previousRankings),
  ]);

  if (noteWeaponCodes.length > 0) {
    return noteWeaponCodes.map((weaponCode) =>
      buildDeltaForScope(
        note,
        currentRankings,
        previousRankings,
        totalMatches,
        previousTotalMatches,
        [weaponCode],
        resolveWeaponName(weaponCode),
        false
      )
    );
  }

  const weaponCodes = statWeaponCodes;
  return [
    buildDeltaForScope(
      note,
      currentRankings,
      previousRankings,
      totalMatches,
      previousTotalMatches,
      weaponCodes,
      "통합",
      true
    ),
  ];
}

function buildAsOfLabel() {
  const formatter = new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  return formatter.format(new Date());
}

async function fetchPatchAnalysisData(): Promise<PatchAnalysisData> {
  const patches = getStatsPatchVersions();
  const currentPatch = patches[0] ?? "";
  const previousPatch = patches[1] ?? "";

  if (!currentPatch || !previousPatch) {
    return {
      currentPatch,
      previousPatch,
      tier: ANALYSIS_TIER,
      asOf: buildAsOfLabel(),
      totalMatches: 0,
      previousTotalMatches: 0,
      buffed: [],
      nerfed: [],
      mixed: [],
      roleMetrics: [],
      rising: [],
      falling: [],
    };
  }

  const rankingData = await getPatchRankingData(currentPatch, previousPatch);
  const { totalMatches } = aggregateCharacters(rankingData.rankings);
  const { totalMatches: previousTotalMatches } = aggregateCharacters(rankingData.previousRankings);
  const notes = getNotesByPatch(currentPatch);
  const deltas = notes.flatMap((note) =>
    buildDeltas(
      note,
      rankingData.rankings,
      rankingData.previousRankings,
      totalMatches,
      previousTotalMatches
    )
  );

  const buffed = deltas
    .filter((entry) => entry.changeTypes.includes("buff") && !entry.changeTypes.includes("nerf"))
    .sort((a, b) => b.deltaAverageRP - a.deltaAverageRP);
  const nerfed = deltas
    .filter((entry) => entry.changeTypes.includes("nerf") && !entry.changeTypes.includes("buff"))
    .sort((a, b) => a.deltaAverageRP - b.deltaAverageRP);
  const mixed = deltas
    .filter((entry) => entry.changeTypes.includes("buff") && entry.changeTypes.includes("nerf"))
    .sort((a, b) => b.deltaAverageRP - a.deltaAverageRP);

  const comparable = deltas.filter((entry) => entry.current && entry.previous);

  return {
    currentPatch,
    previousPatch: rankingData.previousPatch ?? previousPatch,
    tier: rankingData.tier,
    asOf: buildAsOfLabel(),
    totalMatches,
    previousTotalMatches,
    buffed,
    nerfed,
    mixed,
    roleMetrics: aggregateRoles(rankingData.rankings, rankingData.previousRankings),
    rising: [...comparable].sort((a, b) => b.deltaAverageRP - a.deltaAverageRP).slice(0, 6),
    falling: [...comparable].sort((a, b) => a.deltaAverageRP - b.deltaAverageRP).slice(0, 6),
  };
}

export async function getPatchAnalysisData(): Promise<PatchAnalysisData> {
  return unstable_cache(fetchPatchAnalysisData, ["patch-analysis", ANALYSIS_TIER], {
    revalidate: 21600,
    tags: ["patch-analysis", `patch-analysis:${ANALYSIS_TIER}`],
  })();
}
