/**
 * ER&GG v2.2 수집 Edge Function
 *
 * pg_cron으로 3분마다 호출.
 * 듀얼 워커: forward (신규 게임 → old + v2_) / backfill (과거 → v2_ only)
 *
 * v2.2: BULK RPC 최적화
 *   - 게임당 1 RPC → 사이클당 1~2 RPC (패치버전별 그룹)
 *   - WAL fsync 120~180회 → 1~4회 (트랜잭션 수 98% 감소)
 *   - parseGameData() 순수 함수 분리 → 축적 후 배치 RPC
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
const FORWARD2_BUDGET_MS = 90_000;
const BACKFILL_BUDGET_MS = 30_000;
const FORWARD2_START_GAME = 58540099;
const BATCH_LIMIT = 150;
const STABLE_DELAY_MS = 1 * 60 * 60 * 1000; // 최근 1시간 이내 게임은 중단 → 백필 전환

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

interface ParsedGame {
  patchVersion: string;
  participants: any[];
  trios: any[];
}

// ── 유틸 ──────────────────────────────────────────────────

function parseBserDate(value: unknown): Date | null {
  if (!value) return null;
  const normalized = String(value).replace(/([+-])(\d{2})(\d{2})$/, "$1$2:$3");
  const d = new Date(normalized);
  return isNaN(d.getTime()) ? null : d;
}

function normalizeEquipmentSlots(raw: any): [number, number, number, number, number] {
  const eq = raw.equipment ?? raw.items;
  if (eq) {
    const slots = Array.isArray(eq)
      ? eq
      : typeof eq === "object"
        ? [eq["0"], eq["1"], eq["2"], eq["3"], eq["4"]]
        : [];

    const normalize = (v: unknown): number => {
      if (v === null || v === undefined) return 0;
      if (typeof v === "object") {
        const r = v as Record<string, unknown>;
        return Number(r.itemCode ?? r.code ?? r.item ?? r.id ?? 0) || 0;
      }
      return Number(v) || 0;
    };

    const result: [number, number, number, number, number] = [
      normalize(slots[0]),
      normalize(slots[1]),
      normalize(slots[2]),
      normalize(slots[3]),
      normalize(slots[4]),
    ];

    if (result.some((v) => v > 0)) return result;
  }

  return [
    Number(raw.equipment0 ?? raw.weapon ?? raw.bestWeapon ?? 0) || 0,
    Number(raw.equipment1 ?? raw.chest ?? 0) || 0,
    Number(raw.equipment2 ?? raw.head ?? 0) || 0,
    Number(raw.equipment3 ?? raw.arm ?? 0) || 0,
    Number(raw.equipment4 ?? raw.leg ?? 0) || 0,
  ];
}

function extractParticipant(raw: any): Participant | null {
  if (!raw || !raw.characterNum) return null;

  const equip = normalizeEquipmentSlots(raw);

  return {
    gameId: raw.gameId,
    teamNumber: raw.teamNumber ?? raw.teamId ?? 0,
    characterNum: raw.characterNum,
    bestWeapon: raw.bestWeapon ?? 0,
    gameRank: raw.gameRank ?? 99,
    playerKill: raw.playerKill ?? 0,
    playerAssistant: raw.playerAssistant ?? 0,
    characterLevel: raw.characterLevel ?? 0,
    equipment0: equip[0],
    equipment1: equip[1],
    equipment2: equip[2],
    equipment3: equip[3],
    equipment4: equip[4],
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
 */
function skillOrderToArray(info: Record<string, number>): number[] {
  return Object.entries(info)
    .sort(([a], [b]) => Number(a) - Number(b))
    .map(([, v]) => v);
}

/**
 * 패치 버전 결정: startDtm → PatchVersion 테이블에서 매칭
 */
function resolvePatchVersion(
  startDate: Date,
  patchCache: any[]
): string | null {
  for (const p of patchCache) {
    const start = new Date(p.startDate);
    const end = p.endDate ? new Date(p.endDate) : new Date("2099-12-31");
    if (startDate >= start && startDate <= end) return p.version;
  }
  return null;
}

/**
 * 전설 등급(grade === 5) 슬롯 추출
 */
function extractLegendarySlots(
  p: Participant
): { s: number; c: number }[] {
  if (p.craftLegend <= 0) return [];

  const equipment: Record<number, number> = {
    0: p.equipment0, 1: p.equipment1, 2: p.equipment2,
    3: p.equipment3, 4: p.equipment4,
  };

  const slots: { s: number; c: number }[] = [];
  for (const [slot, grade] of Object.entries(p.equipmentGrade)) {
    if (grade === 5 && equipment[Number(slot)]) {
      slots.push({ s: Number(slot), c: equipment[Number(slot)] });
    }
  }
  return slots;
}

// ── 게임 1건 파싱 (순수 함수, DB 호출 없음) ─────────────

function parseGameData(
  gameDetail: any,
  patchCache: any[],
  rank1000MMR: number | null,
  isForward: boolean
): ParsedGame | null | "RECENT" {
  const userGames = gameDetail?.userGames;
  if (!Array.isArray(userGames) || userGames.length === 0) return null;

  const first = userGames[0];
  if (first.matchingMode !== 3) return null; // 랭크만

  const startDtm = first.startDtm || gameDetail.startDtm;
  const startDate = parseBserDate(startDtm);
  if (!startDate) return null;

  // 최근 1시간 이내 게임 → forward 중단 시그널
  if (isForward && Date.now() - startDate.getTime() < STABLE_DELAY_MS) {
    return "RECENT";
  }

  const patchVersion = resolvePatchVersion(startDate, patchCache);
  if (!patchVersion) return null;

  // 참가자 파싱
  const participants = userGames
    .map(extractParticipant)
    .filter((p): p is Participant => p !== null);

  if (participants.length === 0) return null;

  // ── 참가자 JSONB 페이로드 ──
  const pData = participants.map((p) => {
    const tiers = getCollectableTiers(p.mmrBefore, rank1000MMR);
    if (tiers.length === 0) return null;

    return {
      gid: p.gameId,
      tn: p.teamNumber,
      cn: p.characterNum,
      bw: p.bestWeapon,
      gr: p.gameRank,
      pk: p.playerKill,
      pa: p.playerAssistant,
      cl: p.characterLevel,
      eq0: p.equipment0,
      eq1: p.equipment1,
      eq2: p.equipment2,
      eq3: p.equipment3,
      eq4: p.equipment4,
      eg: p.equipmentGrade,
      cfl: p.craftLegend,
      tfc: p.traitFirstCore,
      fs: p.traitFirstSub,
      ss: p.traitSecondSub,
      so: skillOrderToArray(p.skillOrderInfo),
      soi: p.skillOrderInfo,
      sli: p.skillLevelInfo,
      rid: p.routeIdOfStart || null,
      pos: p.placeOfStart || null,
      mb: p.mmrBefore,
      ma: p.mmrAfter,
      rkp: p.rankPoint,
      vic: p.victory,
      dur: p.duration,
      tiers,
      mt: tiers[tiers.length - 1],
      ls: extractLegendarySlots(p),
      sa: startDate.toISOString(), // v2.2: 참가자별 started_at
    };
  }).filter(Boolean);

  if (pData.length === 0) return null;

  // ── 팀별 3인 조합 구성 ──
  const teams = new Map<number, Participant[]>();
  for (const p of participants) {
    const team = teams.get(p.teamNumber) || [];
    team.push(p);
    teams.set(p.teamNumber, team);
  }

  const trios: any[] = [];
  for (const [, teamMembers] of teams) {
    if (teamMembers.length !== 3) continue;

    const tierSets = teamMembers.map((m) =>
      getCollectableTiers(m.mmrBefore, rank1000MMR)
    );
    const commonTiers = tierSets[0].filter(
      (t) => tierSets[1].includes(t) && tierSets[2].includes(t)
    );
    if (commonTiers.length === 0) continue;

    const sorted = [...teamMembers].sort((a, b) => a.characterNum - b.characterNum);
    const avgRP = teamMembers.reduce((s, m) => s + (m.mmrAfter - m.mmrBefore), 0) / 3;
    const hasWeapons = teamMembers.every((m) => m.bestWeapon > 0);

    trios.push({
      c1: sorted[0].characterNum,
      c2: sorted[1].characterNum,
      c3: sorted[2].characterNum,
      k1: sorted[0].traitFirstCore || 0,
      k2: sorted[1].traitFirstCore || 0,
      k3: sorted[2].traitFirstCore || 0,
      w1: sorted[0].bestWeapon,
      w2: sorted[1].bestWeapon,
      w3: sorted[2].bestWeapon,
      gr: sorted[0].gameRank,
      rp: avgRP,
      hw: hasWeapons,
      tiers: commonTiers,
    });
  }

  return { patchVersion, participants: pData, trios };
}

// ── 배치 RPC 호출 ────────────────────────────────────────

async function flushBatchRPC(
  supabase: any,
  byPatch: Map<string, { participants: any[]; trios: any[] }>,
  isForward: boolean
): Promise<{ ok: number; fail: number }> {
  let totalOk = 0;
  let totalFail = 0;

  for (const [patchVersion, data] of byPatch) {
    const rpcPayload = {
      patch_version: patchVersion,
      is_forward: isForward,
      participants: data.participants,
      trios: data.trios,
    };

    // v2_ 테이블 (메인)
    const { data: v2Result, error: v2Error } = await supabase.rpc("process_game_v2", {
      p_data: rpcPayload,
    });

    if (v2Error) {
      console.error(`[Bulk v2] RPC error (patch=${patchVersion}):`, v2Error.message);
      totalFail += data.participants.length;
    } else {
      totalOk += v2Result?.ok ?? 0;
      totalFail += v2Result?.fail ?? 0;
      if (v2Result?.fail > 0) {
        console.warn(`[Bulk v2] partial: ok=${v2Result.ok}, fail=${v2Result.fail}`, v2Result.errors);
      }
    }

    // old 테이블 쓰기 제거 — 프론트엔드가 v2_ 테이블만 사용
  }

  return { ok: totalOk, fail: totalFail };
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

    const oldForwardStatus = statuses?.find((s: any) => s.worker_type === "forward");
    let forward2Status = statuses?.find((s: any) => s.worker_type === "forward2");
    let gapBackfillStatus = statuses?.find((s: any) => s.worker_type === "gap_backfill");
    let backfillStatus = statuses?.find((s: any) => s.worker_type === "backfill");

    // 기존 forward의 마지막 위치 (gap_backfill 목표선)
    const oldForwardGameNumber = oldForwardStatus?.last_game_number ?? 0;
    if (oldForwardGameNumber > 0) {
      console.log(`[Collect] 기존 forward 위치: ${oldForwardGameNumber} (gap_backfill 목표선)`);
    }

    // forward2 워커 초기화
    if (!forward2Status) {
      const { data } = await supabase
        .from("v2_CollectionStatus")
        .insert({
          worker_type: "forward2",
          last_game_number: FORWARD2_START_GAME,
          current_patch_version: currentPatch,
          status: "active",
        })
        .select()
        .single();
      forward2Status = data;
      console.log(`[Collect] forward2 워커 초기화: gameNumber=${FORWARD2_START_GAME}`);
    }

    // gap_backfill 워커 초기화 (58540099 → 기존 forward 위치까지 역방향)
    if (!gapBackfillStatus) {
      const { data } = await supabase
        .from("v2_CollectionStatus")
        .insert({
          worker_type: "gap_backfill",
          last_game_number: FORWARD2_START_GAME,
          current_patch_version: currentPatch,
          status: oldForwardGameNumber > 0 ? "active" : "completed",
        })
        .select()
        .single();
      gapBackfillStatus = data;
      console.log(`[Collect] gap_backfill 워커 초기화: gameNumber=${FORWARD2_START_GAME}, 목표=${oldForwardGameNumber}`);
    }

    // ── 4b. Forward2 워커 (58540099부터 → v2_, 메인) ────
    let forward2Collected = 0;
    let forward2Skipped = 0;
    let forward2Failed = 0;
    let forward2HitRecent = false;
    let forward2RemainingMs = 0;

    if (forward2Status?.status === "active") {
      const forward2StartMs = Date.now();
      const fromGame = (forward2Status.last_game_number ?? FORWARD2_START_GAME) + 1;
      console.log(`[Forward2] 시작: gameNumber=${fromGame}`);

      const { games, lastGameNumber } = await fetchGamesForward(
        fromGame,
        BATCH_LIMIT,
        FORWARD2_BUDGET_MS
      );

      const byPatch = new Map<string, { participants: any[]; trios: any[] }>();

      for (const game of games) {
        try {
          const parsed = parseGameData(game, patchCache, rank1000MMR, true);
          if (parsed === "RECENT") {
            forward2HitRecent = true;
            forward2RemainingMs = FORWARD2_BUDGET_MS - (Date.now() - forward2StartMs);
            console.log(`[Forward2] 최근 1시간 이내 게임 도달, 남은 ${Math.round(forward2RemainingMs / 1000)}초를 백필에 전환`);
            break;
          }
          if (parsed) {
            const group = byPatch.get(parsed.patchVersion) || { participants: [], trios: [] };
            group.participants.push(...parsed.participants);
            group.trios.push(...parsed.trios);
            byPatch.set(parsed.patchVersion, group);
            forward2Collected++;
          } else {
            forward2Skipped++;
          }
        } catch (e) {
          forward2Failed++;
          console.error("[Forward2] parseGameData error:", e);
        }
      }

      if (byPatch.size > 0) {
        console.log(`[Forward2] 배치 RPC: ${byPatch.size}개 패치, 총 ${[...byPatch.values()].reduce((s, g) => s + g.participants.length, 0)}명 참가자`);
        const { fail } = await flushBatchRPC(supabase, byPatch, true);
        forward2Failed += fail;
      }

      await supabase
        .from("v2_CollectionStatus")
        .update({
          last_game_number: lastGameNumber,
          last_game_id: String(lastGameNumber),
          current_patch_version: currentPatch,
          total_collected: (forward2Status.total_collected ?? 0) + forward2Collected,
          total_skipped: (forward2Status.total_skipped ?? 0) + forward2Skipped,
          consecutive_failures: forward2Failed > 0 ? (forward2Status.consecutive_failures ?? 0) + forward2Failed : 0,
          updated_at: new Date().toISOString(),
        })
        .eq("worker_type", "forward2");

      console.log(`[Forward2] 완료: collected=${forward2Collected}, skipped=${forward2Skipped}, failed=${forward2Failed}, lastGame=${lastGameNumber}, hitRecent=${forward2HitRecent}`);
    }

    // ── 5. Backfill (forward2 잔여 시간에만 실행) ──────
    let backfillCollected = 0;
    let backfillSkipped = 0;
    let backfillFailed = 0;
    let backfillPhase = "";

    const backfillTotalBudgetMs = forward2HitRecent
      ? BACKFILL_BUDGET_MS + Math.max(0, forward2RemainingMs)
      : 0;

    if (backfillTotalBudgetMs > 0) {
      // Phase 1: gap_backfill (58540099 → 기존 forward 위치)
      if (gapBackfillStatus?.status === "active" && oldForwardGameNumber > 0) {
        backfillPhase = "gap";
        const beforeGame = gapBackfillStatus.last_game_number ?? FORWARD2_START_GAME;
        console.log(`[GapBackfill] 시작: ${beforeGame} → 목표 ${oldForwardGameNumber}, budget=${Math.round(backfillTotalBudgetMs / 1000)}초`);

        if (beforeGame <= oldForwardGameNumber) {
          // 갭 채우기 완료
          await supabase
            .from("v2_CollectionStatus")
            .update({ status: "completed", updated_at: new Date().toISOString() })
            .eq("worker_type", "gap_backfill");
          console.log("[GapBackfill] 완료: 기존 forward 위치 도달");
        } else {
          const { games, lastGameNumber } = await fetchGamesBackward(
            beforeGame,
            BATCH_LIMIT,
            backfillTotalBudgetMs
          );

          const byPatch = new Map<string, { participants: any[]; trios: any[] }>();
          for (const game of games) {
            try {
              const parsed = parseGameData(game, patchCache, rank1000MMR, false);
              if (parsed) {
                const group = byPatch.get(parsed.patchVersion) || { participants: [], trios: [] };
                group.participants.push(...parsed.participants);
                group.trios.push(...parsed.trios);
                byPatch.set(parsed.patchVersion, group);
                backfillCollected++;
              } else {
                backfillSkipped++;
              }
            } catch (e) {
              backfillFailed++;
              console.error("[GapBackfill] parseGameData error:", e);
            }
          }

          if (byPatch.size > 0) {
            console.log(`[GapBackfill] 배치 RPC: ${byPatch.size}개 패치, 총 ${[...byPatch.values()].reduce((s, g) => s + g.participants.length, 0)}명 참가자`);
            const { fail } = await flushBatchRPC(supabase, byPatch, false);
            backfillFailed += fail;
          }

          // 목표 도달 체크
          const reachedTarget = lastGameNumber <= oldForwardGameNumber;
          await supabase
            .from("v2_CollectionStatus")
            .update({
              last_game_number: lastGameNumber,
              last_game_id: String(lastGameNumber),
              current_patch_version: currentPatch,
              total_collected: (gapBackfillStatus.total_collected ?? 0) + backfillCollected,
              total_skipped: (gapBackfillStatus.total_skipped ?? 0) + backfillSkipped,
              consecutive_failures: backfillFailed > 0 ? (gapBackfillStatus.consecutive_failures ?? 0) + backfillFailed : 0,
              status: reachedTarget ? "completed" : "active",
              updated_at: new Date().toISOString(),
            })
            .eq("worker_type", "gap_backfill");

          console.log(`[GapBackfill] 완료: collected=${backfillCollected}, lastGame=${lastGameNumber}, 목표도달=${reachedTarget}`);
        }
      }
      // Phase 2: 기존 backfill (gap 완료 후, 기존 위치에서 계속 역방향)
      else if (backfillStatus?.status === "active") {
        backfillPhase = "deep";
        const beforeGame = backfillStatus.last_game_number ?? 0;
        console.log(`[Backfill] Deep 시작: beforeGameNumber=${beforeGame}, budget=${Math.round(backfillTotalBudgetMs / 1000)}초`);

        if (beforeGame <= 1) {
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

          const byPatch = new Map<string, { participants: any[]; trios: any[] }>();
          for (const game of games) {
            try {
              const parsed = parseGameData(game, patchCache, rank1000MMR, false);
              if (parsed) {
                const group = byPatch.get(parsed.patchVersion) || { participants: [], trios: [] };
                group.participants.push(...parsed.participants);
                group.trios.push(...parsed.trios);
                byPatch.set(parsed.patchVersion, group);
                backfillCollected++;
              } else {
                backfillSkipped++;
              }
            } catch (e) {
              backfillFailed++;
              console.error("[Backfill] parseGameData error:", e);
            }
          }

          if (byPatch.size > 0) {
            console.log(`[Backfill] 배치 RPC: ${byPatch.size}개 패치, 총 ${[...byPatch.values()].reduce((s, g) => s + g.participants.length, 0)}명 참가자`);
            const { fail } = await flushBatchRPC(supabase, byPatch, false);
            backfillFailed += fail;
          }

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

          console.log(`[Backfill] Deep 완료: collected=${backfillCollected}, lastGame=${lastGameNumber}`);
        }
      }
    }

    // ── 6. 결과 반환 ────────────────────────────────────
    const totalTime = ((Date.now() - startTime) / 1000).toFixed(1);
    const result = {
      success: true,
      totalTime: `${totalTime}s`,
      currentPatch,
      rank1000MMR,
      forward2: {
        collected: forward2Collected,
        skipped: forward2Skipped,
        failed: forward2Failed,
      },
      backfill: {
        phase: backfillPhase || "skipped",
        collected: backfillCollected,
        skipped: backfillSkipped,
        failed: backfillFailed,
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
