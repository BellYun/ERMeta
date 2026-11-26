#!/usr/bin/env node
/**
 * ER&GG 로컬 상세 수집기 서버 (Zero-dependency Node.js)
 *
 * - BSER Open API `GET /v1/games/{gameId}` 순차 수집 + 웹 대시보드/제어 API 제공
 * - 크래시 안전: 활성 청크(.ndjson)에 1줄씩 append 후 CHUNK_SIZE마다 .ndjson.gz로 압축 회전
 * - 재시작 안전: state.json 원자적 갱신으로 중단 지점부터 자동 재개
 */

import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "../..");

const PORT = Number(process.env.PORT || 4310);
const HOST = process.env.HOST || "127.0.0.1";
const DATA_DIR = path.resolve(process.env.DATA_DIR || path.join(__dirname, "data"));
const RAW_DIR = path.join(DATA_DIR, "raw");
const ACTIVE_DIR = path.join(DATA_DIR, "active");
const STATE_FILE = path.join(DATA_DIR, "state.json");
const INDEX_FILE = path.join(DATA_DIR, "index.ndjson");

const DEFAULT_START_GAME_ID = Number(process.env.START_GAME_ID || 63777159); // 12.1 생존 최소 ID
const DEFAULT_DIRECTION = process.env.DIRECTION === "backward" ? "backward" : "forward";
// BSER Open API 등급 상향(Personal 10 RPS) 반영: 기본 105ms (~9.5 req/s)
const INTERVAL_MS = Math.max(50, Number(process.env.INTERVAL_MS || 105));
const CHUNK_SIZE = Math.max(10, Number(process.env.CHUNK_SIZE || 500));
const MAX_CONSECUTIVE_404 = Number(process.env.MAX_CONSECUTIVE_404 || 50);
const AUTO_START = process.env.AUTO_START === "1" || process.argv.includes("--auto-start");

const BASE_URL = "https://open-api.bser.io/v1";

function loadApiKey() {
  if (process.env.BSER_API_KEY) return process.env.BSER_API_KEY.trim();
  const candidates = [
    path.join(__dirname, ".env"),
    path.join(REPO_ROOT, "backend", ".env"),
    path.join(REPO_ROOT, "frontend", ".env"),
  ];
  for (const envPath of candidates) {
    if (!fs.existsSync(envPath)) continue;
    const raw = fs.readFileSync(envPath, "utf8");
    const match = raw.match(/^\s*BSER_API_KEY\s*=\s*(.+)\s*$/m);
    if (match) {
      return match[1].trim().replace(/^["']|["']$/g, "");
    }
  }
  throw new Error("BSER_API_KEY를 찾을 수 없습니다. 환경변수 또는 .env에 설정하세요.");
}

const API_KEY = loadApiKey();

function ensureDirs() {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.mkdirSync(RAW_DIR, { recursive: true });
  fs.mkdirSync(ACTIVE_DIR, { recursive: true });
}

function loadState() {
  if (fs.existsSync(STATE_FILE)) {
    try {
      return JSON.parse(fs.readFileSync(STATE_FILE, "utf8"));
    } catch {
      // 손상 시 백업 후 초기화
    }
  }
  return {
    nextGameId: DEFAULT_START_GAME_ID,
    direction: DEFAULT_DIRECTION,
    intervalMs: INTERVAL_MS,
    stats: {
      fetched: 0,
      notFound: 0,
      errors: 0,
      consecutive404: 0,
      chunksArchived: 0,
    },
    activeChunks: {},
    lastGame: null,
    updatedAt: null,
  };
}

function saveState(st) {
  st.updatedAt = new Date().toISOString();
  const tmp = `${STATE_FILE}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(st, null, 2));
  fs.renameSync(tmp, STATE_FILE);
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function fetchGameWithRetry(gameId) {
  const backoff = [2000, 5000, 10000];
  for (let attempt = 0; attempt <= backoff.length; attempt++) {
    const res = await fetch(`${BASE_URL}/games/${gameId}`, {
      headers: { accept: "application/json", "x-api-key": API_KEY },
    });
    if (res.status === 404) return { status: 404, data: null };
    if (res.status === 429 && attempt < backoff.length) {
      await sleep(backoff[attempt]);
      continue;
    }
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }
    const data = await res.json();
    if (data?.code === 404 || !Array.isArray(data?.userGames) || data.userGames.length === 0) {
      return { status: 404, data: null };
    }
    return { status: 200, data };
  }
  throw new Error("429 rate limit exceeded after retries");
}

function archiveChunk(patchKey, chunkInfo) {
  if (!chunkInfo || chunkInfo.count === 0 || !fs.existsSync(chunkInfo.filePath)) return;
  const patchDir = path.join(RAW_DIR, patchKey);
  fs.mkdirSync(patchDir, { recursive: true });
  const gzName = `games_${chunkInfo.minId}_${chunkInfo.maxId}.ndjson.gz`;
  const gzPath = path.join(patchDir, gzName);
  const rawBuf = fs.readFileSync(chunkInfo.filePath);
  fs.writeFileSync(gzPath, zlib.gzipSync(rawBuf, { level: 6 }));
  fs.unlinkSync(chunkInfo.filePath);
  state.stats.chunksArchived += 1;
  delete state.activeChunks[patchKey];
}

function persistGame(gameId, data) {
  const g0 = data.userGames[0];
  const patchKey = `${g0.versionSeason}.${g0.versionMajor}.${g0.versionMinor}`;
  const fetchedAt = new Date().toISOString();

  let chunk = state.activeChunks[patchKey];
  if (!chunk) {
    const filePath = path.join(ACTIVE_DIR, `active_${patchKey}.ndjson`);
    chunk = { filePath, minId: gameId, maxId: gameId, count: 0 };
    state.activeChunks[patchKey] = chunk;
  }

  const record = { gameId, fetchedAt, ...data };
  fs.appendFileSync(chunk.filePath, JSON.stringify(record) + "\n");
  chunk.minId = Math.min(chunk.minId, gameId);
  chunk.maxId = Math.max(chunk.maxId, gameId);
  chunk.count += 1;

  const summary = {
    gameId,
    patch: patchKey,
    seasonId: g0.seasonId,
    matchingMode: g0.matchingMode,
    matchingTeamMode: g0.matchingTeamMode,
    serverName: g0.serverName,
    startDtm: g0.startDtm,
    players: data.userGames.length,
    fetchedAt,
  };
  fs.appendFileSync(INDEX_FILE, JSON.stringify(summary) + "\n");
  state.lastGame = summary;

  if (chunk.count >= CHUNK_SIZE) {
    archiveChunk(patchKey, chunk);
  }
}

// ── 상태 및 워커 루프 ───────────────────────────────────────────
ensureDirs();
let state = loadState();
let running = false;
let loopPromise = null;
let lastError = null;
const startedAt = Date.now();

async function runCollectorLoop() {
  while (running) {
    const gid = state.nextGameId;
    const stepStart = Date.now();
    try {
      const { status, data } = await fetchGameWithRetry(gid);
      if (status === 404) {
        state.stats.notFound += 1;
        state.stats.consecutive404 += 1;
        if (state.stats.consecutive404 >= MAX_CONSECUTIVE_404) {
          lastError = `연속 ${MAX_CONSECUTIVE_404}회 404 (gameId=${gid})로 일시 정지`;
          running = false;
          saveState(state);
          break;
        }
      } else {
        state.stats.consecutive404 = 0;
        state.stats.fetched += 1;
        persistGame(gid, data);
        lastError = null;
      }

      state.nextGameId = state.direction === "backward" ? gid - 1 : gid + 1;
      if (state.nextGameId < 1) {
        running = false;
      }
      saveState(state);
    } catch (err) {
      state.stats.errors += 1;
      lastError = `${gid}: ${err.message}`;
      saveState(state);
      await sleep(3000);
    }

    const elapsed = Date.now() - stepStart;
    const waitMs = Math.max(0, (state.intervalMs || INTERVAL_MS) - elapsed);
    if (running && waitMs > 0) await sleep(waitMs);
  }
}

function startWorker(opts = {}) {
  if (opts.startGameId !== undefined && Number.isFinite(Number(opts.startGameId))) {
    state.nextGameId = Number(opts.startGameId);
    state.stats.consecutive404 = 0;
  }
  if (opts.direction === "forward" || opts.direction === "backward") {
    state.direction = opts.direction;
  }
  if (opts.intervalMs !== undefined && Number(opts.intervalMs) >= 50) {
    state.intervalMs = Number(opts.intervalMs);
  }
  saveState(state);
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
  saveState(state);
}

function flushAllChunks() {
  for (const [patchKey, chunkInfo] of Object.entries({ ...state.activeChunks })) {
    archiveChunk(patchKey, chunkInfo);
  }
  saveState(state);
}

// ── HTTP 대시보드 & API ─────────────────────────────────────────
function renderDashboardHtml() {
  return `<!doctype html>
<html lang="ko">
<head>
  <meta charset="utf-8" />
  <title>ER&GG 로컬 수집기</title>
  <style>
    body { font-family: -apple-system, sans-serif; max-width: 720px; margin: 32px auto; padding: 0 16px; background: #0f172a; color: #e2e8f0; }
    .card { background: #1e293b; border-radius: 10px; padding: 16px 20px; margin-bottom: 16px; }
    button { background: #3b82f6; color: #fff; border: 0; padding: 8px 14px; border-radius: 6px; cursor: pointer; margin-right: 8px; }
    button.stop { background: #ef4444; }
    button.sec { background: #475569; }
    input, select { background: #0f172a; color: #e2e8f0; border: 1px solid #334155; padding: 6px 10px; border-radius: 6px; }
    pre { background: #020617; padding: 12px; border-radius: 6px; overflow: auto; font-size: 13px; }
  </style>
</head>
<body>
  <h2>ER&GG 로컬 상세 수집기</h2>
  <div class="card">
    <button onclick="post('/start')">시작 / 재개</button>
    <button class="stop" onclick="post('/pause')">일시정지</button>
    <button class="sec" onclick="post('/flush')">활성 청크 즉시 압축</button>
  </div>
  <div class="card">
    <label>Game ID: <input id="gid" type="number" placeholder="63777159" /></label>
    <label>방향:
      <select id="dir">
        <option value="forward">forward (정방향)</option>
        <option value="backward">backward (역방향)</option>
      </select>
    </label>
    <button onclick="setCursor()">커서 이동 후 시작</button>
  </div>
  <div class="card">
    <h3>상태</h3>
    <pre id="status">로딩 중...</pre>
  </div>
  <script>
    async function refresh() {
      const r = await fetch('/status');
      document.getElementById('status').textContent = JSON.stringify(await r.json(), null, 2);
    }
    async function post(url, body) {
      await fetch(url, { method: 'POST', headers: {'content-type':'application/json'}, body: body ? JSON.stringify(body) : '{}' });
      refresh();
    }
    function setCursor() {
      const gid = document.getElementById('gid').value;
      const dir = document.getElementById('dir').value;
      post('/start', { startGameId: gid ? Number(gid) : undefined, direction: dir });
    }
    refresh();
    setInterval(refresh, 2000);
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

  if (req.method === "GET" && url.pathname === "/health") {
    res.writeHead(200, { "content-type": "application/json" });
    res.end(JSON.stringify({ ok: true }));
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

  if (req.method === "POST" && url.pathname === "/flush") {
    flushAllChunks();
    res.writeHead(200, { "content-type": "application/json" });
    res.end(JSON.stringify({ ok: true, chunksArchived: state.stats.chunksArchived }));
    return;
  }

  res.writeHead(404, { "content-type": "application/json" });
  res.end(JSON.stringify({ error: "Not Found" }));
});

function shutdown() {
  running = false;
  saveState(state);
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(0), 2000);
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

server.listen(PORT, HOST, () => {
  console.log(`[collector] listening on http://${HOST}:${PORT}`);
  console.log(`[collector] dataDir=${DATA_DIR}, nextGameId=${state.nextGameId}, direction=${state.direction}`);
  if (AUTO_START) {
    startWorker();
    console.log(`[collector] AUTO_START=1 -> worker started`);
  }
});
