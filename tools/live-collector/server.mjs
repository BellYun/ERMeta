#!/usr/bin/env node
/**
 * ER&GG Worker A: 13.2 실시간 수집 + 원본 압축 + 단일 캐릭터 로컬 선집계 + Supabase 주기별 스냅샷 UPSERT
 *
 * - 1 RPS (1000ms 간격): 당일 실시간 랭크 매치 100% 추적
 * - 로컬 누적 집계: 단일 캐릭터 통계(기본 800~1,200행, 상세 2,000~4,000행)만 메모리 및 체크포인트에 보관
 * - 1시간 주기 업로드: v2_CharacterStats 단일 배치 UPSERT (0.2초 컷)
 * - 6시간 주기 업로드: v2_CharacterEquipmentBuildStats, v2_CharacterTraitBuildStats 등 (totalGames >= 3 컷, 청크 UPSERT)
 * - 웹 대시보드 제공: http://127.0.0.1:4320
 */

import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "../..");

const PORT = Number(process.env.PORT || 4320);
const HOST = process.env.HOST || "127.0.0.1";
const TARGET_PATCH = process.env.TARGET_PATCH || "13.2";
const DATA_DIR = path.resolve(process.env.DATA_DIR || path.join(__dirname, "data"));
const RAW_DIR = path.join(DATA_DIR, "raw", TARGET_PATCH);
const ACTIVE_DIR = path.join(DATA_DIR, "active");
const STATE_FILE = path.join(DATA_DIR, "state.json");
const STATS_CHECKPOINT_FILE = path.join(DATA_DIR, "stats_checkpoint.json");

const DEFAULT_START_GAME_ID = Number(process.env.START_GAME_ID || 68500000);
const INTERVAL_MS = Math.max(50, Number(process.env.INTERVAL_MS || 1000));
const CHUNK_SIZE = Math.max(10, Number(process.env.CHUNK_SIZE || 500));
const MAX_CONSECUTIVE_404 = Number(process.env.MAX_CONSECUTIVE_404 || 60);
const AUTO_START = process.env.AUTO_START === "1" || process.argv.includes("--auto-start");

const UPLOAD_1H_INTERVAL_MS = Number(process.env.UPLOAD_1H_INTERVAL_MS || 3600_000);
const UPLOAD_6H_INTERVAL_MS = Number(process.env.UPLOAD_6H_INTERVAL_MS || 21600_000);
const DETAIL_MIN_GAMES = Number(process.env.DETAIL_MIN_GAMES || 3);
const SETTLE_SECONDS = Number(process.env.SETTLE_SECONDS || 3600); // 경기 시작 후 1시간(3600초) 지난 확정 매치만 수집

const BASE_URL = "https://open-api.bser.io/v1";

// ── 환경변수 자동 로드 ───────────────────────────────────────────
function findEnvValue(key) {
  if (process.env[key]) return process.env[key].trim();
  const candidates = [
    path.join(__dirname, ".env"),
    path.join(REPO_ROOT, "backend", ".env"),
    path.join(REPO_ROOT, "frontend", ".env"),
  ];
  const regex = new RegExp(`^\\s*${key}\\s*=\\s*(.+)\\s*$`, "m");
  for (const envPath of candidates) {
    if (!fs.existsSync(envPath)) continue;
    const raw = fs.readFileSync(envPath, "utf8");
    const match = raw.match(regex);
    if (match) {
      return match[1].trim().replace(/^["']|["']$/g, "");
    }
  }
  return "";
}

const BSER_API_KEY = findEnvValue("BSER_API_KEY");
const SUPABASE_URL = findEnvValue("NEXT_PUBLIC_SUPABASE_URL") || findEnvValue("SUPABASE_URL");
const SUPABASE_KEY = findEnvValue("SUPABASE_SERVICE_ROLE_KEY") || findEnvValue("SUPABASE_KEY") || findEnvValue("NEXT_PUBLIC_SUPABASE_ANON_KEY");

if (!BSER_API_KEY) {
  console.warn("⚠️  BSER_API_KEY를 찾을 수 없습니다. .env에 설정해 주세요.");
}
if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.warn("⚠️  Supabase URL/KEY가 설정되지 않았습니다. 원격 업로드가 비활성화됩니다.");
}

function ensureDirs() {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.mkdirSync(RAW_DIR, { recursive: true });
  fs.mkdirSync(ACTIVE_DIR, { recursive: true });
}

// ── 티어 분류 ───────────────────────────────────────────────────
function getTierFromMMR(mmr) {
  if (typeof mmr !== "number" || mmr < 5000) return null;
  if (mmr < 6400) return "DIAMOND";
  if (mmr < 7600) return "METEORITE";
  return "MITHRIL";
}

// ── 통계 누적기 (Local Single-Character Accumulator) ─────────────
class StatsAccumulator {
  constructor() {
    this.characterStats = new Map(); // key -> { characterNum, bestWeapon, tier, patchVersion, totalGames, totalWins, totalTop3, totalRP, rankSum }
    this.equipmentBuilds = new Map(); // key -> { characterNum, mainCore, weapon, chest, head, arm, leg, tier, patchVersion, totalGames, totalWins, rankSum, totalRP }
    this.traitBuilds = new Map(); // key -> { characterNum, mainCore, sub1, sub2, sub3, sub4, optionTrait1..4, bestWeapon, tier, patchVersion, totalGames, totalWins }
    this.skillOrders = new Map(); // key -> { character_num, best_weapon, main_core, skill_order, tier, patch_version, total_games, total_wins }
    this.startRoutes = new Map(); // key -> { character_num, best_weapon, route_id, place_of_start, tier, patch_version, total_games, total_wins, rank_sum }
    this.tacticalStats = new Map(); // key -> { character_num, best_weapon, tactical_skill_group, tier, patch_version, total_games, total_wins, rank_sum }
    this.totalGamesProcessed = 0;
  }

  recordMatch(data) {
    if (!data?.userGames || !Array.isArray(data.userGames)) return;
    this.totalGamesProcessed += 1;

    for (const player of data.userGames) {
      if (player.matchingMode !== 3) continue;

      const mmr = typeof player.mmrBefore === "number" && player.mmrBefore > 0
        ? player.mmrBefore
        : player.mmrAfter;
      const tier = getTierFromMMR(mmr);
      if (!tier) continue; // 다이아몬드 미만 필터링

      const charNum = Number(player.characterNum);
      const weapon = Number(player.bestWeapon);
      const rank = Number(player.gameRank) || 8;
      const isWin = rank === 1 ? 1 : 0;
      const isTop3 = rank <= 3 ? 1 : 0;
      const rp = Number(player.mmrGain ?? player.rankPoint ?? 0);
      const mainCore = Number(player.traitFirstCore || 0);

      // 1. 기본 캐릭터 통계 (v2_CharacterStats)
      const csKey = `${charNum}|${weapon}|${tier}|${TARGET_PATCH}`;
      let cs = this.characterStats.get(csKey);
      if (!cs) {
        cs = {
          characterNum: charNum,
          bestWeapon: weapon,
          totalGames: 0,
          totalWins: 0,
          totalRP: 0,
          totalTop3: 0,
          rankSum: 0,
          tier,
          patchVersion: TARGET_PATCH,
        };
        this.characterStats.set(csKey, cs);
      }
      cs.totalGames += 1;
      cs.totalWins += isWin;
      cs.totalTop3 += isTop3;
      cs.totalRP += rp;
      cs.rankSum += rank;

      // 2. 장비 빌드 통계 (v2_CharacterEquipmentBuildStats)
      const eq = player.equipment || {};
      const eqWep = Number(eq["0"] || 0);
      const eqChest = Number(eq["1"] || 0);
      const eqHead = Number(eq["2"] || 0);
      const eqArm = Number(eq["3"] || 0);
      const eqLeg = Number(eq["4"] || 0);

      if (eqWep && eqChest && eqHead && eqArm && eqLeg) {
        const eqKey = `${charNum}|${mainCore}|${eqWep}|${eqChest}|${eqHead}|${eqArm}|${eqLeg}|${tier}|${TARGET_PATCH}`;
        let eb = this.equipmentBuilds.get(eqKey);
        if (!eb) {
          eb = {
            characterNum: charNum,
            mainCore,
            weapon: eqWep,
            chest: eqChest,
            head: eqHead,
            arm: eqArm,
            leg: eqLeg,
            totalGames: 0,
            totalWins: 0,
            rankSum: 0,
            totalRP: 0,
            tier,
            patchVersion: TARGET_PATCH,
          };
          this.equipmentBuilds.set(eqKey, eb);
        }
        eb.totalGames += 1;
        eb.totalWins += isWin;
        eb.rankSum += rank;
        eb.totalRP += rp;
      }

      // 3. 특성 빌드 통계 (v2_CharacterTraitBuildStats)
      const sub1 = Number(player.traitFirstSub?.[0] || 0);
      const sub2 = Number(player.traitFirstSub?.[1] || 0);
      const sub3 = Number(player.traitSecondSub?.[0] || 0);
      const sub4 = Number(player.traitSecondSub?.[1] || 0);
      if (mainCore) {
        const tbKey = `${charNum}|${mainCore}|${sub1}|${sub2}|${sub3}|${sub4}|${weapon}|${tier}|${TARGET_PATCH}`;
        let tb = this.traitBuilds.get(tbKey);
        if (!tb) {
          tb = {
            characterNum: charNum,
            mainCore,
            sub1,
            sub2,
            sub3,
            sub4,
            optionTrait1: 0,
            optionTrait2: 0,
            optionTrait3: 0,
            optionTrait4: 0,
            totalGames: 0,
            totalWins: 0,
            bestWeapon: weapon,
            tier,
            patchVersion: TARGET_PATCH,
          };
          this.traitBuilds.set(tbKey, tb);
        }
        tb.totalGames += 1;
        tb.totalWins += isWin;
      }

      // 4. 스킬 순서 통계 (v2_CharacterSkillOrder)
      let skillList = [];
      if (player.skillLevelInfo && typeof player.skillLevelInfo === "object") {
        skillList = Object.keys(player.skillLevelInfo).map(Number).sort((a, b) => (player.skillLevelInfo[b] || 0) - (player.skillLevelInfo[a] || 0));
      }
      if (skillList.length > 0) {
        const skillKey = `${charNum}|${weapon}|${mainCore}|${skillList.slice(0, 5).join(",")}|${tier}|${TARGET_PATCH}`;
        let so = this.skillOrders.get(skillKey);
        if (!so) {
          so = {
            character_num: charNum,
            best_weapon: weapon,
            main_core: mainCore,
            skill_order: skillList.slice(0, 5),
            total_games: 0,
            total_wins: 0,
            tier,
            patch_version: TARGET_PATCH,
          };
          this.skillOrders.set(skillKey, so);
        }
        so.total_games += 1;
        so.total_wins += isWin;
      }

      // 5. 시작 루트 통계 (v2_CharacterStartRoute)
      const routeId = Number(player.routeIdOfStart || 0);
      const placeOfStart = String(player.placeOfStart || "");
      if (routeId) {
        const srKey = `${charNum}|${weapon}|${routeId}|${tier}|${TARGET_PATCH}`;
        let sr = this.startRoutes.get(srKey);
        if (!sr) {
          sr = {
            character_num: charNum,
            best_weapon: weapon,
            route_id: routeId,
            place_of_start: placeOfStart,
            total_games: 0,
            total_wins: 0,
            rank_sum: 0,
            tier,
            patch_version: TARGET_PATCH,
          };
          this.startRoutes.set(srKey, sr);
        }
        sr.total_games += 1;
        sr.total_wins += isWin;
        sr.rank_sum += rank;
      }

      // 6. 전술 스킬 통계 (v2_CharacterTacticalStats)
      const tac = Number(player.tacticalSkillGroup || 0);
      if (tac) {
        const tacKey = `${charNum}|${weapon}|${tac}|${tier}|${TARGET_PATCH}`;
        let ts = this.tacticalStats.get(tacKey);
        if (!ts) {
          ts = {
            character_num: charNum,
            best_weapon: weapon,
            tactical_skill_group: tac,
            total_games: 0,
            total_wins: 0,
            rank_sum: 0,
            tier,
            patch_version: TARGET_PATCH,
          };
          this.tacticalStats.set(tacKey, ts);
        }
        ts.total_games += 1;
        ts.total_wins += isWin;
        ts.rank_sum += rank;
      }
    }
  }

  saveCheckpoint() {
    const serialized = {
      totalGamesProcessed: this.totalGamesProcessed,
      characterStats: Array.from(this.characterStats.entries()),
      equipmentBuilds: Array.from(this.equipmentBuilds.entries()),
      traitBuilds: Array.from(this.traitBuilds.entries()),
      skillOrders: Array.from(this.skillOrders.entries()),
      startRoutes: Array.from(this.startRoutes.entries()),
      tacticalStats: Array.from(this.tacticalStats.entries()),
      updatedAt: new Date().toISOString(),
    };
    const tmp = `${STATS_CHECKPOINT_FILE}.tmp`;
    fs.writeFileSync(tmp, JSON.stringify(serialized));
    fs.renameSync(tmp, STATS_CHECKPOINT_FILE);
  }

  loadCheckpoint() {
    if (!fs.existsSync(STATS_CHECKPOINT_FILE)) return;
    try {
      const data = JSON.parse(fs.readFileSync(STATS_CHECKPOINT_FILE, "utf8"));
      this.totalGamesProcessed = data.totalGamesProcessed || 0;
      this.characterStats = new Map(data.characterStats || []);
      this.equipmentBuilds = new Map(data.equipmentBuilds || []);
      this.traitBuilds = new Map(data.traitBuilds || []);
      this.skillOrders = new Map(data.skillOrders || []);
      this.startRoutes = new Map(data.startRoutes || []);
      this.tacticalStats = new Map(data.tacticalStats || []);
      console.log(`[stats] checkpoint loaded: ${this.characterStats.size} char rows, ${this.equipmentBuilds.size} equip rows`);
    } catch (e) {
      console.error("[stats] checkpoint load error:", e.message);
    }
  }

  getCompiledCharacterStats() {
    return Array.from(this.characterStats.values()).map((row) => ({
      characterNum: row.characterNum,
      bestWeapon: row.bestWeapon,
      totalGames: row.totalGames,
      totalWins: row.totalWins,
      totalRP: Math.round(row.totalRP),
      totalTop3: row.totalTop3,
      averageRank: row.totalGames > 0 ? Number((row.rankSum / row.totalGames).toFixed(2)) : 0,
      tier: row.tier,
      patchVersion: row.patchVersion,
    }));
  }

  getCompiledEquipmentBuilds(minGames = DETAIL_MIN_GAMES) {
    return Array.from(this.equipmentBuilds.values())
      .filter((r) => r.totalGames >= minGames)
      .map((row) => ({
        characterNum: row.characterNum,
        mainCore: row.mainCore,
        weapon: row.weapon,
        chest: row.chest,
        head: row.head,
        arm: row.arm,
        leg: row.leg,
        totalGames: row.totalGames,
        totalWins: row.totalWins,
        rankSum: row.rankSum,
        totalRP: Math.round(row.totalRP),
        tier: row.tier,
        patchVersion: row.patchVersion,
      }));
  }

  getCompiledTraitBuilds(minGames = DETAIL_MIN_GAMES) {
    return Array.from(this.traitBuilds.values())
      .filter((r) => r.totalGames >= minGames)
      .map((row) => ({
        characterNum: row.characterNum,
        mainCore: row.mainCore,
        sub1: row.sub1,
        sub2: row.sub2,
        sub3: row.sub3,
        sub4: row.sub4,
        optionTrait1: row.optionTrait1,
        optionTrait2: row.optionTrait2,
        optionTrait3: row.optionTrait3,
        optionTrait4: row.optionTrait4,
        totalGames: row.totalGames,
        totalWins: row.totalWins,
        bestWeapon: row.bestWeapon,
        tier: row.tier,
        patchVersion: row.patchVersion,
      }));
  }

  getCompiledSkillOrders(minGames = DETAIL_MIN_GAMES) {
    return Array.from(this.skillOrders.values())
      .filter((r) => r.total_games >= minGames);
  }

  getCompiledStartRoutes(minGames = DETAIL_MIN_GAMES) {
    return Array.from(this.startRoutes.values())
      .filter((r) => r.total_games >= minGames);
  }

  getCompiledTacticalStats(minGames = DETAIL_MIN_GAMES) {
    return Array.from(this.tacticalStats.values())
      .filter((r) => r.total_games >= minGames);
  }
}

// ── Supabase PostgREST Upsert 유틸 ──────────────────────────────
async function postgrestUpsert(table, rows, onConflict) {
  if (!SUPABASE_URL || !SUPABASE_KEY || !rows || rows.length === 0) return { ok: true, count: 0 };
  const endpoint = `${SUPABASE_URL}/rest/v1/${table}?on_conflict=${encodeURIComponent(onConflict)}`;
  const res = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      Prefer: "resolution=merge-duplicates,return=minimal",
    },
    body: JSON.stringify(rows),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Supabase upsert [${table}] HTTP ${res.status}: ${errText}`);
  }
  return { ok: true, count: rows.length };
}

async function chunkedUpsert(table, rows, onConflict, chunkSize = 500) {
  let uploaded = 0;
  for (let i = 0; i < rows.length; i += chunkSize) {
    const chunk = rows.slice(i, i + chunkSize);
    await postgrestUpsert(table, chunk, onConflict);
    uploaded += chunk.length;
    if (i + chunkSize < rows.length) {
      await sleep(200); // Free tier IO 보호
    }
  }
  return uploaded;
}

// ── 로컬 상태 관리 ─────────────────────────────────────────────
ensureDirs();
const accumulator = new StatsAccumulator();
accumulator.loadCheckpoint();

function loadState() {
  if (fs.existsSync(STATE_FILE)) {
    try {
      return JSON.parse(fs.readFileSync(STATE_FILE, "utf8"));
    } catch {}
  }
  return {
    nextGameId: DEFAULT_START_GAME_ID,
    stats: {
      fetched: 0,
      notFound: 0,
      errors: 0,
      consecutive404: 0,
      chunksArchived: 0,
    },
    last1hUpload: null,
    last6hUpload: null,
    uploadHistory: [],
    activeChunk: { minId: DEFAULT_START_GAME_ID, maxId: DEFAULT_START_GAME_ID, count: 0 },
    updatedAt: null,
  };
}

let state = loadState();

function saveState() {
  state.updatedAt = new Date().toISOString();
  const tmp = `${STATE_FILE}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(state, null, 2));
  fs.renameSync(tmp, STATE_FILE);
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ── BSER Fetch with Retry ────────────────────────────────────────
async function fetchGameWithRetry(gameId) {
  const backoff = [1500, 3000, 7000];
  for (let attempt = 0; attempt <= backoff.length; attempt++) {
    const res = await fetch(`${BASE_URL}/games/${gameId}`, {
      headers: { accept: "application/json", "x-api-key": BSER_API_KEY },
    });
    if (res.status === 404) return { status: 404, data: null };
    if (res.status === 429 && attempt < backoff.length) {
      await sleep(backoff[attempt]);
      continue;
    }
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    if (data?.code === 404 || !Array.isArray(data?.userGames) || data.userGames.length === 0) {
      return { status: 404, data: null };
    }
    return { status: 200, data };
  }
  throw new Error("429 rate limit exceeded after retries");
}

// ── 원본 압축 저장 (.ndjson.gz) ──────────────────────────────────
function archiveActiveChunk() {
  const chunk = state.activeChunk;
  const activePath = path.join(ACTIVE_DIR, `active_${TARGET_PATCH}.ndjson`);
  if (!fs.existsSync(activePath) || chunk.count === 0) return;

  const gzName = `games_${chunk.minId}_${chunk.maxId}.ndjson.gz`;
  const gzPath = path.join(RAW_DIR, gzName);
  const rawBuf = fs.readFileSync(activePath);
  fs.writeFileSync(gzPath, zlib.gzipSync(rawBuf, { level: 6 }));
  fs.unlinkSync(activePath);

  state.stats.chunksArchived += 1;
  state.activeChunk = { minId: state.nextGameId, maxId: state.nextGameId, count: 0 };
  saveState();
  console.log(`[archive] archived ${gzName} (${chunk.count} games)`);
}

function persistRawGame(gameId, data) {
  const activePath = path.join(ACTIVE_DIR, `active_${TARGET_PATCH}.ndjson`);
  const fetchedAt = new Date().toISOString();
  const record = { gameId, fetchedAt, ...data };
  fs.appendFileSync(activePath, JSON.stringify(record) + "\n");

  const chunk = state.activeChunk || { minId: gameId, maxId: gameId, count: 0 };
  chunk.minId = Math.min(chunk.minId, gameId);
  chunk.maxId = Math.max(chunk.maxId, gameId);
  chunk.count += 1;
  state.activeChunk = chunk;

  if (chunk.count >= CHUNK_SIZE) {
    archiveActiveChunk();
  }
}

// ── 주기별 Supabase 업로더 ───────────────────────────────────────
let isUploading = false;

async function execute1hUpload() {
  if (isUploading) return;
  isUploading = true;
  const start = Date.now();
  console.log(`[1h-uploader] v2_CharacterStats 스냅샷 UPSERT 시작...`);
  try {
    const rows = accumulator.getCompiledCharacterStats();
    if (rows.length === 0) {
      console.log(`[1h-uploader] 업로드할 캐릭터 데이터 없음 (수집 대기 중)`);
      return;
    }
    const { count } = await postgrestUpsert("v2_CharacterStats", rows, "characterNum,bestWeapon,tier,patchVersion");
    const elapsed = Date.now() - start;
    const msg = `v2_CharacterStats ${count}행 업로드 완료 (${elapsed}ms)`;
    console.log(`[1h-uploader] ✅ ${msg}`);
    state.last1hUpload = { time: new Date().toISOString(), count, elapsed };
    state.uploadHistory.unshift({ type: "1h", time: new Date().toISOString(), count, elapsed, ok: true });
    if (state.uploadHistory.length > 20) state.uploadHistory.pop();
    saveState();
  } catch (err) {
    console.error(`[1h-uploader] ❌ 업로드 실패:`, err.message);
    state.uploadHistory.unshift({ type: "1h", time: new Date().toISOString(), error: err.message, ok: false });
    saveState();
  } finally {
    isUploading = false;
  }
}

async function execute6hUpload() {
  if (isUploading) return;
  isUploading = true;
  const start = Date.now();
  console.log(`[6h-uploader] 상세 통계 (장비/특성/스킬/루트/전술) UPSERT 시작...`);
  const results = {};
  try {
    // 1. 장비 빌드
    const equips = accumulator.getCompiledEquipmentBuilds(DETAIL_MIN_GAMES);
    if (equips.length > 0) {
      results.equipment = await chunkedUpsert(
        "v2_CharacterEquipmentBuildStats",
        equips,
        "characterNum,mainCore,weapon,chest,head,arm,leg,tier,patchVersion",
        500
      );
    }

    // 2. 특성 빌드
    const traits = accumulator.getCompiledTraitBuilds(DETAIL_MIN_GAMES);
    if (traits.length > 0) {
      results.traits = await chunkedUpsert(
        "v2_CharacterTraitBuildStats",
        traits,
        "characterNum,mainCore,sub1,sub2,sub3,sub4,optionTrait1,optionTrait2,optionTrait3,optionTrait4,bestWeapon,tier,patchVersion",
        500
      );
    }

    // 3. 스킬 순서
    const skills = accumulator.getCompiledSkillOrders(DETAIL_MIN_GAMES);
    if (skills.length > 0) {
      results.skills = await chunkedUpsert(
        "v2_CharacterSkillOrder",
        skills,
        "character_num,best_weapon,main_core,skill_order,tier,patch_version",
        500
      );
    }

    // 4. 시작 루트
    const routes = accumulator.getCompiledStartRoutes(DETAIL_MIN_GAMES);
    if (routes.length > 0) {
      results.routes = await chunkedUpsert(
        "v2_CharacterStartRoute",
        routes,
        "character_num,best_weapon,route_id,tier,patch_version",
        500
      );
    }

    const elapsed = Date.now() - start;
    console.log(`[6h-uploader] ✅ 상세 통계 업로드 완료 (${elapsed}ms):`, results);
    state.last6hUpload = { time: new Date().toISOString(), results, elapsed };
    state.uploadHistory.unshift({ type: "6h", time: new Date().toISOString(), results, elapsed, ok: true });
    if (state.uploadHistory.length > 20) state.uploadHistory.pop();
    saveState();
  } catch (err) {
    console.error(`[6h-uploader] ❌ 상세 업로드 실패:`, err.message);
    state.uploadHistory.unshift({ type: "6h", time: new Date().toISOString(), error: err.message, ok: false });
    saveState();
  } finally {
    isUploading = false;
  }
}

// ── 워커 메인 루프 ───────────────────────────────────────────────
let running = false;
let loopPromise = null;
let lastError = null;
const startedAt = Date.now();
let last1hTimerAt = Date.now();
let last6hTimerAt = Date.now();

async function runCollectorLoop() {
  let gamesSinceCheckpoint = 0;

  while (running) {
    const gid = state.nextGameId;
    const stepStart = Date.now();

    try {
      const { status, data } = await fetchGameWithRetry(gid);
      if (status === 404) {
        state.stats.notFound += 1;
        state.stats.consecutive404 += 1;
        if (state.stats.consecutive404 >= MAX_CONSECUTIVE_404) {
          lastError = `연속 ${MAX_CONSECUTIVE_404}회 404 (gameId=${gid})로 최신 경기 대기 (15초 후 재시도)`;
          saveState();
          await sleep(15000);
          state.stats.consecutive404 = Math.floor(MAX_CONSECUTIVE_404 / 2);
          continue;
        }
      } else {
        const first = data.userGames?.[0];
        const startedAt = first?.startDtm ? Date.parse(first.startDtm) : NaN;
        const elapsedSinceStart = Date.now() - startedAt;

        // 시작한 지 1시간(SETTLE_SECONDS, 기본 3600초)이 지나지 않은 게임은 확정 대기
        if (SETTLE_SECONDS > 0 && Number.isFinite(startedAt) && elapsedSinceStart < SETTLE_SECONDS * 1000) {
          const waitMs = (SETTLE_SECONDS * 1000) - elapsedSinceStart;
          const waitMin = Math.ceil(waitMs / 60000);
          lastError = `gameId=${gid} 시작된 지 ${Math.floor(elapsedSinceStart / 60000)}분 경과. 1시간 확정 대기 중 (약 ${waitMin}분 후 수집 재개)`;
          saveState();
          await sleep(Math.min(30000, Math.max(5000, waitMs)));
          continue; // gid를 전진시키지 않고 루프 재실행!
        }

        state.stats.consecutive404 = 0;
        state.stats.fetched += 1;
        lastError = null;

        // 랭크 매치(matchingMode === 3)만 저장 & 누적
        if (first?.matchingMode === 3) {
          persistRawGame(gid, data);
          accumulator.recordMatch(data);
          gamesSinceCheckpoint += 1;

          if (gamesSinceCheckpoint >= 50) {
            accumulator.saveCheckpoint();
            gamesSinceCheckpoint = 0;
          }
        }
      }

      state.nextGameId = gid + 1;
      saveState();
    } catch (err) {
      state.stats.errors += 1;
      lastError = `${gid}: ${err.message}`;
      saveState();
      await sleep(3000);
    }

    // 1시간 / 6시간 타이머 검사
    const now = Date.now();
    if (now - last1hTimerAt >= UPLOAD_1H_INTERVAL_MS) {
      last1hTimerAt = now;
      execute1hUpload().catch(() => {});
    }
    if (now - last6hTimerAt >= UPLOAD_6H_INTERVAL_MS) {
      last6hTimerAt = now;
      execute6hUpload().catch(() => {});
    }

    const elapsed = Date.now() - stepStart;
    const waitMs = Math.max(0, INTERVAL_MS - elapsed);
    if (running && waitMs > 0) await sleep(waitMs);
  }
}

function startWorker(opts = {}) {
  if (opts.startGameId !== undefined && Number.isFinite(Number(opts.startGameId))) {
    state.nextGameId = Number(opts.startGameId);
    state.stats.consecutive404 = 0;
  }
  saveState();
  if (running) return false;
  running = true;
  lastError = null;
  loopPromise = runCollectorLoop().finally(() => {
    loopPromise = null;
  });
  return true;
}

function pauseWorker() {
  running = false;
  accumulator.saveCheckpoint();
  saveState();
}

// ── HTTP 대시보드 & 제어 API ─────────────────────────────────────
function renderDashboardHtml() {
  const uptime = Math.floor((Date.now() - startedAt) / 1000);
  const next1h = Math.max(0, Math.floor((UPLOAD_1H_INTERVAL_MS - (Date.now() - last1hTimerAt)) / 1000));
  const next6h = Math.max(0, Math.floor((UPLOAD_6H_INTERVAL_MS - (Date.now() - last6hTimerAt)) / 1000));

  return `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="utf-8">
  <title>Worker A · 13.2 실시간 수집 및 통계 업로더</title>
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #0f131d; color: #f3f4f6; margin: 0; padding: 20px; }
    .card { background: #161b26; border: 1px solid #262f40; border-radius: 8px; padding: 18px; margin-bottom: 16px; max-width: 900px; }
    h1 { font-size: 20px; color: #facc15; margin: 0 0 12px; display: flex; align-items: center; gap: 8px; }
    .badge { display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: bold; }
    .badge-on { background: #15803d; color: #dcfce7; }
    .badge-off { background: #475569; color: #f1f5f9; }
    .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 10px; margin-top: 12px; }
    .stat { background: #1d2533; padding: 10px 12px; border-radius: 6px; }
    .stat .label { font-size: 11px; color: #94a3b8; }
    .stat .val { font-size: 18px; font-weight: bold; color: #f3f4f6; margin-top: 4px; font-family: monospace; }
    .btn { background: #262f40; color: #facc15; border: 1px solid #facc15; padding: 7px 14px; border-radius: 6px; font-weight: bold; cursor: pointer; margin-right: 6px; }
    .btn:hover { background: #facc15; color: #0f131d; }
    .btn-red { border-color: #ef4444; color: #ef4444; }
    .btn-red:hover { background: #ef4444; color: #fff; }
    pre { background: #0b0e14; padding: 10px; border-radius: 6px; font-size: 11px; color: #cbd5e1; overflow-x: auto; }
  </style>
</head>
<body>
  <div class="card">
    <h1>
      Worker A: ${TARGET_PATCH} 실시간 수집 + Supabase 업로더
      <span class="badge ${running ? 'badge-on' : 'badge-off'}">${running ? 'RUNNING' : 'PAUSED'}</span>
    </h1>
    <p style="color: #94a3b8; font-size: 13px; margin: 0 0 16px;">
      1 RPS 전수 수집 + 로컬 단일 캐릭터 선집계 + 1시간/6시간 주기 Supabase 스냅샷 멱등 UPSERT (프리티어 $0 방어)
    </p>
    <div style="margin-bottom: 16px;">
      <button class="btn" onclick="post('/start')">▶ 수집 시작</button>
      <button class="btn btn-red" onclick="post('/pause')">⏸ 일시정지</button>
      <button class="btn" onclick="post('/upload-1h')">⚡ 1시간 통계 즉시 업로드</button>
      <button class="btn" onclick="post('/upload-6h')">⚡ 6시간 상세 즉시 업로드</button>
      <button class="btn" onclick="post('/flush')">📦 원본 청크 압축</button>
    </div>
    <div class="grid">
      <div class="stat"><div class="label">다음 Game ID</div><div class="val">${state.nextGameId}</div></div>
      <div class="stat"><div class="label">수집된 경기 수</div><div class="val">${state.stats.fetched}</div></div>
      <div class="stat"><div class="label">404 스킵 수</div><div class="val">${state.stats.notFound}</div></div>
      <div class="stat"><div class="label">압축 원본 청크</div><div class="val">${state.stats.chunksArchived}개</div></div>
      <div class="stat"><div class="label">캐릭터 통계 행</div><div class="val">${accumulator.characterStats.size}행</div></div>
      <div class="stat"><div class="label">장비 빌드 행</div><div class="val">${accumulator.equipmentBuilds.size}행</div></div>
      <div class="stat"><div class="label">다음 1h 업로드</div><div class="val">${next1h}초 후</div></div>
      <div class="stat"><div class="label">다음 6h 업로드</div><div class="val">${next6h}초 후</div></div>
    </div>
    ${lastError ? `<p style="color: #f87171; font-size: 12px; margin-top: 12px;">⚠️ ${lastError}</p>` : ''}
  </div>

  <div class="card">
    <h3 style="font-size: 14px; margin: 0 0 8px; color: #facc15;">최근 업로드 이력</h3>
    <pre>${JSON.stringify(state.uploadHistory || [], null, 2)}</pre>
  </div>

  <script>
    async function post(path) {
      await fetch(path, { method: 'POST' });
      setTimeout(() => location.reload(), 300);
    }
    setInterval(() => location.reload(), 3000);
  </script>
</body>
</html>`;
}

function readJsonBody(req) {
  return new Promise((resolve) => {
    let buf = "";
    req.on("data", (c) => (buf += c));
    req.on("end", () => {
      try {
        resolve(buf ? JSON.parse(buf) : {});
      } catch {
        resolve({});
      }
    });
  });
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url || "/", `http://${HOST}:${PORT}`);

  if (req.method === "GET" && url.pathname === "/") {
    res.writeHead(200, { "content-type": "text/html; charset=utf-8" });
    res.end(renderDashboardHtml());
    return;
  }

  if (req.method === "GET" && url.pathname === "/status") {
    res.writeHead(200, { "content-type": "application/json" });
    res.end(
      JSON.stringify({
        running,
        uptimeSec: Math.floor((Date.now() - startedAt) / 1000),
        dataDir: DATA_DIR,
        lastError,
        characterRows: accumulator.characterStats.size,
        equipmentRows: accumulator.equipmentBuilds.size,
        traitRows: accumulator.traitBuilds.size,
        ...state,
      })
    );
    return;
  }

  if (req.method === "POST" && url.pathname === "/start") {
    const body = await readJsonBody(req);
    const started = startWorker(body);
    res.writeHead(200, { "content-type": "application/json" });
    res.end(JSON.stringify({ ok: true, started, running, nextGameId: state.nextGameId }));
    return;
  }

  if (req.method === "POST" && url.pathname === "/pause") {
    pauseWorker();
    res.writeHead(200, { "content-type": "application/json" });
    res.end(JSON.stringify({ ok: true, running }));
    return;
  }

  if (req.method === "POST" && url.pathname === "/upload-1h") {
    execute1hUpload().catch(() => {});
    res.writeHead(200, { "content-type": "application/json" });
    res.end(JSON.stringify({ ok: true, message: "1h upload triggered" }));
    return;
  }

  if (req.method === "POST" && url.pathname === "/upload-6h") {
    execute6hUpload().catch(() => {});
    res.writeHead(200, { "content-type": "application/json" });
    res.end(JSON.stringify({ ok: true, message: "6h upload triggered" }));
    return;
  }

  if (req.method === "POST" && url.pathname === "/flush") {
    archiveActiveChunk();
    res.writeHead(200, { "content-type": "application/json" });
    res.end(JSON.stringify({ ok: true, chunksArchived: state.stats.chunksArchived }));
    return;
  }

  res.writeHead(404, { "content-type": "application/json" });
  res.end(JSON.stringify({ error: "Not Found" }));
});

function shutdown() {
  running = false;
  accumulator.saveCheckpoint();
  saveState();
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(0), 2000);
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

server.listen(PORT, HOST, () => {
  console.log(`=======================================================`);
  console.log(`🚀 [Worker A] 13.2 Live Collector & Supabase Uploader`);
  console.log(`📡 Dashboard: http://${HOST}:${PORT}`);
  console.log(`🎯 Target Patch: ${TARGET_PATCH}`);
  console.log(`⚡ Rate: ${INTERVAL_MS}ms (1 RPS)`);
  console.log(`📁 Data Dir: ${DATA_DIR}`);
  console.log(`=======================================================`);
  if (AUTO_START) {
    startWorker();
    console.log(`[Worker A] AUTO_START=1 -> 수집 시작`);
  }
});
