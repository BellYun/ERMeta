/**
 * ER&GG v2.0 수집 Edge Function
 *
 * pg_cron으로 5분마다 호출.
 * 듀얼 워커: forward (신규 게임 → old + v2_) / backfill (과거 → v2_ only)
 *
 * 시간 배분 (5분 = 300초):
 *   - 초기화/rank: ~5초
 *   - forward: ~140초 (~140 게임)
 *   - backfill: ~140초 (~140 게임)
 *   - flush/상태 저장: ~15초
 */

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createSupabaseClient } from "../_shared/supabase.ts";
import {
  fetchGamesForward,
  fetchGamesBackward,
  fetchTopRanks,
} from "../_shared/bser-api.ts";
import { getCollectableTiers, TierGroup } from "../_shared/tier-utils.ts";

// ── 상수 ──────────────────────────────────────────────────
const SEASON_ID = 37;
const TEAM_MODE = 3; // 스쿼드
const FORWARD_BUDGET_MS = 140_000;
const BACKFILL_BUDGET_MS = 140_000;
const BATCH_LIMIT = 150;
const STABLE_DELAY_MS = 12 * 60 * 60 * 1000; // 최근 12시간 이내 게임은 중단 → 백필 전환

// ── 타입 ──────────────────────────────────────────────────
interface Participant {
  gameId: number;
  teamNumber: number;
  characterNum: number;
  bestWeapon: number;
  gameRank: number;
  playerKill: number;
  playerAssistant: number;
  characterLevel: number;
  equipment0: number;
  equipment1: number;
  equipment2: number;
  equipment3: number;
  equipment4: number;
  equipmentGrade: Record<string, number>;
  craftLegend: number;
  traitFirstCore: number;
  traitFirstSub: number[];
  traitSecondSub: number[];
  skillOrderInfo: Record<string, number>;
  skillLevelInfo: Record<string, number>;
  routeIdOfStart: number;
  placeOfStart: string;
  mmrBefore: number;
  mmrAfter: number;
  rankPoint: number;
  victory: number;
  matchingMode: number;
  duration: number;
  startDtm: string;
}

// ── 유틸 ──────────────────────────────────────────────────

function parseBserDate(value: unknown): Date | null {
  if (!value) return null;
  const normalized = String(value).replace(/([+-])(\d{2})(\d{2})$/, "$1$2:$3");
  const d = new Date(normalized);
  return isNaN(d.getTime()) ? null : d;
}

function extractParticipant(raw: any): Participant | null {
  if (!raw || !raw.characterNum) return null;
  return {
    gameId: raw.gameId,
    teamNumber: raw.teamNumber ?? raw.teamId ?? 0,
    characterNum: raw.characterNum,
    bestWeapon: raw.bestWeapon ?? 0,
    gameRank: raw.gameRank ?? 99,
    playerKill: raw.playerKill ?? 0,
    playerAssistant: raw.playerAssistant ?? 0,
    characterLevel: raw.characterLevel ?? 0,
    equipment0: raw.equipment0 ?? 0,
    equipment1: raw.equipment1 ?? 0,
    equipment2: raw.equipment2 ?? 0,
    equipment3: raw.equipment3 ?? 0,
    equipment4: raw.equipment4 ?? 0,
    equipmentGrade: raw.equipmentGrade ?? {},
    craftLegend: raw.craftLegend ?? 0,
    traitFirstCore: raw.traitFirstCore ?? 0,
    traitFirstSub: Array.isArray(raw.traitFirstSub) ? raw.traitFirstSub : [],
    traitSecondSub: Array.isArray(raw.traitSecondSub) ? raw.traitSecondSub : [],
    skillOrderInfo: raw.skillOrderInfo ?? {},
    skillLevelInfo: raw.skillLevelInfo ?? {},
    routeIdOfStart: raw.routeIdOfStart ?? 0,
    placeOfStart: raw.placeOfStart ?? "",
    mmrBefore: raw.mmrBefore ?? 0,
    mmrAfter: raw.mmrAfter ?? 0,
    rankPoint: raw.rankPoint ?? 0,
    victory: raw.victory ?? 0,
    matchingMode: raw.matchingMode ?? 0,
    duration: raw.duration ?? 0,
    startDtm: raw.startDtm ?? "",
  };
}

/**
 * skillOrderInfo를 정렬된 스킬 순서 배열로 변환
 * { "1": 1001, "2": 1002, "3": 1003, ... } → [1001, 1002, 1003, ...]
 */
function skillOrderToArray(info: Record<string, number>): number[] {
  return Object.entries(info)
    .sort(([a], [b]) => Number(a) - Number(b))
    .map(([, v]) => v);
}

/**
 * 패치 버전 결정: startDtm → PatchVersion 테이블에서 매칭
 */
async function resolvePatchVersion(
  supabase: any,
  startDate: Date,
  patchCache: any[]
): Promise<string | null> {
  for (const p of patchCache) {
    const start = new Date(p.startDate);
    const end = p.endDate ? new Date(p.endDate) : new Date("2099-12-31");
    if (startDate >= start && startDate <= end) return p.version;
  }
  return null;
}

// ── DB Upsert 함수들 ──────────────────────────────────────

/**
 * v2_PlayerGameRecord 삽입 (forward only)
 */
async function insertPlayerGameRecord(
  supabase: any,
  p: Participant,
  patchVersion: string,
  matchTier: string,
  startedAt: Date
) {
  const { error } = await supabase.from("v2_PlayerGameRecord").upsert(
    {
      game_id: p.gameId,
      team_number: p.teamNumber,
      character_num: p.characterNum,
      best_weapon: p.bestWeapon,
      game_rank: p.gameRank,
      player_kill: p.playerKill,
      player_assistant: p.playerAssistant,
      character_level: p.characterLevel,
      equipment_0: p.equipment0,
      equipment_1: p.equipment1,
      equipment_2: p.equipment2,
      equipment_3: p.equipment3,
      equipment_4: p.equipment4,
      equipment_grade: p.equipmentGrade,
      craft_legend: p.craftLegend,
      trait_first_core: p.traitFirstCore,
      trait_first_sub: p.traitFirstSub,
      trait_second_sub: p.traitSecondSub,
      skill_order: p.skillOrderInfo,
      skill_level_info: p.skillLevelInfo,
      route_id_of_start: p.routeIdOfStart,
      place_of_start: p.placeOfStart,
      mmr_before: p.mmrBefore,
      mmr_after: p.mmrAfter,
      rank_point: p.rankPoint,
      victory: p.victory,
      duration: p.duration,
      patch_version: patchVersion,
      match_tier: matchTier,
      started_at: startedAt.toISOString(),
    },
    { onConflict: "game_id,character_num", ignoreDuplicates: true }
  );
  if (error) console.error("[PGR] upsert error:", error.message);
}

/**
 * v2_CharacterStats upsert (increment)
 */
async function upsertCharacterStats(
  supabase: any,
  p: Participant,
  tier: string,
  patchVersion: string
) {
  const isWin = p.gameRank === 1;
  const isTop3 = p.gameRank <= 3;
  const rp = p.mmrAfter - p.mmrBefore;

  // RPC로 upsert + increment (경합 방지)
  const { error } = await supabase.rpc("upsert_v2_character_stats", {
    p_character_num: p.characterNum,
    p_best_weapon: p.bestWeapon,
    p_tier: tier,
    p_patch_version: patchVersion,
    p_games: 1,
    p_wins: isWin ? 1 : 0,
    p_top3: isTop3 ? 1 : 0,
    p_rp: rp,
    p_rank: p.gameRank,
  });
  if (error) console.error("[CS] upsert error:", error.message);
}

/**
 * v2_CharacterTrio upsert
 */
async function upsertCharacterTrio(
  supabase: any,
  team: { char: number; mainCore: number }[],
  gameRank: number,
  tier: string,
  patchVersion: string,
  avgMMRGain: number
) {
  const sorted = [...team].sort((a, b) => a.char - b.char);
  const isWin = gameRank === 1;

  const { error } = await supabase.rpc("upsert_v2_character_trio", {
    p_char1: sorted[0].char,
    p_char2: sorted[1].char,
    p_char3: sorted[2].char,
    p_core1: sorted[0].mainCore,
    p_core2: sorted[1].mainCore,
    p_core3: sorted[2].mainCore,
    p_tier: tier,
    p_patch_version: patchVersion,
    p_games: 1,
    p_wins: isWin ? 1 : 0,
    p_rp: avgMMRGain,
    p_rank: gameRank,
  });
  if (error) console.error("[Trio] upsert error:", error.message);
}

/**
 * v2_CharacterTrioWeapon upsert
 */
async function upsertTrioWeapon(
  supabase: any,
  team: { char: number; weapon: number; mainCore: number }[],
  gameRank: number,
  tier: string,
  patchVersion: string,
  avgRP: number
) {
  // 캐릭터 번호 기준 정렬
  const sorted = [...team].sort((a, b) => a.char - b.char);
  const isWin = gameRank === 1;

  const { error } = await supabase.rpc("upsert_v2_character_trio_weapon", {
    p_char1: sorted[0].char,
    p_weapon1: sorted[0].weapon,
    p_core1: sorted[0].mainCore,
    p_char2: sorted[1].char,
    p_weapon2: sorted[1].weapon,
    p_core2: sorted[1].mainCore,
    p_char3: sorted[2].char,
    p_weapon3: sorted[2].weapon,
    p_core3: sorted[2].mainCore,
    p_tier: tier,
    p_patch_version: patchVersion,
    p_games: 1,
    p_wins: isWin ? 1 : 0,
    p_rp: avgRP,
    p_rank: gameRank,
  });
  if (error) console.error("[TrioWeapon] upsert error:", error.message);
}

/**
 * v2_CharacterSkillOrder upsert
 */
async function upsertSkillOrder(
  supabase: any,
  p: Participant,
  tier: string,
  patchVersion: string
) {
  const order = skillOrderToArray(p.skillOrderInfo);
  if (order.length === 0) return;

  const isWin = p.gameRank === 1;

  const { error } = await supabase.rpc("upsert_v2_character_skill_order", {
    p_character_num: p.characterNum,
    p_best_weapon: p.bestWeapon,
    p_main_core: p.traitFirstCore || null,
    p_skill_order: order,
    p_tier: tier,
    p_patch_version: patchVersion,
    p_games: 1,
    p_wins: isWin ? 1 : 0,
  });
  if (error) console.error("[Skill] upsert error:", error.message);
}

/**
 * v2_CharacterStartRoute upsert
 */
async function upsertStartRoute(
  supabase: any,
  p: Participant,
  tier: string,
  patchVersion: string
) {
  if (!p.routeIdOfStart || !p.placeOfStart) return;

  const isWin = p.gameRank === 1;

  const { error } = await supabase.rpc("upsert_v2_character_start_route", {
    p_character_num: p.characterNum,
    p_best_weapon: p.bestWeapon,
    p_route_id: p.routeIdOfStart,
    p_place_of_start: p.placeOfStart,
    p_tier: tier,
    p_patch_version: patchVersion,
    p_games: 1,
    p_wins: isWin ? 1 : 0,
    p_rank: p.gameRank,
  });
  if (error) console.error("[Route] upsert error:", error.message);
}

/**
 * v2_CharacterItemPriority upsert (역산 로직)
 */
async function upsertItemPriority(
  supabase: any,
  p: Participant,
  tier: string,
  patchVersion: string
) {
  if (p.craftLegend <= 0) return;

  const grades = p.equipmentGrade;
  const equipment: Record<number, number> = {
    0: p.equipment0,
    1: p.equipment1,
    2: p.equipment2,
    3: p.equipment3,
    4: p.equipment4,
  };

  // 전설 등급(grade === 5) 슬롯 추출
  const legendarySlots: { slot: number; itemCode: number }[] = [];
  for (const [slot, grade] of Object.entries(grades)) {
    if (grade === 5 && equipment[Number(slot)]) {
      legendarySlots.push({ slot: Number(slot), itemCode: equipment[Number(slot)] });
    }
  }

  if (legendarySlots.length === 0) return;

  const routeId = p.routeIdOfStart || null;

  for (const { slot, itemCode } of legendarySlots) {
    // 전체 통합 (route_id = NULL)
    const { error: e1 } = await supabase.rpc("upsert_v2_character_item_priority", {
      p_character_num: p.characterNum,
      p_best_weapon: p.bestWeapon,
      p_route_id: null,
      p_craft_legend: p.craftLegend,
      p_slot: slot,
      p_item_code: itemCode,
      p_tier: tier,
      p_patch_version: patchVersion,
    });
    if (e1) console.error("[ItemPri] upsert error (all):", e1.message);

    // 루트별 통계
    if (routeId) {
      const { error: e2 } = await supabase.rpc("upsert_v2_character_item_priority", {
        p_character_num: p.characterNum,
        p_best_weapon: p.bestWeapon,
        p_route_id: routeId,
        p_craft_legend: p.craftLegend,
        p_slot: slot,
        p_item_code: itemCode,
        p_tier: tier,
        p_patch_version: patchVersion,
      });
      if (e2) console.error("[ItemPri] upsert error (route):", e2.message);
    }
  }
}

/**
 * v2_CharacterEquipmentBuildStats upsert
 */
async function upsertEquipmentBuild(
  supabase: any,
  p: Participant,
  tier: string,
  patchVersion: string
) {
  if (!p.traitFirstCore) return;

  const isWin = p.gameRank === 1;
  const rp = p.mmrAfter - p.mmrBefore;

  const { error } = await supabase.rpc("upsert_v2_character_equipment_build", {
    p_character_num: p.characterNum,
    p_main_core: p.traitFirstCore,
    p_weapon: p.equipment0 || null,
    p_chest: p.equipment1 || null,
    p_head: p.equipment2 || null,
    p_arm: p.equipment3 || null,
    p_leg: p.equipment4 || null,
    p_tier: tier,
    p_patch_version: patchVersion,
    p_games: 1,
    p_wins: isWin ? 1 : 0,
    p_rp: rp,
    p_rank: p.gameRank,
  });
  if (error) console.error("[Equip] upsert error:", error.message);
}

/**
 * v2_CharacterTraitBuildStats upsert
 */
async function upsertTraitBuild(
  supabase: any,
  p: Participant,
  tier: string,
  patchVersion: string
) {
  if (!p.traitFirstCore) return;

  const isWin = p.gameRank === 1;

  const sub = p.traitFirstSub;
  const sec = p.traitSecondSub;

  const { error } = await supabase.rpc("upsert_v2_character_trait_build", {
    p_character_num: p.characterNum,
    p_main_core: p.traitFirstCore,
    p_sub1: sub[0] || null,
    p_sub2: sub[1] || null,
    p_sub3: sub[2] || null,
    p_sub4: sub[3] || null,
    p_option1: sec[0] || null,
    p_option2: sec[1] || null,
    p_option3: sec[2] || null,
    p_option4: sec[3] || null,
    p_best_weapon: p.bestWeapon,
    p_tier: tier,
    p_patch_version: patchVersion,
    p_games: 1,
    p_wins: isWin ? 1 : 0,
  });
  if (error) console.error("[Trait] upsert error:", error.message);
}

// ── Old 테이블 Upsert (Forward only) ────────────────────────

/**
 * old CharacterStats upsert
 */
async function upsertOldCharacterStats(
  supabase: any,
  p: Participant,
  tier: string,
  patchVersion: string
) {
  const isWin = p.gameRank === 1;
  const isTop3 = p.gameRank <= 3;
  const rp = p.mmrAfter - p.mmrBefore;

  const { error } = await supabase.rpc("upsert_old_character_stats", {
    p_character_num: p.characterNum,
    p_best_weapon: p.bestWeapon,
    p_tier: tier,
    p_patch_version: patchVersion,
    p_games: 1,
    p_wins: isWin ? 1 : 0,
    p_top3: isTop3 ? 1 : 0,
    p_rp: rp,
    p_rank: p.gameRank,
    p_damage: 0,
    p_tk: 0,
    p_player_kill: p.playerKill,
    p_player_assist: p.playerAssistant,
    p_monster_kill: 0,
  });
  if (error) console.error("[OldCS] upsert error:", error.message);
}

/**
 * old CharacterTrio upsert (patchVersion 없음)
 */
async function upsertOldCharacterTrio(
  supabase: any,
  chars: [number, number, number],
  gameRank: number,
  tier: string,
  avgRP: number
) {
  const sorted = [...chars].sort((a, b) => a - b) as [number, number, number];
  const isWin = gameRank === 1;

  const { error } = await supabase.rpc("upsert_old_character_trio", {
    p_char1: sorted[0],
    p_char2: sorted[1],
    p_char3: sorted[2],
    p_tier: tier,
    p_games: 1,
    p_wins: isWin ? 1 : 0,
    p_rp: Math.round(avgRP),
    p_rank: gameRank,
  });
  if (error) console.error("[OldTrio] upsert error:", error.message);
}

/**
 * old CharacterTrioByWeapon upsert
 */
async function upsertOldTrioByWeapon(
  supabase: any,
  team: { char: number; weapon: number }[],
  gameRank: number,
  tier: string,
  avgRP: number
) {
  const sorted = [...team].sort((a, b) => a.char - b.char);
  const isWin = gameRank === 1;

  const { error } = await supabase.rpc("upsert_old_character_trio_by_weapon", {
    p_char1: sorted[0].char,
    p_weapon1: sorted[0].weapon,
    p_char2: sorted[1].char,
    p_weapon2: sorted[1].weapon,
    p_char3: sorted[2].char,
    p_weapon3: sorted[2].weapon,
    p_tier: tier,
    p_games: 1,
    p_wins: isWin ? 1 : 0,
    p_rp: Math.round(avgRP),
    p_rank: gameRank,
  });
  if (error) console.error("[OldTrioW] upsert error:", error.message);
}

/**
 * old CharacterTraitBuildStats upsert
 */
async function upsertOldTraitBuild(
  supabase: any,
  p: Participant,
  tier: string,
  patchVersion: string
) {
  if (!p.traitFirstCore) return;

  const isWin = p.gameRank === 1;
  const isTop3 = p.gameRank <= 3;
  const rp = p.mmrAfter - p.mmrBefore;
  const sub = p.traitFirstSub;

  const { error } = await supabase.rpc("upsert_old_character_trait_build", {
    p_character_num: p.characterNum,
    p_main_core: p.traitFirstCore,
    p_sub1: sub[0] || 0,
    p_sub2: sub[1] || 0,
    p_sub3: sub[2] || 0,
    p_sub4: sub[3] || 0,
    p_best_weapon: p.bestWeapon,
    p_tier: tier,
    p_patch_version: patchVersion,
    p_games: 1,
    p_wins: isWin ? 1 : 0,
    p_top3: isTop3 ? 1 : 0,
    p_rp: rp,
    p_rank: p.gameRank,
    p_positive_rp: rp > 0 ? 1 : 0,
  });
  if (error) console.error("[OldTrait] upsert error:", error.message);
}

/**
 * old CharacterEquipmentBuildStats upsert
 */
async function upsertOldEquipmentBuild(
  supabase: any,
  p: Participant,
  tier: string,
  patchVersion: string
) {
  if (!p.traitFirstCore) return;

  const isWin = p.gameRank === 1;
  const isTop3 = p.gameRank <= 3;
  const rp = p.mmrAfter - p.mmrBefore;

  const { error } = await supabase.rpc("upsert_old_character_equipment_build", {
    p_character_num: p.characterNum,
    p_main_core: p.traitFirstCore,
    p_weapon: p.equipment0 || null,
    p_chest: p.equipment1 || null,
    p_head: p.equipment2 || null,
    p_arm: p.equipment3 || null,
    p_leg: p.equipment4 || null,
    p_tier: tier,
    p_patch_version: patchVersion,
    p_games: 1,
    p_wins: isWin ? 1 : 0,
    p_top3: isTop3 ? 1 : 0,
    p_rp: rp,
    p_rank: p.gameRank,
    p_positive_rp: rp > 0 ? 1 : 0,
  });
  if (error) console.error("[OldEquip] upsert error:", error.message);
}

// ── 게임 1건 처리 ──────────────────────────────────────────

async function processGame(
  supabase: any,
  gameDetail: any,
  patchCache: any[],
  rank1000MMR: number | null,
  isForward: boolean // true: old + v2_ / false: v2_ only
): Promise<boolean> {
  const userGames = gameDetail?.userGames;
  if (!Array.isArray(userGames) || userGames.length === 0) return false;

  const first = userGames[0];
  if (first.matchingMode !== 3) return false; // 랭크만

  // 패치 버전 결정
  const startDtm = first.startDtm || gameDetail.startDtm;
  const startDate = parseBserDate(startDtm);
  if (!startDate) return false;

  // 최근 1시간 이내 게임 → forward 중단 시그널 (남은 시간을 백필에 사용)
  if (isForward && Date.now() - startDate.getTime() < STABLE_DELAY_MS) {
    return "RECENT" as any; // 호출부에서 감지해서 forward 중단 → backfill 전환
  }

  const patchVersion = await resolvePatchVersion(supabase, startDate, patchCache);
  if (!patchVersion) return false;

  // 참가자 파싱
  const participants = userGames
    .map(extractParticipant)
    .filter((p): p is Participant => p !== null);

  if (participants.length === 0) return false;

  // 팀별 그룹핑 (조합 계산용)
  const teams = new Map<number, Participant[]>();
  for (const p of participants) {
    const team = teams.get(p.teamNumber) || [];
    team.push(p);
    teams.set(p.teamNumber, team);
  }

  // 각 참가자별 upsert (Promise.all로 병렬화)
  const participantPromises = participants.map(async (p) => {
    const tiers = getCollectableTiers(p.mmrBefore, rank1000MMR);
    if (tiers.length === 0) return;

    const tierPromises = tiers.flatMap((tier) => {
      // v2_ 집계 테이블 (forward + backfill 공통)
      const v2Calls = [
        upsertCharacterStats(supabase, p, tier, patchVersion),
        upsertEquipmentBuild(supabase, p, tier, patchVersion),
        upsertTraitBuild(supabase, p, tier, patchVersion),
        upsertSkillOrder(supabase, p, tier, patchVersion),
        upsertStartRoute(supabase, p, tier, patchVersion),
        upsertItemPriority(supabase, p, tier, patchVersion),
      ];

      // forward only: old 테이블
      const oldCalls = isForward
        ? [
            upsertOldCharacterStats(supabase, p, tier, patchVersion),
            upsertOldTraitBuild(supabase, p, tier, patchVersion),
            upsertOldEquipmentBuild(supabase, p, tier, patchVersion),
          ]
        : [];

      return [...v2Calls, ...oldCalls];
    });

    // PlayerGameRecord (forward only, 티어 무관 1회)
    if (isForward) {
      const mainTier = tiers[tiers.length - 1];
      tierPromises.push(insertPlayerGameRecord(supabase, p, patchVersion, mainTier, startDate));
    }

    await Promise.all(tierPromises);
  });

  await Promise.all(participantPromises);

  // 3인 조합 (팀 단위, 병렬화)
  const trioPromises: Promise<void>[] = [];

  for (const [, teamMembers] of teams) {
    if (teamMembers.length !== 3) continue;

    const gameRank = teamMembers[0].gameRank;

    const tierSets = teamMembers.map((m) =>
      getCollectableTiers(m.mmrBefore, rank1000MMR)
    );
    const commonTiers = tierSets[0].filter(
      (t) => tierSets[1].includes(t) && tierSets[2].includes(t)
    );

    if (commonTiers.length === 0) continue;

    const avgRP =
      teamMembers.reduce((s, m) => s + (m.mmrAfter - m.mmrBefore), 0) / 3;

    const trioTeam = teamMembers.map((m) => ({
      char: m.characterNum,
      mainCore: m.traitFirstCore || 0,
    }));

    for (const tier of commonTiers) {
      // v2_CharacterTrio
      trioPromises.push(
        upsertCharacterTrio(supabase, trioTeam, gameRank, tier, patchVersion, avgRP)
      );

      // v2_CharacterTrioWeapon
      if (teamMembers.every((m) => m.bestWeapon > 0)) {
        trioPromises.push(
          upsertTrioWeapon(
            supabase,
            teamMembers.map((m) => ({
              char: m.characterNum,
              weapon: m.bestWeapon,
              mainCore: m.traitFirstCore || 0,
            })),
            gameRank,
            tier,
            patchVersion,
            avgRP
          )
        );
      }

      // forward only: old trio
      if (isForward) {
        trioPromises.push(
          upsertOldCharacterTrio(
            supabase,
            [teamMembers[0].characterNum, teamMembers[1].characterNum, teamMembers[2].characterNum],
            gameRank,
            tier,
            avgRP
          )
        );

        if (teamMembers.every((m) => m.bestWeapon > 0)) {
          trioPromises.push(
            upsertOldTrioByWeapon(
              supabase,
              teamMembers.map((m) => ({ char: m.characterNum, weapon: m.bestWeapon })),
              gameRank,
              tier,
              avgRP
            )
          );
        }
      }
    }
  }

  await Promise.all(trioPromises);

  return true;
}

// ── 메인 핸들러 ────────────────────────────────────────────

serve(async (req: Request) => {
  const startTime = Date.now();

  try {
    const supabase = createSupabaseClient();

    // ── 1. 패치 버전 캐시 로드 ─────────────────────────
    const { data: patchCache } = await supabase
      .from("PatchVersion")
      .select("version, startDate, endDate, isActive")
      .order("startDate", { ascending: false });

    if (!patchCache || patchCache.length === 0) {
      return new Response(JSON.stringify({ error: "패치 버전 없음" }), { status: 500 });
    }

    const currentPatch = patchCache.find((p: any) => p.isActive)?.version ?? patchCache[0].version;
    console.log(`[Collect] 현재 패치: ${currentPatch}, 총 ${patchCache.length}개`);

    // ── 2. IN1000 MMR 갱신 ─────────────────────────────
    let rank1000MMR: number | null = null;
    try {
      const topPlayers = await fetchTopRanks(SEASON_ID, TEAM_MODE);
      if (topPlayers.length >= 1000) {
        const mmr = topPlayers[999]?.mmr ?? topPlayers[999]?.mmrBefore ?? null;
        if (typeof mmr === "number") {
          await supabase.from("RankThreshold").upsert(
            { seasonId: SEASON_ID, matchingTeamMode: TEAM_MODE, rank1000MMR: mmr, lastUpdated: new Date().toISOString() },
            { onConflict: "seasonId,matchingTeamMode" }
          );
          rank1000MMR = mmr;
          console.log(`[Collect] IN1000 MMR 갱신: ${mmr}`);
        }
      }
    } catch (e) {
      console.warn("[Collect] 랭킹 API 실패, DB 폴백:", e);
    }

    // DB 폴백
    if (rank1000MMR === null) {
      const { data: cached } = await supabase
        .from("RankThreshold")
        .select("rank1000MMR")
        .eq("seasonId", SEASON_ID)
        .eq("matchingTeamMode", TEAM_MODE)
        .single();
      if (cached) {
        rank1000MMR = cached.rank1000MMR;
        console.log(`[Collect] IN1000 MMR (캐시): ${rank1000MMR}`);
      }
    }

    // ── 3. 수집 상태 로드/초기화 ───────────────────────
    const { data: statuses } = await supabase
      .from("v2_CollectionStatus")
      .select("*");

    let forwardStatus = statuses?.find((s: any) => s.worker_type === "forward");
    let backfillStatus = statuses?.find((s: any) => s.worker_type === "backfill");

    // forward 워커 초기화
    if (!forwardStatus) {
      // ermangho DataCollectionStatus에서 마지막 게임 번호 읽기
      let pivotGameNumber = 0;
      const { data: oldStatus } = await supabase
        .from("DataCollectionStatus")
        .select("lastGameNumber")
        .eq("collectionType", "periodic")
        .single();
      pivotGameNumber = oldStatus?.lastGameNumber ?? 0;

      if (pivotGameNumber <= 0) {
        console.error("[Collect] DataCollectionStatus에서 lastGameNumber를 찾을 수 없음");
        return new Response(JSON.stringify({ error: "pivotGameNumber 없음" }), { status: 500 });
      }

      const { data } = await supabase
        .from("v2_CollectionStatus")
        .insert({
          worker_type: "forward",
          last_game_number: pivotGameNumber,
          current_patch_version: currentPatch,
          status: "active",
        })
        .select()
        .single();
      forwardStatus = data;
      console.log(`[Collect] forward 워커 초기화: gameNumber=${pivotGameNumber} (DataCollectionStatus에서 읽음)`);
    }

    // backfill 워커 초기화
    if (!backfillStatus) {
      const pivotGameNumber = forwardStatus?.last_game_number ?? 0;

      const { data } = await supabase
        .from("v2_CollectionStatus")
        .insert({
          worker_type: "backfill",
          last_game_number: pivotGameNumber,
          current_patch_version: currentPatch,
          status: "active",
        })
        .select()
        .single();
      backfillStatus = data;
      console.log(`[Collect] backfill 워커 초기화: gameNumber=${pivotGameNumber}`);
    }

    // ── 4. Forward 워커 (신규 게임 → old + v2_) ────────
    let forwardCollected = 0;
    let forwardSkipped = 0;
    let forwardFailed = 0;
    let forwardHitRecent = false; // 최근 게임 도달 → 남은 시간 백필에 사용
    let forwardRemainingMs = 0;

    if (forwardStatus?.status === "active") {
      const forwardStartMs = Date.now();
      const fromGame = (forwardStatus.last_game_number ?? 0) + 1;
      console.log(`[Forward] 시작: gameNumber=${fromGame}`);

      const { games, lastGameNumber } = await fetchGamesForward(
        fromGame,
        BATCH_LIMIT,
        FORWARD_BUDGET_MS
      );

      for (const game of games) {
        try {
          const result = await processGame(supabase, game, patchCache, rank1000MMR, true);
          if (result === ("RECENT" as any)) {
            forwardHitRecent = true;
            forwardRemainingMs = FORWARD_BUDGET_MS - (Date.now() - forwardStartMs);
            console.log(`[Forward] 최근 1시간 이내 게임 도달, 남은 ${Math.round(forwardRemainingMs / 1000)}초를 백필에 전환`);
            break;
          }
          if (result) forwardCollected++;
          else forwardSkipped++;
        } catch (e) {
          forwardFailed++;
          console.error("[Forward] processGame error:", e);
        }
      }

      // 상태 업데이트
      await supabase
        .from("v2_CollectionStatus")
        .update({
          last_game_number: lastGameNumber,
          last_game_id: String(lastGameNumber),
          current_patch_version: currentPatch,
          total_collected: (forwardStatus.total_collected ?? 0) + forwardCollected,
          total_skipped: (forwardStatus.total_skipped ?? 0) + forwardSkipped,
          consecutive_failures: forwardFailed > 0 ? (forwardStatus.consecutive_failures ?? 0) + forwardFailed : 0,
          updated_at: new Date().toISOString(),
        })
        .eq("worker_type", "forward");

      console.log(`[Forward] 완료: collected=${forwardCollected}, skipped=${forwardSkipped}, failed=${forwardFailed}, lastGame=${lastGameNumber}, hitRecent=${forwardHitRecent}`);
    }

    // ── 5. Backfill 워커 (과거 게임 → v2_ only) ────────
    let backfillCollected = 0;
    let backfillSkipped = 0;
    let backfillFailed = 0;

    // forward에서 최근 게임 도달 시 남은 시간을 백필에 추가
    const backfillTotalBudgetMs = BACKFILL_BUDGET_MS + (forwardHitRecent ? Math.max(0, forwardRemainingMs) : 0);

    if (backfillStatus?.status === "active") {
      const beforeGame = backfillStatus.last_game_number ?? 0;
      console.log(`[Backfill] 시작: beforeGameNumber=${beforeGame}, budget=${Math.round(backfillTotalBudgetMs / 1000)}초`);

      if (beforeGame <= 1) {
        // 백필 완료
        await supabase
          .from("v2_CollectionStatus")
          .update({ status: "completed", updated_at: new Date().toISOString() })
          .eq("worker_type", "backfill");
        console.log("[Backfill] 완료: 더 이상 과거 데이터 없음");
      } else {
        const { games, lastGameNumber } = await fetchGamesBackward(
          beforeGame,
          BATCH_LIMIT,
          backfillTotalBudgetMs
        );

        for (const game of games) {
          try {
            const saved = await processGame(supabase, game, patchCache, rank1000MMR, false);
            if (saved) backfillCollected++;
            else backfillSkipped++;
          } catch (e) {
            backfillFailed++;
            console.error("[Backfill] processGame error:", e);
          }
        }

        // 상태 업데이트
        await supabase
          .from("v2_CollectionStatus")
          .update({
            last_game_number: lastGameNumber,
            last_game_id: String(lastGameNumber),
            current_patch_version: currentPatch,
            total_collected: (backfillStatus.total_collected ?? 0) + backfillCollected,
            total_skipped: (backfillStatus.total_skipped ?? 0) + backfillSkipped,
            consecutive_failures: backfillFailed > 0 ? (backfillStatus.consecutive_failures ?? 0) + backfillFailed : 0,
            updated_at: new Date().toISOString(),
          })
          .eq("worker_type", "backfill");

        console.log(`[Backfill] 완료: collected=${backfillCollected}, skipped=${backfillSkipped}, failed=${backfillFailed}, lastGame=${lastGameNumber}`);
      }
    }

    // ── 6. 결과 반환 ────────────────────────────────────
    const totalTime = ((Date.now() - startTime) / 1000).toFixed(1);
    const result = {
      success: true,
      totalTime: `${totalTime}s`,
      currentPatch,
      rank1000MMR,
      forward: {
        collected: forwardCollected,
        skipped: forwardSkipped,
        failed: forwardFailed,
      },
      backfill: {
        collected: backfillCollected,
        skipped: backfillSkipped,
        failed: backfillFailed,
        status: backfillStatus?.status,
      },
    };

    console.log("[Collect] 결과:", JSON.stringify(result));
    return new Response(JSON.stringify(result), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("[Collect] 치명적 오류:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : String(error),
        totalTime: `${((Date.now() - startTime) / 1000).toFixed(1)}s`,
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});
