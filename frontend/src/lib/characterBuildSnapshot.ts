import itemGradeMap from "@/../const/itemGradeMap.json";
import weaponItemTypeMap from "@/../const/weaponItemTypeMap.json";
import type { CharacterSkillBuildResult } from "@/app/api/builds/skills/route";
import { buildEquipmentStats } from "@/domain/equipmentStats";
import {
  aggregateSkillOrderChoices,
  aggregateTacticalSkillChoices,
} from "@/lib/characterBuildChoices";
import { isPublicPatchVersion } from "@/lib/publicPatchVersion";
import { getFixedEntryCost } from "@/lib/rpMetric";
import { fetchSeasonSnapshot } from "@/lib/seasonSnapshot";
import { buildTraitMainGroups } from "@/lib/traitBuildStats";
import { expandCumulativeTier } from "@/utils/tier";

interface BuildSelection {
  characterCode: number;
  patchVersion: string;
  tier: string;
  bestWeapon?: number | null;
  mainCore?: number | null;
}

type EquipmentTuple = [
  string,
  number | null,
  number | null,
  number | null,
  number | null,
  number | null,
  number | null,
  number,
  number,
  number,
  number,
];

type TraitTuple = [
  string,
  number | null,
  number | null,
  number | null,
  number | null,
  number | null,
  number | null,
  number,
  number,
];

interface SkillSnapshot {
  orders: [string, number | null, number | null, number[], number, number, number][];
  tactical: [string, number | null, number | null, number, number, number, number][];
}

function readBuildSnapshot<T>(
  kind: "equipment" | "traits" | "skills",
  { patchVersion, characterCode }: BuildSelection,
  signal?: AbortSignal
): Promise<T | null> {
  if (
    !isPublicPatchVersion(patchVersion) ||
    !Number.isSafeInteger(characterCode) ||
    characterCode <= 0
  ) {
    return Promise.resolve(null);
  }
  return fetchSeasonSnapshot<T>(
    "builds/" + kind + "/" + patchVersion + "-" + characterCode + ".json.gz",
    signal
  );
}

export async function loadSnapshotEquipment(selection: BuildSelection, signal?: AbortSignal) {
  const { tier, patchVersion, bestWeapon, mainCore } = selection;
  const tiers = new Set(expandCumulativeTier(tier));
  const rows = (await readBuildSnapshot<EquipmentTuple[]>("equipment", selection, signal)) ?? [];
  return buildEquipmentStats(
    rows
      .filter((row) => tiers.has(row[0]) && (mainCore == null || mainCore === row[1]))
      .slice(0, 200)
      .map(
        ([, mainCore, weapon, chest, head, arm, leg, totalGames, totalWins, rankSum, totalRP]) => ({
          mainCore,
          weapon,
          chest,
          head,
          arm,
          leg,
          totalGames,
          totalWins,
          rankSum,
          totalRP,
        })
      ),
    {
      patchVersion,
      tier,
      bestWeapon: bestWeapon ?? null,
      legendOnly: false,
      itemGrades: itemGradeMap,
      weaponItemTypes: weaponItemTypeMap,
    }
  );
}

export async function loadSnapshotTraits(selection: BuildSelection, signal?: AbortSignal) {
  const tiers = new Set(expandCumulativeTier(selection.tier));
  const rows = (await readBuildSnapshot<TraitTuple[]>("traits", selection, signal)) ?? [];
  return {
    builds: buildTraitMainGroups(
      rows
        .filter(
          (row) =>
            tiers.has(row[0]) && (selection.bestWeapon == null || selection.bestWeapon === row[1])
        )
        .slice(0, 1000)
        .map(([, , mainCore, sub1, sub2, optionTrait1, optionTrait2, totalGames, totalWins]) => ({
          mainCore,
          sub1,
          sub2,
          optionTrait1,
          optionTrait2,
          totalGames,
          totalWins,
        }))
    ),
  };
}

export async function loadSnapshotSkills(
  selection: BuildSelection,
  signal?: AbortSignal
): Promise<CharacterSkillBuildResult> {
  const { tier, patchVersion, characterCode, bestWeapon, mainCore } = selection;
  const snapshot = await readBuildSnapshot<SkillSnapshot>("skills", selection, signal);
  if (!snapshot) return { skillOrders: [], tacticalSkills: [] };

  const tiers = new Set(expandCumulativeTier(tier));
  const matches = ([rowTier, weapon]: [string, number | null, ...unknown[]]) =>
    tiers.has(rowTier) && (bestWeapon == null || bestWeapon <= 0 || weapon === bestWeapon);
  const entryCost = getFixedEntryCost(patchVersion, tier);
  const skillOrders = aggregateSkillOrderChoices(
    snapshot.orders
      .filter((row) => matches(row) && (mainCore == null || mainCore <= 0 || row[2] === mainCore))
      .slice(0, 1000)
      .map(([, best_weapon, , skill_order, total_games, total_wins, total_rp]) => ({
        best_weapon,
        skill_order,
        total_games,
        total_wins,
        total_rp,
      })),
    5,
    characterCode
  );
  const tacticalSkills = aggregateTacticalSkillChoices(
    snapshot.tactical
      .filter(matches)
      .sort((left, right) => right[3] - left[3])
      .slice(0, 100)
      .map(([, , tactical_skill_group, total_games, total_wins, total_rank_sum, total_rp]) => ({
        tactical_skill_group,
        total_games,
        total_wins,
        total_rank_sum,
        total_rp,
      }))
  );
  if (entryCost <= 0) return { skillOrders, tacticalSkills };
  return {
    skillOrders: skillOrders.map((choice) => ({
      ...choice,
      averageRP: choice.averageRP - entryCost,
    })),
    tacticalSkills: tacticalSkills.map((choice) => ({
      ...choice,
      averageRP: choice.averageRP - entryCost,
    })),
  };
}
