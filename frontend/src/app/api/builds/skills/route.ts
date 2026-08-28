import { NextRequest, NextResponse } from "next/server";
import { getCacheHeaders } from "@/lib/cache";
import {
  aggregateSkillOrderChoices,
  aggregateTacticalSkillChoices,
  type SkillOrderChoice,
  type SkillOrderStatsRow,
  type TacticalSkillChoice,
  type TacticalSkillStatsRow,
} from "@/lib/characterBuildChoices";
import { createServerClient } from "@/lib/supabase";
import { expandCumulativeTier } from "@/utils/tier";

export const revalidate = 1800; // L1: 30분 서버 캐시

export interface CharacterSkillBuildResult {
  skillOrders: SkillOrderChoice[];
  tacticalSkills: TacticalSkillChoice[];
}

const EMPTY_RESULT: CharacterSkillBuildResult = {
  skillOrders: [],
  tacticalSkills: [],
};

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const characterCode = Number(searchParams.get("characterCode"));
  const tier = searchParams.get("tier") ?? "DIAMOND";
  const patchVersion = searchParams.get("patchVersion") ?? "";
  const bestWeapon = searchParams.get("bestWeapon");
  const mainCore = searchParams.get("mainCore");

  if (!Number.isInteger(characterCode) || characterCode <= 0 || !patchVersion) {
    return NextResponse.json<CharacterSkillBuildResult>(EMPTY_RESULT);
  }

  try {
    const supabase = createServerClient();
    const tiers = expandCumulativeTier(tier);

    let skillOrderQuery = supabase
      .from("v2_CharacterSkillOrder")
      .select("best_weapon, skill_order, total_games, total_wins, total_rp")
      .eq("character_num", characterCode)
      .eq("patch_version", patchVersion)
      .in("tier", tiers);

    let tacticalQuery = supabase
      .from("v2_CharacterTacticalStats")
      .select("tactical_skill_group, total_games, total_wins, total_rank_sum, total_rp")
      .eq("character_num", characterCode)
      .eq("patch_version", patchVersion)
      .in("tier", tiers);

    if (bestWeapon != null) {
      const weaponCode = Number(bestWeapon);
      if (Number.isInteger(weaponCode) && weaponCode > 0) {
        skillOrderQuery = skillOrderQuery.eq("best_weapon", weaponCode);
        tacticalQuery = tacticalQuery.eq("best_weapon", weaponCode);
      }
    }

    if (mainCore != null) {
      const mainCoreCode = Number(mainCore);
      if (Number.isInteger(mainCoreCode) && mainCoreCode > 0) {
        skillOrderQuery = skillOrderQuery.eq("main_core", mainCoreCode);
      }
    }

    const [skillOrderResult, tacticalResult] = await Promise.all([
      skillOrderQuery.order("total_games", { ascending: false }).limit(1000),
      tacticalQuery.order("total_games", { ascending: false }).limit(100),
    ]);

    if (skillOrderResult.error) {
      console.error("[builds/skills] skill order DB error:", skillOrderResult.error);
    }
    if (tacticalResult.error) {
      console.error("[builds/skills] tactical skill DB error:", tacticalResult.error);
    }

    const result: CharacterSkillBuildResult = {
      skillOrders: aggregateSkillOrderChoices(
        (skillOrderResult.data ?? []) as SkillOrderStatsRow[],
        5,
        characterCode
      ),
      tacticalSkills: aggregateTacticalSkillChoices(
        (tacticalResult.data ?? []) as TacticalSkillStatsRow[]
      ),
    };

    return NextResponse.json(result, { headers: getCacheHeaders("daily") });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("[builds/skills] request failed:", message);
    return NextResponse.json<CharacterSkillBuildResult>(EMPTY_RESULT);
  }
}
