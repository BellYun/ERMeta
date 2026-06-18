import { NextRequest, NextResponse } from "next/server";
import { getStatsPatchVersions } from "@/data/patch-notes";
import { getCacheHeaders } from "@/lib/cache";
import { tryNestApiProxy } from "@/lib/server/nestProxy";
import { createServerClient } from "@/lib/supabase";
import { expandCumulativeTier } from "@/utils/tier";

export const revalidate = 1800; // L1: 30분 서버 캐시

export interface TraitOptionItem {
  traits: number[];
  totalGames: number;
  pickRate: number;
  winRate: number;
}

export async function GET(request: NextRequest) {
  const proxied = await tryNestApiProxy(request, "/builds/traits/options");
  if (proxied) return proxied;

  const { searchParams } = new URL(request.url);
  const characterCode = Number(searchParams.get("characterCode"));
  const tier = searchParams.get("tier") ?? "DIAMOND";
  const patchVersion = searchParams.get("patchVersion") ?? getStatsPatchVersions()[0];
  const bestWeapon = searchParams.get("bestWeapon");

  if (!characterCode || isNaN(characterCode)) {
    return NextResponse.json({ options: [] });
  }

  try {
    const supabase = createServerClient();

    let query = supabase
      .from("v2_CharacterTraitBuildStats")
      .select("*")
      .eq("characterNum", characterCode)
      .eq("patchVersion", patchVersion)
      // 누적(+) tier — multiple tier rows 가 같은 (optionTrait1, optionTrait2) 로 분산.
      // 충분히 fetch 한 뒤 후처리에서 합산 + top 10.
      .in("tier", expandCumulativeTier(tier))
      .order("totalGames", { ascending: false })
      .limit(100);

    if (bestWeapon) {
      query = query.eq("bestWeapon", Number(bestWeapon));
    }

    const { data, error } = await query;

    if (error || !data || data.length === 0) {
      return NextResponse.json({ options: [] });
    }

    const grandTotal = data.reduce(
      (sum: number, r: Record<string, unknown>) => sum + ((r.totalGames as number) ?? 0),
      0
    );

    // (optionTrait1, optionTrait2) 키로 multiple tier rows 합산 후 top 10.
    const grouped = new Map<string, { traits: number[]; games: number; wins: number }>();
    for (const r of data as Record<string, unknown>[]) {
      const traits: number[] = [];
      for (let i = 1; i <= 2; i++) {
        const code = r[`optionTrait${i}`] as number | null | undefined;
        if (code) traits.push(code);
      }
      const key = traits.join(":");
      const games = (r.totalGames as number) ?? 0;
      const wins = (r.totalWins as number) ?? 0;
      const ex = grouped.get(key);
      if (ex) {
        ex.games += games;
        ex.wins += wins;
      } else {
        grouped.set(key, { traits, games, wins });
      }
    }
    const options: TraitOptionItem[] = Array.from(grouped.values())
      .sort((a, b) => b.games - a.games)
      .slice(0, 10)
      .map((g) => ({
        traits: g.traits,
        totalGames: g.games,
        pickRate: grandTotal > 0 ? (g.games / grandTotal) * 100 : 0,
        winRate: g.games > 0 ? (g.wins / g.games) * 100 : 0,
      }));

    return NextResponse.json({ options }, { headers: getCacheHeaders("daily") });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[builds/traits/options] request failed:", message);
    return NextResponse.json({ options: [] });
  }
}
