import { unstable_cache } from "next/cache";
import {
  getNotesByPatch,
  getStatsPatchVersions,
  type CharacterPatchNote,
  type ChangeType,
} from "@/data/patch-notes";
import { type CharacterRole, getComboRoles, getCharacterName } from "@/lib/characterMap";
import { type CharacterRankingData, getCachedRankingData } from "@/lib/ranking";
import assassinsData from "../../public/data/lab/assassins.json";
import rangersData from "../../public/data/lab/rangers.json";
import skilldealersData from "../../public/data/lab/skilldealers.json";
import supportsData from "../../public/data/lab/supports.json";
import tanksData from "../../public/data/lab/tanks.json";
import warriorsData from "../../public/data/lab/warriors.json";

const ANALYSIS_TIER = "DIAMOND_PLUS";
const ROLES: CharacterRole[] = ["탱커", "전사", "암살자", "스킬딜러", "원거리 딜러", "지원가"];
const LAB_ROLE_DATA = [
  tanksData,
  warriorsData,
  assassinsData,
  skilldealersData,
  rangersData,
  supportsData,
] as Array<{ role: CharacterRole; characters: Array<{ characterCode: number }> }>;
const CHARACTER_LAB_ROLES = buildCharacterLabRoles();

export interface PatchCharacterMetric {
  characterNum: number;
  name: string;
  roles: CharacterRole[];
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
  roles: Set<CharacterRole>;
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
    roles: getCharacterLabRoles(characterNum),
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
      roles: new Set<CharacterRole>(),
    };
    for (const role of getCharacterLabRoles(row.characterNum)) {
      cur.roles.add(role);
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
      roles: sortRoles([...acc.roles]),
      totalGames: acc.totalGames,
      pickRate: totalMatches > 0 ? (acc.totalGames / totalMatches) * 100 : 0,
      winRate: acc.totalGames > 0 ? (acc.totalWins / acc.totalGames) * 100 : 0,
      top3Rate: acc.totalGames > 0 ? (acc.totalTop3 / acc.totalGames) * 100 : 0,
      averageRP: acc.totalGames > 0 ? acc.totalRP / acc.totalGames : 0,
    });
  }

  return { totalMatches, metrics };
}

function sortRoles(roles: CharacterRole[]) {
  return [...new Set(roles)].sort((a, b) => ROLES.indexOf(a) - ROLES.indexOf(b));
}

function buildCharacterLabRoles() {
  const map = new Map<number, Set<CharacterRole>>();

  for (const data of LAB_ROLE_DATA) {
    for (const character of data.characters) {
      const roles = map.get(character.characterCode) ?? new Set<CharacterRole>();
      roles.add(data.role);
      map.set(character.characterCode, roles);
    }
  }

  return new Map([...map.entries()].map(([code, roles]) => [code, sortRoles([...roles])]));
}

function getCharacterLabRoles(characterNum: number) {
  return CHARACTER_LAB_ROLES.get(characterNum) ?? [];
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

function buildDelta(
  note: CharacterPatchNote,
  currentMetrics: Map<number, PatchCharacterMetric>,
  previousMetrics: Map<number, PatchCharacterMetric>
): PatchCharacterDelta {
  const current = currentMetrics.get(note.characterCode) ?? null;
  const previous = previousMetrics.get(note.characterCode) ?? null;
  const currentSafe = current ?? emptyMetric(note.characterCode);
  const previousSafe = previous ?? emptyMetric(note.characterCode);
  const changeTypes = [...new Set(note.changes.map((change) => change.changeType))];
  const roles = sortRoles([...(current?.roles ?? []), ...(previous?.roles ?? [])]);

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
    roles,
  };
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

  const rankingData = await getCachedRankingData(currentPatch, ANALYSIS_TIER);
  const { totalMatches, metrics: currentMetrics } = aggregateCharacters(rankingData.rankings);
  const { totalMatches: previousTotalMatches, metrics: previousMetrics } = aggregateCharacters(
    rankingData.previousRankings
  );
  const notes = getNotesByPatch(currentPatch);
  const deltas = notes.map((note) => buildDelta(note, currentMetrics, previousMetrics));

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
