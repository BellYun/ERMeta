import { getTraitGroup } from "@/utils/traitCodes";
import type {
  TopEquipmentBuild,
  TopTraitBuild,
  TraitSecondaryInfo,
  TraitSubOption,
} from "./ComboDetailBody";
import type { ApiTrioWeaponRow } from "./types";

interface ServerApiFetchOptions {
  revalidate?: number;
}

function resolveInternalBaseUrl(): string {
  if (process.env.NEXT_PUBLIC_BASE_URL) return process.env.NEXT_PUBLIC_BASE_URL;
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  if (process.env.NODE_ENV === "development") return `http://localhost:${process.env.PORT ?? 3000}`;
  return "https://erwagg.com";
}

export async function fetchTrioWeaponRows(
  searchParams: Record<string, string>,
  options: ServerApiFetchOptions = {}
): Promise<ApiTrioWeaponRow[]> {
  const base = resolveInternalBaseUrl();
  const qs = new URLSearchParams(searchParams).toString();
  try {
    const res = await fetch(`${base}/api/stats/trios-weapon?${qs}`, {
      next: { revalidate: options.revalidate ?? 600, tags: ["trios-weapon"] },
    });
    if (!res.ok) return [];
    const data = (await res.json()) as { results?: ApiTrioWeaponRow[] };
    return data.results ?? [];
  } catch {
    return [];
  }
}

interface TraitSubOptionRaw {
  code: number | null;
  totalGames: number;
  pickRate: number;
  winRate: number;
}

interface TraitSecondaryRaw {
  secGroup: "havoc" | "fortification" | "support" | "chaos" | "unknown";
  totalGames: number;
  pickRate: number;
  winRate: number;
  optionTrait1Options: TraitSubOptionRaw[];
  optionTrait2Options: TraitSubOptionRaw[];
}

function normalizeTraitOption(option: TraitSubOptionRaw): TraitSubOption {
  return {
    code: option.code,
    totalGames: option.totalGames,
    pickRate: option.pickRate,
    winRate: option.winRate,
  };
}

function normalizeSecondary(sec: TraitSecondaryRaw): TraitSecondaryInfo {
  return {
    secGroup: sec.secGroup,
    totalGames: sec.totalGames,
    pickRate: sec.pickRate,
    winRate: sec.winRate,
    optionTrait1Options: sec.optionTrait1Options.map(normalizeTraitOption),
    optionTrait2Options: sec.optionTrait2Options.map(normalizeTraitOption),
  };
}

interface TraitMainGroupRaw {
  mainGroup: "havoc" | "fortification" | "support" | "chaos" | "unknown";
  totalGames: number;
  groupPickRate: number;
  groupWinRate: number;
  mainCoreOptions: TraitSubOptionRaw[];
  sub1Options: TraitSubOptionRaw[];
  sub2Options: TraitSubOptionRaw[];
  secondaries?: TraitSecondaryRaw[];
}

const TRAIT_MIN_SAMPLE = 20;

function pickByPick(options: TraitSubOptionRaw[]): TraitSubOptionRaw | null {
  if (options.length === 0) return null;
  return [...options].sort((a, b) => b.pickRate - a.pickRate)[0];
}

/** 표본 ≥ TRAIT_MIN_SAMPLE 옵션 중 winRate 최고. 부족하면 pickRate fallback. */
function pickByWin(options: TraitSubOptionRaw[]): TraitSubOptionRaw | null {
  if (options.length === 0) return null;
  const qualified = options.filter((o) => o.totalGames >= TRAIT_MIN_SAMPLE);
  if (qualified.length > 0) {
    return [...qualified].sort((a, b) => b.winRate - a.winRate)[0];
  }
  return pickByPick(options);
}

export async function fetchTopTraitBuild(
  characterCode: number,
  weaponCode: number,
  patchVersion: string,
  preferredMainCore?: number | null,
  options: ServerApiFetchOptions = {}
): Promise<TopTraitBuild | null> {
  const base = resolveInternalBaseUrl();
  const qs = new URLSearchParams({
    characterCode: String(characterCode),
    bestWeapon: String(weaponCode),
    patchVersion,
  }).toString();
  try {
    const res = await fetch(`${base}/api/builds/traits/main?${qs}`, {
      next: {
        revalidate: options.revalidate ?? 1800,
        tags: [`builds-traits:${characterCode}:${weaponCode}`],
      },
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { builds?: TraitMainGroupRaw[] };
    const groups = data.builds ?? [];
    if (groups.length === 0) return null;

    // 메인 그룹은 기본적으로 픽률(대표성)을 쓰되, 조합 row의 메인 코어가 있으면
    // 해당 그룹을 우선한다. 그래야 평균 RP 상위 특성 조합과 부특성 렌더링이 맞물린다.
    const preferredGroup = getTraitGroup(preferredMainCore ?? null);
    const preferredTop =
      preferredGroup !== "unknown"
        ? groups.find((group) => group.mainGroup === preferredGroup)
        : null;
    const top = preferredTop ?? [...groups].sort((a, b) => b.groupPickRate - a.groupPickRate)[0];
    const mainCorePopular = pickByPick(top.mainCoreOptions);
    const mainCoreBest = pickByWin(top.mainCoreOptions);
    const sub1Best = pickByWin(top.sub1Options);
    const sub2Best = pickByWin(top.sub2Options);

    // 부특성 (secondary): 메인 그룹 안에서 픽률 최고인 sub-group + 그 안의 옵션 픽률 최고 조합
    const secondaries = top.secondaries ?? [];
    const topSec =
      secondaries.length > 0
        ? [...secondaries]
            .filter((secondary) => secondary.secGroup !== top.mainGroup)
            .sort((a, b) => b.pickRate - a.pickRate)[0]
        : null;
    const subOpt1 = topSec ? pickByPick(topSec.optionTrait1Options) : null;
    const subOpt2 = topSec ? pickByPick(topSec.optionTrait2Options) : null;

    return {
      mainGroup: top.mainGroup,
      groupPickRate: top.groupPickRate,
      groupWinRate: top.groupWinRate,
      totalGames: top.totalGames,
      mainCore: mainCoreBest?.code ?? null,
      mainCorePickRate: mainCoreBest?.pickRate ?? 0,
      mainCoreWinRate: mainCoreBest?.winRate ?? 0,
      mainCoreGames: mainCoreBest?.totalGames ?? 0,
      popularCore: mainCorePopular?.code ?? null,
      popularCorePickRate: mainCorePopular?.pickRate ?? 0,
      popularCoreWinRate: mainCorePopular?.winRate ?? 0,
      sub1: sub1Best?.code ?? null,
      sub1WinRate: sub1Best?.winRate ?? 0,
      sub2: sub2Best?.code ?? null,
      sub2WinRate: sub2Best?.winRate ?? 0,
      // 부특성 (sub group + option pick 1·2)
      secondaryGroup: topSec?.secGroup ?? null,
      secondaryPickRate: topSec?.pickRate ?? 0,
      secondaryWinRate: topSec?.winRate ?? 0,
      secondaryOpt1: subOpt1?.code ?? null,
      secondaryOpt1PickRate: subOpt1?.pickRate ?? 0,
      secondaryOpt1WinRate: subOpt1?.winRate ?? 0,
      secondaryOpt2: subOpt2?.code ?? null,
      secondaryOpt2PickRate: subOpt2?.pickRate ?? 0,
      secondaryOpt2WinRate: subOpt2?.winRate ?? 0,
      mainCoreOptions: top.mainCoreOptions.map(normalizeTraitOption),
      sub1Options: top.sub1Options.map(normalizeTraitOption),
      sub2Options: top.sub2Options.map(normalizeTraitOption),
      secondaries: secondaries
        .filter((secondary) => secondary.secGroup !== top.mainGroup && secondary.totalGames > 0)
        .map(normalizeSecondary),
    };
  } catch {
    return null;
  }
}

export async function fetchTopEquipmentBuild(
  characterCode: number,
  weaponCode: number,
  patchVersion: string,
  mainCore: number | null,
  options: ServerApiFetchOptions = {}
): Promise<TopEquipmentBuild | null> {
  const base = resolveInternalBaseUrl();
  const params: Record<string, string> = {
    characterCode: String(characterCode),
    bestWeapon: String(weaponCode),
    patchVersion,
    legendOnly: "1",
  };
  if (mainCore != null) params.mainCore = String(mainCore);
  const qs = new URLSearchParams(params).toString();
  try {
    const res = await fetch(`${base}/api/builds/equipment?${qs}`, {
      next: {
        revalidate: options.revalidate ?? 1800,
        tags: [`builds-equipment:${characterCode}:${weaponCode}`],
      },
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { topBuilds?: TopEquipmentBuild[] };
    return data.topBuilds?.[0] ?? null;
  } catch {
    return null;
  }
}
