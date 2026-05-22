import { headers } from "next/headers";
import type { TopEquipmentBuild, TopTraitBuild } from "./ComboDetailBody";
import type { ApiTrioWeaponRow } from "./types";

async function resolveInternalBaseUrl(): Promise<string> {
  if (process.env.NEXT_PUBLIC_BASE_URL) return process.env.NEXT_PUBLIC_BASE_URL;
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  try {
    const h = await headers();
    const host = h.get("host");
    if (host) {
      const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
      return `${proto}://${host}`;
    }
  } catch {
    /* outside request scope */
  }
  if (process.env.NODE_ENV === "development") return `http://localhost:${process.env.PORT ?? 3000}`;
  return "https://erwagg.com";
}

export async function fetchTrioWeaponRows(
  searchParams: Record<string, string>
): Promise<ApiTrioWeaponRow[]> {
  const base = await resolveInternalBaseUrl();
  const qs = new URLSearchParams(searchParams).toString();
  try {
    const res = await fetch(`${base}/api/stats/trios-weapon?${qs}`, {
      next: { revalidate: 600, tags: ["trios-weapon"] },
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

interface TraitMainGroupRaw {
  mainGroup: "havoc" | "fortification" | "support" | "chaos" | "unknown";
  totalGames: number;
  groupPickRate: number;
  groupWinRate: number;
  mainCoreOptions: TraitSubOptionRaw[];
  sub1Options: TraitSubOptionRaw[];
  sub2Options: TraitSubOptionRaw[];
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
  patchVersion: string
): Promise<TopTraitBuild | null> {
  const base = await resolveInternalBaseUrl();
  const qs = new URLSearchParams({
    characterCode: String(characterCode),
    bestWeapon: String(weaponCode),
    patchVersion,
  }).toString();
  try {
    const res = await fetch(`${base}/api/builds/traits/main?${qs}`, {
      next: { revalidate: 1800, tags: [`builds-traits:${characterCode}:${weaponCode}`] },
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { builds?: TraitMainGroupRaw[] };
    const groups = data.builds ?? [];
    if (groups.length === 0) return null;

    // 메인 그룹은 픽률 (대표성), 그 안에서 코어/서브는 승률 (성과)
    const top = [...groups].sort((a, b) => b.groupPickRate - a.groupPickRate)[0];
    const mainCorePopular = pickByPick(top.mainCoreOptions);
    const mainCoreBest = pickByWin(top.mainCoreOptions);
    const sub1Best = pickByWin(top.sub1Options);
    const sub2Best = pickByWin(top.sub2Options);

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
    };
  } catch {
    return null;
  }
}

export async function fetchTopEquipmentBuild(
  characterCode: number,
  weaponCode: number,
  patchVersion: string,
  mainCore: number | null
): Promise<TopEquipmentBuild | null> {
  const base = await resolveInternalBaseUrl();
  const params: Record<string, string> = {
    characterCode: String(characterCode),
    bestWeapon: String(weaponCode),
    patchVersion,
  };
  if (mainCore != null) params.mainCore = String(mainCore);
  const qs = new URLSearchParams(params).toString();
  try {
    const res = await fetch(`${base}/api/builds/equipment?${qs}`, {
      next: {
        revalidate: 1800,
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
