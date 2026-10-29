import { unstable_cache } from "next/cache";
import {
  getNotesByPatch,
  getStatsPatchVersions,
  type CharacterPatchNote,
  type ChangeType,
} from "@/data/patch-notes";
import { type CharacterRole, getComboRoles, getCharacterName } from "@/lib/characterMap";
import { fetchRankingData, type CharacterRankingData } from "@/lib/ranking";
import { hasComparableRP } from "@/lib/rpMetric";
import { resolveWeaponName, WEAPON_KOR_BY_CODE } from "@/lib/weaponMap";
import assassinsData from "../../public/data/lab/assassins.json";
import rangersData from "../../public/data/lab/rangers.json";
import skilldealersData from "../../public/data/lab/skilldealers.json";
import supportsData from "../../public/data/lab/supports.json";
import tanksData from "../../public/data/lab/tanks.json";
import warriorsData from "../../public/data/lab/warriors.json";
import { getPatchPageRevalidate } from "./patchPageCache";

const ANALYSIS_TIER = "DIAMOND_PLUS";
const ANALYSIS_TIERS = ["DIAMOND_PLUS", "MITHRIL_PLUS"] as const;
const PATCH_ANALYSIS_VERSIONS = ["12.6", "12.5", "12.4", "12.3", "11.5", "11.4"] as const;
const PATCH_ANALYSIS_CACHE_VERSION = "displayed-metrics-v1";
const ROLES: CharacterRole[] = ["탱커", "전사", "암살자", "스킬딜러", "원거리 딜러", "지원가"];
const PATCH_ROLE_OVERRIDES_BY_PATCH: Record<string, Record<string, CharacterRole>> = {
  "11.5": {
    "2:9": "스킬딜러",
    "2:11": "스킬딜러",
    "9:9": "스킬딜러",
    "45:4": "탱커",
    "61:5": "전사",
    "82:21": "전사",
  },
};
const PATCH_WEAPON_SCOPE_GROUPS: Record<string, Record<number, number[][]>> = {
  "11.5": {
    2: [[9, 11]],
    39: [[18, 21]],
  },
};
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
  tierMetrics: PatchCharacterTierMetric[];
}

export interface PatchCharacterTierMetric {
  tier: (typeof ANALYSIS_TIERS)[number];
  current: PatchCharacterMetric | null;
  previous: PatchCharacterMetric | null;
  deltaGames: number;
  deltaPickRate: number;
  deltaWinRate: number;
  deltaTop3Rate: number;
  deltaAverageRP: number;
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

interface PatchTierContext {
  tier: (typeof ANALYSIS_TIERS)[number];
  currentPatch: string;
  previousPatch: string;
  rankings: CharacterRankingData[];
  previousRankings: CharacterRankingData[];
  totalMatches: number;
  previousTotalMatches: number;
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

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function getNoteWeaponCodes(note: CharacterPatchNote) {
  return sortWeaponCodes(
    note.changes.flatMap((change) =>
      Object.entries(WEAPON_KOR_BY_CODE)
        .filter(([weaponCode, weaponName]) => {
          const haystack = [change.target, change.description.join(" ")].join(" ");
          const aliases = WEAPON_ALIASES[Number(weaponCode)] ?? [];
          if (weaponName === "망치" && haystack.includes("뿅! 망치")) {
            return false;
          }
          const weaponPattern = new RegExp(
            `${escapeRegExp(weaponName)}(?:\\s*무기|[의을를이가은는도]|(?=\\s|$|[,.!?;:)\\]]))`
          );
          return [weaponPattern, ...aliases].some((pattern) =>
            pattern instanceof RegExp ? pattern.test(haystack) : haystack.includes(pattern)
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

function getLabRoleForWeapon(characterNum: number, weaponCode: number): CharacterRole | null {
  for (const data of LAB_ROLE_DATA) {
    if (
      data.characters.some(
        (character) => character.characterCode === characterNum && character.weapon === weaponCode
      )
    ) {
      return data.role as CharacterRole;
    }
  }

  return null;
}

function getPatchRoleForWeapon(
  patchVersion: string,
  characterNum: number,
  weaponCode: number
): CharacterRole | null {
  const override = getPatchRoleOverrideMap(patchVersion)[`${characterNum}:${weaponCode}`];
  if (override) return override;

  return (
    getComboRoles(characterNum, weaponCode)[0] ?? getLabRoleForWeapon(characterNum, weaponCode)
  );
}

function getCharacterRoles(patchVersion: string, characterNum: number, weaponCodes: number[]) {
  const roles = new Set<CharacterRole>();
  for (const weaponCode of weaponCodes) {
    const role = getPatchRoleForWeapon(patchVersion, characterNum, weaponCode);
    if (role) {
      roles.add(role);
    }
  }
  if (roles.size > 0) return [...roles].sort((a, b) => ROLES.indexOf(a) - ROLES.indexOf(b));

  for (const data of LAB_ROLE_DATA) {
    for (const character of data.characters) {
      if (character.characterCode !== characterNum) continue;
      if (weaponCodes.length > 0 && !weaponCodes.includes(character.weapon)) continue;
      roles.add(data.role as CharacterRole);
    }
  }

  return [...roles].sort((a, b) => ROLES.indexOf(a) - ROLES.indexOf(b));
}

function getPatchRoleOverrideMap(patchVersion: string) {
  return PATCH_ROLE_OVERRIDES_BY_PATCH[patchVersion] ?? {};
}

function aggregateRoles(
  rankings: CharacterRankingData[],
  previousRankings: CharacterRankingData[],
  patchVersion: string,
  previousPatch: string
) {
  const currentTotal = rankings.reduce((sum, row) => sum + row.totalGames, 0);
  const previousByRole = aggregateRoleMap(previousRankings, patchVersion);
  const currentByRole = aggregateRoleMap(rankings, patchVersion);

  return ROLES.map((role) => {
    const cur = currentByRole.get(role);
    const prev = previousByRole.get(role);
    const averageRP = cur && cur.totalGames > 0 ? cur.totalRP / cur.totalGames : 0;
    const previousAverageRP =
      hasComparableRP(patchVersion, previousPatch) && prev && prev.totalGames > 0
        ? prev.totalRP / prev.totalGames
        : null;
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

function aggregateRoleMap(rankings: CharacterRankingData[], patchVersion: string) {
  const map = new Map<CharacterRole, RoleAccumulator>();

  for (const row of rankings) {
    const role = getPatchRoleForWeapon(patchVersion, row.characterNum, row.bestWeapon);
    if (!role) continue;

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

  return map;
}

function buildTierMetricForScope(
  note: CharacterPatchNote,
  context: PatchTierContext,
  weaponCodes: number[]
): PatchCharacterTierMetric {
  const current = buildCharacterMetric(
    note.characterCode,
    context.rankings,
    context.totalMatches,
    weaponCodes
  );
  const previous = buildCharacterMetric(
    note.characterCode,
    context.previousRankings,
    context.previousTotalMatches,
    weaponCodes
  );
  const hasComparableMetrics = current !== null && previous !== null;
  const comparableRP =
    hasComparableMetrics && hasComparableRP(context.currentPatch, context.previousPatch);

  return {
    tier: context.tier,
    current,
    previous,
    deltaGames: hasComparableMetrics ? current.totalGames - previous.totalGames : 0,
    deltaPickRate: hasComparableMetrics ? current.pickRate - previous.pickRate : 0,
    deltaWinRate: hasComparableMetrics ? current.winRate - previous.winRate : 0,
    deltaTop3Rate: hasComparableMetrics ? current.top3Rate - previous.top3Rate : 0,
    deltaAverageRP: comparableRP ? current.averageRP - previous.averageRP : 0,
  };
}

function buildDeltaForScope(
  note: CharacterPatchNote,
  contexts: PatchTierContext[],
  weaponCodes: number[],
  scopeLabel: string,
  isAggregate: boolean
): PatchCharacterDelta {
  const changeTypes = [...new Set(note.changes.map((change) => change.changeType))];
  const tierMetrics = contexts.map((context) =>
    buildTierMetricForScope(note, context, weaponCodes)
  );
  const primaryTierMetric =
    tierMetrics.find((metric) => metric.tier === ANALYSIS_TIER) ?? tierMetrics[0];

  return {
    characterNum: note.characterCode,
    name: getCharacterName(note.characterCode),
    note,
    current: primaryTierMetric?.current ?? null,
    previous: primaryTierMetric?.previous ?? null,
    deltaGames: primaryTierMetric?.deltaGames ?? 0,
    deltaPickRate: primaryTierMetric?.deltaPickRate ?? 0,
    deltaWinRate: primaryTierMetric?.deltaWinRate ?? 0,
    deltaTop3Rate: primaryTierMetric?.deltaTop3Rate ?? 0,
    deltaAverageRP: primaryTierMetric?.deltaAverageRP ?? 0,
    changeTypes,
    weaponCodes,
    weaponNames: weaponCodes.map((weaponCode) => resolveWeaponName(weaponCode)),
    scopeKey: isAggregate
      ? "aggregate"
      : weaponCodes.length > 1
        ? `weapons-${weaponCodes.join("-")}`
        : `weapon-${weaponCodes[0] ?? "unknown"}`,
    scopeLabel,
    isAggregate,
    roles: getCharacterRoles(note.patch, note.characterCode, weaponCodes),
    tierMetrics,
  };
}

function buildDeltas(
  note: CharacterPatchNote,
  contexts: PatchTierContext[]
): PatchCharacterDelta[] {
  const noteWeaponCodes = getNoteWeaponCodes(note);
  const currentRankings = contexts.flatMap((context) => context.rankings);
  const previousRankings = contexts.flatMap((context) => context.previousRankings);
  const statWeaponCodes = sortWeaponCodes([
    ...collectCharacterWeaponCodes(note.characterCode, currentRankings),
    ...collectCharacterWeaponCodes(note.characterCode, previousRankings),
  ]);

  if (noteWeaponCodes.length > 0) {
    return buildWeaponScopes(note, noteWeaponCodes).map((weaponCodes) =>
      buildDeltaForScope(note, contexts, weaponCodes, getWeaponScopeLabel(weaponCodes), false)
    );
  }

  if (statWeaponCodes.length > 0) {
    return buildWeaponScopes(note, statWeaponCodes).map((weaponCodes) =>
      buildDeltaForScope(note, contexts, weaponCodes, getWeaponScopeLabel(weaponCodes), false)
    );
  }

  return [buildDeltaForScope(note, contexts, [], "통합", true)];
}

function buildWeaponScopes(note: CharacterPatchNote, weaponCodes: number[]) {
  const candidates = new Set(weaponCodes);
  const used = new Set<number>();
  const scopes: number[][] = [];
  const groups = PATCH_WEAPON_SCOPE_GROUPS[note.patch]?.[note.characterCode] ?? [];

  for (const group of groups) {
    const scope = sortWeaponCodes(group.filter((weaponCode) => candidates.has(weaponCode)));
    if (scope.length === 0) continue;
    scopes.push(scope);
    for (const weaponCode of scope) used.add(weaponCode);
  }

  for (const weaponCode of weaponCodes) {
    if (!used.has(weaponCode)) scopes.push([weaponCode]);
  }

  return scopes;
}

function getWeaponScopeLabel(weaponCodes: number[]) {
  if (weaponCodes.length === 0) return "통합";
  return weaponCodes.map((weaponCode) => resolveWeaponName(weaponCode)).join(" + ");
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

export function getPatchAnalysisVersions(): string[] {
  const patches = new Set(getStatsPatchVersions());
  return PATCH_ANALYSIS_VERSIONS.filter((patch) => patches.has(patch));
}

async function fetchPatchAnalysisData(requestedPatch?: string): Promise<PatchAnalysisData> {
  const patches = getStatsPatchVersions();
  const requestedIndex = requestedPatch ? patches.indexOf(requestedPatch) : 0;
  const currentIndex = requestedIndex >= 0 ? requestedIndex : 0;
  const currentPatch = patches[currentIndex] ?? "";
  const previousPatch = patches[currentIndex + 1] ?? "";

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

  const tierRankingData = await Promise.all(
    ANALYSIS_TIERS.map((tier) => fetchRankingData(currentPatch, tier, true))
  );
  const contexts = tierRankingData.map((rankingData, index) => {
    const { totalMatches } = aggregateCharacters(rankingData.rankings);
    const { totalMatches: previousTotalMatches } = aggregateCharacters(
      rankingData.previousRankings
    );
    return {
      tier: ANALYSIS_TIERS[index],
      currentPatch,
      previousPatch,
      rankings: rankingData.rankings,
      previousRankings: rankingData.previousRankings,
      totalMatches,
      previousTotalMatches,
    };
  });
  const primaryContext = contexts[0];
  const primaryRankingData = tierRankingData[0];
  const notes = getNotesByPatch(currentPatch);
  // 화면에서 사용하는 실험체/역할 지표만 계산한다.
  const deltas = notes.flatMap((note) => buildDeltas(note, contexts));

  const buffed = deltas
    .filter((entry) => entry.changeTypes.includes("buff") && !entry.changeTypes.includes("nerf"))
    .sort((a, b) =>
      currentPatch === "12.6" || currentPatch === "12.5" || currentPatch === "12.4"
        ? a.characterNum - b.characterNum
        : b.deltaAverageRP - a.deltaAverageRP
    );
  const nerfed = deltas
    .filter((entry) => entry.changeTypes.includes("nerf") && !entry.changeTypes.includes("buff"))
    .sort((a, b) =>
      currentPatch === "12.6" || currentPatch === "12.5" || currentPatch === "12.4"
        ? a.characterNum - b.characterNum
        : a.deltaAverageRP - b.deltaAverageRP
    );
  const mixed = deltas
    .filter((entry) => entry.changeTypes.includes("buff") && entry.changeTypes.includes("nerf"))
    .sort((a, b) =>
      currentPatch === "12.6" || currentPatch === "12.5" || currentPatch === "12.4"
        ? a.characterNum - b.characterNum
        : b.deltaAverageRP - a.deltaAverageRP
    );

  const comparable = hasComparableRP(currentPatch, previousPatch)
    ? deltas.filter((entry) => entry.current && entry.previous)
    : [];

  return {
    currentPatch,
    previousPatch: primaryRankingData.previousPatch ?? previousPatch,
    tier: primaryRankingData.tier,
    asOf: buildAsOfLabel(),
    totalMatches: primaryContext.totalMatches,
    previousTotalMatches: primaryContext.previousTotalMatches,
    buffed,
    nerfed,
    mixed,
    roleMetrics: aggregateRoles(
      primaryContext.rankings,
      primaryContext.previousRankings,
      currentPatch,
      previousPatch
    ),
    rising: [...comparable].sort((a, b) => b.deltaAverageRP - a.deltaAverageRP).slice(0, 6),
    falling: [...comparable].sort((a, b) => a.deltaAverageRP - b.deltaAverageRP).slice(0, 6),
  };
}

export async function getPatchAnalysisData(version?: string): Promise<PatchAnalysisData> {
  const patchVersion = version ?? getPatchAnalysisVersions()[0] ?? "";
  // 같은 패치의 계산 결과를 모든 언어와 서버 인스턴스에서 재사용한다.
  return unstable_cache(
    () => fetchPatchAnalysisData(patchVersion),
    [
      "patch-analysis-strict-v1",
      PATCH_ANALYSIS_CACHE_VERSION,
      process.env.VERCEL_GIT_COMMIT_SHA ?? "local",
      patchVersion,
    ],
    {
      revalidate: getPatchPageRevalidate(patchVersion),
      tags: [`patch-page:${patchVersion}`],
    }
  )();
}
