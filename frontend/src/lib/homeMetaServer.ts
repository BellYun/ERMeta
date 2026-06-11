import { unstable_cache } from "next/cache";
import { STATS_EXCLUDED_PATCHES, getStatsPatchVersions } from "@/data/patch-notes";
import { createServerClient } from "@/lib/supabase";
import {
  HOME_BASE_TIERS,
  type HomeBaseTier,
  type HomeMetaStatRow,
  type HomeMetaStats,
} from "./homeMetaShared";

const SELECT_COLS =
  "characterNum,bestWeapon,totalGames,totalWins,totalRP,totalTop3,averageRank,tier,patchVersion";

function isHomeBaseTier(value: string): value is HomeBaseTier {
  return (HOME_BASE_TIERS as string[]).includes(value);
}

function normalizeRows(rows: unknown[]): HomeMetaStatRow[] {
  return rows.flatMap((raw) => {
    const row = raw as Partial<HomeMetaStatRow>;
    if (!row.tier || !isHomeBaseTier(row.tier)) return [];
    if (!row.patchVersion) return [];

    return [
      {
        characterNum: Number(row.characterNum),
        bestWeapon: Number(row.bestWeapon ?? 0),
        totalGames: Number(row.totalGames ?? 0),
        totalWins: Number(row.totalWins ?? 0),
        totalRP: Number(row.totalRP ?? 0),
        totalTop3: Number(row.totalTop3 ?? 0),
        averageRank: Number(row.averageRank ?? 0),
        tier: row.tier,
        patchVersion: row.patchVersion,
      },
    ];
  });
}

async function fetchHomeMetaStats(patchVersion: string): Promise<HomeMetaStats> {
  const supabase = createServerClient();
  const { data: patches } = await supabase
    .from("PatchVersion")
    .select("version")
    .order("startDate", { ascending: false })
    .limit(50);

  const patchList = Array.from(
    new Set([
      ...getStatsPatchVersions(),
      ...(patches ?? []).map((patch: { version: string }) => patch.version),
    ])
  );
  const currentIndex = patchList.indexOf(patchVersion);
  let previousPatch: string | null = null;

  if (currentIndex >= 0) {
    for (let i = currentIndex + 1; i < patchList.length; i++) {
      const candidate = patchList[i];
      if (!STATS_EXCLUDED_PATCHES.has(candidate)) {
        previousPatch = candidate;
        break;
      }
    }
  }

  const patchVersions = previousPatch ? [patchVersion, previousPatch] : [patchVersion];
  const queryResult = await supabase
    .from("v2_CharacterStats")
    .select(SELECT_COLS)
    .in("patchVersion", patchVersions)
    .in("tier", HOME_BASE_TIERS);

  let { data } = queryResult;
  const { error } = queryResult;

  if (previousPatch && data) {
    const hasV2Prev = data.some(
      (row: { patchVersion: string }) => row.patchVersion === previousPatch
    );
    if (!hasV2Prev) {
      const { data: oldData } = await supabase
        .from("CharacterStats")
        .select(SELECT_COLS)
        .eq("patchVersion", previousPatch)
        .in("tier", HOME_BASE_TIERS);
      if (oldData && oldData.length > 0) {
        data = [...data, ...oldData];
      }
    }
  }

  if (error || !data) {
    return {
      patchVersion,
      previousPatch,
      rows: [],
    };
  }

  return {
    patchVersion,
    previousPatch,
    rows: normalizeRows(data),
  };
}

export async function getCachedHomeMetaStats(patchVersion: string): Promise<HomeMetaStats> {
  return unstable_cache(
    async () => fetchHomeMetaStats(patchVersion),
    ["home-meta-stats", patchVersion],
    {
      revalidate: 21600,
      tags: ["home-meta-stats", `home-meta-stats:${patchVersion}`],
    }
  )();
}
