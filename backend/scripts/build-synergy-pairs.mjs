// ============================================================
// 캐릭별 동료 시너지 lift 빌드
// 입력 : backend/manual_sql/trio_pair_synergy/{code}.json (사용자가 채운 raw)
// 출력 : frontend/public/data/synergy-pairs/{code}.json (lift 계산 + Top/Bottom 5)
//
// 사용:
//   node backend/scripts/build-synergy-pairs.mjs            # 모든 채워진 캐릭 빌드
//   node backend/scripts/build-synergy-pairs.mjs 001 005    # 특정 코드만 빌드
// ============================================================

import { readFile, writeFile, mkdir, readdir } from "node:fs/promises";
import { dirname, join, basename } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const INPUT_DIR = join(__dirname, "..", "manual_sql", "trio_pair_synergy");
const OUTPUT_DIR = join(__dirname, "..", "..", "frontend", "public", "data", "synergy-pairs");

const TOP_N = 5;
const MIN_GAMES_HIGH = 500;
const MIN_GAMES_MEDIUM = 200;

const CHARACTER_NAMES = {
  1: "재키", 2: "아야", 3: "피오라", 4: "매그너스", 5: "자히르",
  6: "나딘", 7: "현우", 8: "하트", 9: "아이솔", 10: "리 다이린",
  11: "유키", 12: "혜진", 13: "쇼우", 14: "키아라", 15: "시셀라",
  16: "실비아", 17: "아드리아나", 18: "쇼이치", 19: "엠마", 20: "레녹스",
  21: "로지", 22: "루크", 23: "캐시", 24: "아델라", 25: "버니스",
  26: "바바라", 27: "알렉스", 28: "수아", 29: "레온", 30: "일레븐",
  31: "리오", 32: "윌리엄", 33: "니키", 34: "나타폰", 35: "얀",
  36: "이바", 37: "다니엘", 38: "제니", 39: "카밀로", 40: "클로에",
  41: "요한", 42: "비앙카", 43: "셀린", 44: "에키온", 45: "마이",
  46: "에이든", 47: "라우라", 48: "띠아", 49: "펠릭스", 50: "엘레나",
  51: "프리야", 52: "아디나", 53: "마커스", 54: "칼라", 55: "에스텔",
  56: "피올로", 57: "마르티나", 58: "헤이즈", 59: "아이작", 60: "타지아",
  61: "이렘", 62: "테오도르", 63: "이안", 64: "바냐", 65: "데비&마를렌",
  66: "아르다", 67: "아비게일", 68: "알론소", 69: "레니", 70: "츠바메",
  71: "케네스", 72: "카티야", 73: "샬럿", 74: "다르코", 75: "르노어",
  76: "가넷", 77: "유민", 78: "히스이", 79: "유스티나", 80: "이슈트반",
  81: "니아", 82: "슈린", 83: "헨리", 84: "블레어", 85: "미르카",
  86: "펜리르", 87: "코렐라인",
};

const WEAPON_NAMES = {
  1: "글러브", 2: "톤파", 3: "방망이", 4: "채찍", 5: "투척",
  6: "암기", 7: "활", 8: "석궁", 9: "권총", 10: "돌격 소총",
  11: "저격총", 13: "망치", 14: "도끼", 15: "단검", 16: "양손검",
  17: "폴암", 18: "쌍검", 19: "창", 20: "쌍절곤", 21: "레이피어",
  22: "기타", 23: "카메라", 24: "아르카나", 25: "VF의수",
};

const num = (v) => (typeof v === "number" ? v : Number.parseFloat(v));
const round2 = (v) => Math.round(v * 100) / 100;

function classifyConfidence(games) {
  if (games >= MIN_GAMES_HIGH) return "high";
  if (games >= MIN_GAMES_MEDIUM) return "medium";
  return "low";
}

function buildSynergyJson(raw) {
  if (!raw.soloBaseline?.length || !raw.pairs?.length) {
    throw new Error(`character ${raw.characterCode}: empty soloBaseline or pairs`);
  }

  const soloByWeapon = new Map();
  for (const s of raw.soloBaseline) {
    soloByWeapon.set(s.weapon, {
      games: s.games,
      winRate: round2(num(s.win_rate)),
      avgRP: round2(num(s.avg_rp)),
      avgRank: round2(num(s.avg_rank)),
    });
  }

  const pairsByWeapon = new Map();
  for (const p of raw.pairs) {
    const solo = soloByWeapon.get(p.focus_weapon);
    if (!solo) continue;
    const pairAvgRP = num(p.avg_rp);
    const pairWinRate = num(p.win_rate);
    const enriched = {
      partnerCode: p.partner_char,
      partnerName: CHARACTER_NAMES[p.partner_char] ?? `코드 ${p.partner_char}`,
      partnerWeapon: p.partner_weapon,
      partnerWeaponName: WEAPON_NAMES[p.partner_weapon] ?? `무기 ${p.partner_weapon}`,
      games: p.games,
      winRate: round2(pairWinRate),
      avgRP: round2(pairAvgRP),
      avgRank: round2(num(p.avg_rank)),
      rpLift: round2(pairAvgRP - solo.avgRP),
      winRateLift: round2(pairWinRate - solo.winRate),
      confidence: classifyConfidence(p.games),
    };
    if (!pairsByWeapon.has(p.focus_weapon)) pairsByWeapon.set(p.focus_weapon, []);
    pairsByWeapon.get(p.focus_weapon).push(enriched);
  }

  const weapons = [];
  for (const [weapon, solo] of soloByWeapon) {
    const all = pairsByWeapon.get(weapon) ?? [];
    const trustworthy = all.filter((p) => p.confidence !== "low");
    const sorted = [...trustworthy].sort((a, b) => b.rpLift - a.rpLift);
    weapons.push({
      weapon,
      weaponName: WEAPON_NAMES[weapon] ?? `무기 ${weapon}`,
      soloBaseline: solo,
      topSynergy: sorted.slice(0, TOP_N),
      topAnti: sorted.slice(-TOP_N).reverse(),
      eligiblePairs: trustworthy.length,
    });
  }

  weapons.sort((a, b) => b.soloBaseline.games - a.soloBaseline.games);

  return {
    characterCode: raw.characterCode,
    characterName: raw.characterName,
    patchScope: raw.patchScope,
    tierScope: raw.tierScope,
    minSampleGames: raw.minSampleGames,
    confidenceThresholds: { high: MIN_GAMES_HIGH, medium: MIN_GAMES_MEDIUM },
    builtAt: new Date().toISOString(),
    weapons,
  };
}

async function listFilledCodes() {
  const files = await readdir(INPUT_DIR);
  const codes = [];
  for (const f of files) {
    if (!f.endsWith(".json")) continue;
    const raw = JSON.parse(await readFile(join(INPUT_DIR, f), "utf8"));
    if (raw.soloBaseline?.length && raw.pairs?.length) codes.push(basename(f, ".json"));
  }
  return codes;
}

const argv = process.argv.slice(2);
const targets = argv.length ? argv.map((c) => c.padStart(3, "0")) : await listFilledCodes();

if (!targets.length) {
  console.error("No filled character JSON found.");
  process.exit(1);
}

await mkdir(OUTPUT_DIR, { recursive: true });

for (const code of targets) {
  const inputFile = join(INPUT_DIR, `${code}.json`);
  const raw = JSON.parse(await readFile(inputFile, "utf8"));

  // nested array 자동 정규화 (paste 실수 대비)
  if (Array.isArray(raw.pairs?.[0])) raw.pairs = raw.pairs[0];
  if (Array.isArray(raw.soloBaseline?.[0])) raw.soloBaseline = raw.soloBaseline[0];

  try {
    const built = buildSynergyJson(raw);
    const outputFile = join(OUTPUT_DIR, `${code}.json`);
    await writeFile(outputFile, JSON.stringify(built, null, 2) + "\n");
    console.log(`✓ ${code} (${built.characterName}) — ${built.weapons.length} weapons, ${built.weapons.reduce((sum, w) => sum + w.eligiblePairs, 0)} eligible pairs`);
  } catch (err) {
    console.error(`✗ ${code}: ${err.message}`);
  }
}
