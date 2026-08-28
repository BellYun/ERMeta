/**
 * ER&GG v2.2 수집 Edge Function
 *
 * pg_cron으로 3분마다 호출.
 * forward worker: 신규 게임 → old + v2_
 *
 * v2.2: BULK RPC 최적화
 *   - 게임당 1 RPC → 사이클당 1~2 RPC (패치버전별 그룹)
 *   - WAL fsync 120~180회 → 1~4회 (트랜잭션 수 98% 감소)
 *   - parseGameData() 순수 함수 분리 → 축적 후 배치 RPC
 */

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createSupabaseClient } from "../_shared/supabase.ts";
import {
  fetchGame,
  fetchTopRanks,
} from "../_shared/bser-api.ts";
import {
  getCollectableTiers,
  MIN_COLLECT_MMR,
  MIN_COLLECT_TIER,
} from "../_shared/tier-utils.ts";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// ── 상수 ──────────────────────────────────────────────────
const SEASON_ID = 41;
const TEAM_MODE = 3; // 스쿼드
const FORWARD_BUDGET_MS = 135_000; // forward 최대 (RECENT 도달 시 즉시 중단)
const FORWARD_START_GAME = 58540099;
const BATCH_LIMIT = 150;
const STABLE_DELAY_MS = 1 * 60 * 60 * 1000; // 최근 1시간 이내 게임은 아직 변동 가능하므로 중단

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
  tacticalSkillGroup: number;
  tacticalSkillLevel: number;
  tacticalSkillUseCount: number;
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

interface PatchVersionRow {
  version: string;
  startDate: string;
  endDate?: string | null;
  isActive?: boolean | null;
}

interface PatchInterval {
  version: string;
  start: Date;
  end: Date;
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
    tacticalSkillGroup: raw.tacticalSkillGroup ?? 0,
    tacticalSkillLevel: raw.tacticalSkillLevel ?? 0,
    tacticalSkillUseCount: raw.tacticalSkillUseCount ?? 0,
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
 * skillOrderInfo를 정렬된 스킬 순서 배열로 변환한다.
 * BSER 응답에는 실제 장착 무기 외의 무기 스킬도 포함되므로 선택 무기만 남긴다.
 */
function skillOrderToArray(
  info: Record<string, number>,
  bestWeapon: number,
): number[] {
  return Object.entries(info)
    .sort(([a], [b]) => Number(a) - Number(b))
    .map(([, v]) => v)
    .filter((skillCode) => {
      if (skillCode < 3_000_000 || skillCode >= 4_000_000) return true;

      const weaponType = Math.floor((skillCode - 3_000_000) / 1_000);
      return weaponType === bestWeapon;
    });
}

function normalizePatchVersion(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  const raw = String(value).trim();
  const match = raw.match(/(\d{1,2})\.(\d{1,2})/);
  return match ? `${Number(match[1])}.${Number(match[2])}` : null;
}

function extractGamePatchVersion(gameDetail: any): string | null {
  const first = Array.isArray(gameDetail?.userGames) ? gameDetail.userGames[0] : null;
  const sources = [
    gameDetail?.patchVersion,
    gameDetail?.patch_version,
    first?.patchVersion,
    first?.patch_version,
  ];

  for (const source of sources) {
    const normalized = normalizePatchVersion(source);
    if (normalized) return normalized;
  }

  return null;
}

function buildPatchIntervals(patchRows: PatchVersionRow[]): PatchInterval[] {
  const sorted = patchRows
    .map((patch) => ({
      version: patch.version,
      start: new Date(patch.startDate),
      explicitEnd: patch.endDate ? new Date(patch.endDate) : null,
    }))
    .filter((patch) => patch.version && !isNaN(patch.start.getTime()))
    .sort((a, b) => a.start.getTime() - b.start.getTime());

  return sorted.map((patch, index) => {
    const nextStart = sorted[index + 1]?.start ?? null;
    const explicitEnd =
      patch.explicitEnd && !isNaN(patch.explicitEnd.getTime()) ? patch.explicitEnd : null;
    const end = nextStart ?? explicitEnd ?? new Date("2099-12-31T00:00:00.000Z");
    return { version: patch.version, start: patch.start, end };
  });
}

/**
 * 패치 버전 결정:
 * 1) 게임 payload의 패치 필드가 있으면 우선 사용
 * 2) 없으면 startDtm을 PatchVersion startDate half-open interval로 매칭
 *
 * endDate가 비어 있는 과거 row가 있어도 다음 patch startDate로 닫아서 active patch 오분류를 막는다.
 */
function resolvePatchVersion(
  gameDetail: any,
  startDate: Date,
  patchIntervals: PatchInterval[]
): string | null {
  const fromPayload = extractGamePatchVersion(gameDetail);
  if (fromPayload && patchIntervals.some((patch) => patch.version === fromPayload)) {
    return fromPayload;
  }

  for (const patch of patchIntervals) {
    if (startDate >= patch.start && startDate < patch.end) return patch.version;
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
  patchIntervals: PatchInterval[],
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

  const patchVersion = resolvePatchVersion(gameDetail, startDate, patchIntervals);
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
      so: skillOrderToArray(p.skillOrderInfo, p.bestWeapon),
      soi: p.skillOrderInfo,
      sli: p.skillLevelInfo,
      ts: p.tacticalSkillGroup,
      tsl: p.tacticalSkillLevel,
      tsuc: p.tacticalSkillUseCount,
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

    const { data: tacticalResult, error: tacticalError } = await supabase.rpc(
      "process_character_tactical_batch",
      { p_data: rpcPayload },
    );

    if (tacticalError) {
      console.error(
        `[Bulk tactical] RPC error (patch=${patchVersion}):`,
        tacticalError.message,
      );
    } else if (tacticalResult?.fail > 0) {
      console.warn(
        `[Bulk tactical] partial: ok=${tacticalResult.ok}, fail=${tacticalResult.fail}`,
        tacticalResult.errors,
      );
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

    const patchIntervals = buildPatchIntervals(patchCache as PatchVersionRow[]);
    if (patchIntervals.length === 0) {
      return new Response(JSON.stringify({ error: "유효한 패치 버전 범위 없음" }), { status: 500 });
    }

    const currentPatch = patchCache.find((p: any) => p.isActive)?.version ?? patchCache[0].version;
    console.log(`[Collect] 현재 패치: ${currentPatch}, 총 ${patchCache.length}개`);
    console.log(`[Collect] 수집 기준: ${MIN_COLLECT_TIER} 이상 (MMR ${MIN_COLLECT_MMR}+)`);

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

    let forwardStatus =
      statuses?.find((s: any) => s.worker_type === "forward2" && s.status === "active") ??
      statuses?.find((s: any) => s.worker_type === "forward" && s.status === "active") ??
      statuses?.find((s: any) => s.worker_type === "forward2") ??
      statuses?.find((s: any) => s.worker_type === "forward");

    if (!forwardStatus) {
      const { data } = await supabase
        .from("v2_CollectionStatus")
        .insert({
          worker_type: "forward",
          last_game_number: FORWARD_START_GAME,
          current_patch_version: currentPatch,
          status: "active",
        })
        .select()
        .single();
      forwardStatus = data;
      console.log(`[Forward] 워커 초기화: gameNumber=${FORWARD_START_GAME}`);
    }

    const forwardWorkerType = forwardStatus?.worker_type ?? "forward";

    // ── 4. Forward 워커 (신규 게임 → v2_) ─────────────────
    let forwardCollected = 0;
    let forwardSkipped = 0;
    let forwardFailed = 0;
    let forwardHitRecent = false;

    if (forwardStatus?.status === "active") {
      const forwardStartMs = Date.now();
      let currentGame = (forwardStatus.last_game_number ?? FORWARD_START_GAME) + 1;
      console.log(`[Forward] 시작: worker=${forwardWorkerType}, gameNumber=${currentGame}`);

      const byPatch = new Map<string, { participants: any[]; trios: any[] }>();
      let lastGameNumber = currentGame - 1;

      for (let i = 0; i < BATCH_LIMIT; i++) {
        if (Date.now() - forwardStartMs >= FORWARD_BUDGET_MS) break;

        try {
          const game = await fetchGame(currentGame);
          if (game !== null) {
            const parsed = parseGameData(game, patchIntervals, rank1000MMR, true);
            if (parsed === "RECENT") {
              forwardHitRecent = true;
              // 아직 안정화되지 않은 현재 게임은 처리 완료로 기록하지 않는다.
              // 직전 번호까지만 저장해야 다음 실행도 currentGame부터 다시 탐색한다.
              lastGameNumber = currentGame - 1;
              console.log(
                `[Forward] 최근 1시간 이내 게임 도달: gameNumber=${currentGame}, 다음 실행도 동일 번호부터 재탐색`
              );
              break;
            }
            if (parsed) {
              const group = byPatch.get(parsed.patchVersion) || { participants: [], trios: [] };
              group.participants.push(...parsed.participants);
              group.trios.push(...parsed.trios);
              byPatch.set(parsed.patchVersion, group);
              forwardCollected++;
            } else {
              forwardSkipped++;
            }
          }
        } catch (e) {
          forwardFailed++;
          console.error("[Forward] parseGameData error:", e);
        }

        lastGameNumber = currentGame;
        currentGame++;
        await sleep(1000); // rate limit 1req/s
      }

      if (byPatch.size > 0) {
        console.log(`[Forward] 배치 RPC: ${byPatch.size}개 패치, 총 ${[...byPatch.values()].reduce((s, g) => s + g.participants.length, 0)}명 참가자`);
        const { fail } = await flushBatchRPC(supabase, byPatch, true);
        forwardFailed += fail;
      }

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
        .eq("worker_type", forwardWorkerType);

      console.log(`[Forward] 완료: collected=${forwardCollected}, skipped=${forwardSkipped}, failed=${forwardFailed}, lastGame=${lastGameNumber}, hitRecent=${forwardHitRecent}`);
    }

    // ── 5. 결과 반환 ────────────────────────────────────
    const totalTime = ((Date.now() - startTime) / 1000).toFixed(1);
    const result = {
      success: true,
      totalTime: `${totalTime}s`,
      currentPatch,
      collectionTier: {
        minimum: MIN_COLLECT_TIER,
        minMMR: MIN_COLLECT_MMR,
      },
      rank1000MMR,
      forward: {
        collected: forwardCollected,
        skipped: forwardSkipped,
        failed: forwardFailed,
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
