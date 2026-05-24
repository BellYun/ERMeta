// raw_character_multiset.json 에서 암살자/지원가 role 의 LabData 생성.
// 다른 4개 role 은 클러스터링 분석이 별도로 진행되어 v2 클러스터를 가지지만,
// 이 두 role 은 클러스터 작업이 안 되어있어 일단 "전체" 단일 그룹으로 묶음.
// run: node frontend/scripts/generate-extra-role-lab.mjs

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SOURCE = path.resolve(
  __dirname,
  "..",
  "..",
  "DATA",
  "trio-role-combinations",
  "raw_character_multiset.json"
);
const OUT_DIR = path.resolve(__dirname, "..", "public", "data", "lab");

const TARGETS = [
  { role: "암살자", slug: "assassins" },
  { role: "지원가", slug: "supports" },
];

const MIN_GAMES_PER_MULTISET = 30;
const MIN_TOTAL_GAMES = 1000;
const STRONG_TOP_K = 5;
const WEAK_TOP_K = 5;

// fallback 이름 맵 (characterMap.ts 와 동기화)
const CHAR_NAMES = {
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
  86: "펜리르", 87: "코렐라인", 88: "비형",
};

const WEAPON_NAMES = {
  1: "글러브", 2: "톤파", 3: "방망이", 4: "채찍", 5: "투척",
  6: "암기", 7: "활", 8: "석궁", 9: "권총", 10: "돌격소총",
  11: "저격총", 13: "망치", 14: "도끼", 15: "단검", 16: "양손검",
  17: "폴암", 18: "쌍검", 19: "창", 20: "쌍절곤", 21: "레이피어",
  22: "기타", 23: "카메라", 24: "아르카나", 25: "VF의수",
};

const raw = JSON.parse(fs.readFileSync(SOURCE, "utf-8"));

fs.mkdirSync(OUT_DIR, { recursive: true });

for (const target of TARGETS) {
  const rows = raw.filter((r) => r.focus_role === target.role);
  if (rows.length === 0) {
    console.warn(`⚠ ${target.role} : no rows`);
    continue;
  }

  // (focus_cc, focus_wc) 별 그룹화
  const byChar = new Map();
  for (const r of rows) {
    const key = `${r.focus_cc}_${r.focus_wc}`;
    let bucket = byChar.get(key);
    if (!bucket) {
      bucket = {
        characterCode: r.focus_cc,
        weapon: r.focus_wc,
        totalGames: 0,
        weightedSumRP: 0,
        multisetRows: [],
      };
      byChar.set(key, bucket);
    }
    bucket.totalGames += r.games;
    bucket.weightedSumRP += r.avg_rp * r.games;
    bucket.multisetRows.push(r);
  }

  const characters = [];
  for (const [key, bucket] of byChar) {
    if (bucket.totalGames < MIN_TOTAL_GAMES) continue;
    const ownMeanRP = bucket.weightedSumRP / bucket.totalGames;

    const eligible = bucket.multisetRows.filter((r) => r.games >= MIN_GAMES_PER_MULTISET);
    const withDelta = eligible.map((r) => ({
      multiset: r.multiset_key,
      delta: Math.round((r.avg_rp - ownMeanRP) * 1000) / 1000,
      games: r.games,
    }));

    const strong = [...withDelta].sort((a, b) => b.delta - a.delta).slice(0, STRONG_TOP_K);
    const weak = [...withDelta].sort((a, b) => a.delta - b.delta).slice(0, WEAK_TOP_K);

    characters.push({
      characterCode: bucket.characterCode,
      characterName: CHAR_NAMES[bucket.characterCode] ?? `코드:${bucket.characterCode}`,
      weapon: bucket.weapon,
      weaponName: WEAPON_NAMES[bucket.weapon] ?? `무기${bucket.weapon}`,
      totalGames: bucket.totalGames,
      ownMeanRP: Math.round(ownMeanRP * 1000) / 1000,
      groupId: 0,
      strong,
      weak,
    });
  }

  // 표본 큰 순 정렬
  characters.sort((a, b) => b.totalGames - a.totalGames);

  const groups = [
    {
      id: 0,
      label: `${target.role} 전체`,
      curated: false,
      characterKeys: characters.map((c) => `${c.characterCode}_${c.weapon}`),
    },
  ];

  const dataset = {
    role: target.role,
    roleSlug: target.slug,
    groupK: groups.length,
    minGames: MIN_TOTAL_GAMES,
    cumulative: true,
    generatedFrom: "DATA/trio-role-combinations/raw_character_multiset.json",
    generatedAt: new Date().toISOString().slice(0, 10),
    groups,
    characters,
  };

  const outPath = path.join(OUT_DIR, `${target.slug}.json`);
  fs.writeFileSync(outPath, JSON.stringify(dataset, null, 2) + "\n");
  console.log(`✓ ${target.role} → ${outPath} (${characters.length} chars, ${groups.length} group)`);
}
