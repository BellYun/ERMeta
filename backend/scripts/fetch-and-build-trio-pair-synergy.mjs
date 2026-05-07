// ============================================================
// 87 캐릭 페어 시너지 자동화
//
// 전제:
//   1) backend/migrations/016_trio_pair_synergy_rpc.sql 이 Supabase 에 적용됨
//   2) frontend/.env 에 NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY 존재
//
// 흐름:
//   1) 87 캐릭 순회 → RPC get_trio_pair_synergy / get_solo_baseline 호출
//   2) backend/manual_sql/trio_pair_synergy/{padded}.json 의 pairs / soloBaseline 자동 채움
//   3) build-synergy-pairs.mjs spawn → frontend/public/data/synergy-pairs/{padded}.json 생성
//
// 사용:
//   node backend/scripts/fetch-and-build-trio-pair-synergy.mjs           # 전체 87
//   node backend/scripts/fetch-and-build-trio-pair-synergy.mjs 1 5 55    # 특정 코드만
// ============================================================

import { spawn } from "node:child_process";
import { readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..", "..");
const ENV_FILE = join(ROOT, "frontend", ".env");
const RAW_DIR = join(__dirname, "..", "manual_sql", "trio_pair_synergy");
const BUILD_SCRIPT = join(__dirname, "build-synergy-pairs.mjs");

// .env 단순 파서 (KEY=VALUE 줄만, 따옴표 제거)
async function loadEnv(path) {
  const text = await readFile(path, "utf8");
  const env = {};
  for (const line of text.split("\n")) {
    const m = line.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*)\s*$/);
    if (!m) continue;
    let v = m[2].trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
      v = v.slice(1, -1);
    }
    env[m[1]] = v;
  }
  return env;
}

const env = await loadEnv(ENV_FILE);
const SUPABASE_URL = env.NEXT_PUBLIC_SUPABASE_URL;
const ANON_KEY = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !ANON_KEY) {
  console.error("missing NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY in frontend/.env");
  process.exit(1);
}

const HEADERS = {
  apikey: ANON_KEY,
  Authorization: `Bearer ${ANON_KEY}`,
  "Content-Type": "application/json",
};

async function rpc(fnName, body) {
  const url = `${SUPABASE_URL.replace(/\/$/, "")}/rest/v1/rpc/${fnName}`;
  const r = await fetch(url, {
    method: "POST",
    headers: HEADERS,
    body: JSON.stringify(body),
  });
  if (!r.ok) {
    const text = await r.text();
    throw new Error(`${fnName}(${JSON.stringify(body)}) failed [${r.status}]: ${text.slice(0, 200)}`);
  }
  return r.json();
}

async function processCharacter(code) {
  const padded = String(code).padStart(3, "0");
  const file = join(RAW_DIR, `${padded}.json`);
  const raw = JSON.parse(await readFile(file, "utf8"));

  const [pairs, soloBaseline] = await Promise.all([
    rpc("get_trio_pair_synergy", { p_focus_char: code }),
    rpc("get_solo_baseline", { p_char: code }),
  ]);

  raw.pairs = pairs;
  raw.soloBaseline = soloBaseline;
  raw.extractedAt = new Date().toISOString();

  await writeFile(file, JSON.stringify(raw, null, 2) + "\n");
  return { code, padded, pairCount: pairs.length, soloCount: soloBaseline.length };
}

function spawnBuild() {
  return new Promise((resolve, reject) => {
    const child = spawn("node", [BUILD_SCRIPT], { stdio: "inherit" });
    child.on("exit", (code) =>
      code === 0 ? resolve() : reject(new Error(`build script exit ${code}`))
    );
  });
}

const ALL_CODES = Array.from({ length: 87 }, (_, i) => i + 1);
const argv = process.argv.slice(2);
const targets = argv.length ? argv.map(Number).filter((n) => Number.isFinite(n)) : ALL_CODES;

console.log(`fetching ${targets.length} characters via RPC ...`);
const t0 = Date.now();

let okCount = 0;
let failCount = 0;
for (const code of targets) {
  try {
    const r = await processCharacter(code);
    okCount += 1;
    console.log(`  ✓ ${r.padded}  pairs=${r.pairCount}  solo=${r.soloCount}`);
  } catch (err) {
    failCount += 1;
    console.error(`  ✗ ${code}: ${err.message}`);
  }
}

console.log(`\nfetched ${okCount}/${targets.length} (${failCount} failed) in ${((Date.now() - t0) / 1000).toFixed(1)}s`);

if (okCount > 0) {
  console.log("\nrunning build-synergy-pairs ...");
  await spawnBuild();
}
