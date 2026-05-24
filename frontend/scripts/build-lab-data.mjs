/**
 * Lab(멀티셋 패턴) 데이터 빌드 스크립트
 *
 * DATA/trio-role-combinations/<role>/visualization_above_avg_cards.html 의
 * 인라인 `const DATA` 블록을 읽어 frontend/public/data/lab/<roleSlug>.json 으로
 * 정제 출력한다. HTML 이 있는 모든 롤을 처리한다.
 *
 * - 소표본 노이즈 제거: strong/weak 멀티셋에 MIN_GAMES 게이트 적용
 * - groups 는 HTML 내장 K=6 그룹(groupings/groupNames) 사용. curated=false →
 *   이후 사람/전문가가 라벨·멤버 보정 가능. outlier 그룹도 그대로 보존.
 *
 * Usage: node scripts/build-lab-data.mjs [roleSlug ...]   (기본: 전 롤)
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO = join(__dirname, "../..");
const SRC_DIR = join(REPO, "DATA/trio-role-combinations");
const OUT_DIR = join(__dirname, "../public/data/lab");

// 소표본 게이트: 이 게임 수 미만 멀티셋은 신뢰 불가 노이즈로 간주, 노출 제외
const MIN_GAMES = 100;
// 롤별 그룹 클러스터 K (HTML groupings 키). 미지정 롤은 defaultK 폴백.
const ROLE_K = {
  rangers: 6,
  skilldealers: 11,
  tanks: 6,
  warriors: 12,
};

function extractInlineData(html) {
  const m = html.match(/const DATA\s*=\s*(\{[\s\S]*?\});\s*\n/);
  if (!m) throw new Error("const DATA 블록을 찾지 못함");
  return JSON.parse(m[1]);
}

function comboKey(c) {
  return `${c.characterCode}_${c.weapon}`;
}

function gate(list) {
  return (list || [])
    .filter((x) => (x.games ?? 0) >= MIN_GAMES)
    .map((x) => ({ multiset: x.multiset, delta: x.delta, games: x.games }));
}

// HTML 내장 K-그룹(groupings: combo.id → 그룹 인덱스 배열, groupNames: 인덱스 → 이름)
function buildGroupsFromData(data, wantK) {
  const groupings = data.groupings || {};
  const namesByK = data.groupNames || {};
  // 요청 K → 없으면 defaultK → 없으면 사용 가능한 첫 키
  const kKeys = Object.keys(groupings);
  const k =
    groupings[wantK] != null
      ? String(wantK)
      : groupings[data.defaultK] != null
        ? String(data.defaultK)
        : kKeys[0];
  if (k == null) return { groups: [], idToGroup: new Map(), k: null };

  const assignArr = groupings[k] || [];
  const names = namesByK[k] || namesByK[String(data.defaultK)] || {};

  // combo.id 기준 그룹 인덱스 부여
  const idToGroup = new Map();
  data.combos.forEach((c, i) => {
    const gi = assignArr[c.id ?? i];
    if (gi != null) idToGroup.set(c.id ?? i, gi);
  });

  const usedIdx = [...new Set(assignArr)].sort((a, b) => a - b);
  const groups = usedIdx.map((gi) => ({
    id: gi,
    label: names[String(gi)] ?? `그룹 ${gi}`,
    curated: false,
    characterKeys: data.combos
      .filter((c, i) => (assignArr[c.id ?? i]) === gi)
      .map((c) => comboKey(c)),
  }));

  return { groups, idToGroup, k };
}

function buildRole(roleSlug) {
  const srcRole = join(SRC_DIR, roleSlug);
  const htmlPath = join(srcRole, "visualization_above_avg_cards.html");
  if (!existsSync(htmlPath)) return { roleSlug, skipped: "no HTML (소스 없음)" };

  const html = readFileSync(htmlPath, "utf8");
  const data = extractInlineData(html);
  const titleRole = (html.match(/<title>([^<]+)<\/title>/)?.[1] || "")
    .split("—")[0]
    .trim();
  const roleName = data.focusRole || titleRole || roleSlug;
  const wantK = ROLE_K[roleSlug] ?? data.defaultK;
  const { groups, idToGroup, k } = buildGroupsFromData(data, wantK);

  const characters = data.combos.map((c, i) => ({
    characterCode: c.characterCode,
    characterName: c.characterName,
    weapon: c.weapon,
    weaponName: c.weaponsString,
    totalGames: c.totalGames,
    ownMeanRP: c.ownMeanRP,
    groupId: idToGroup.get(c.id ?? i) ?? null,
    strong: gate(c.aboveMultisets).sort((a, b) => b.delta - a.delta),
    weak: gate(c.belowMultisets).sort((a, b) => a.delta - b.delta),
  }));

  const out = {
    role: roleName,
    roleSlug,
    groupK: k != null ? Number(k) : null,
    minGames: MIN_GAMES,
    cumulative: true,
    generatedFrom: `DATA/trio-role-combinations/${roleSlug}`,
    generatedAt: new Date().toISOString().slice(0, 10),
    groups,
    characters,
  };

  if (!existsSync(OUT_DIR)) mkdirSync(OUT_DIR, { recursive: true });
  writeFileSync(join(OUT_DIR, `${roleSlug}.json`), JSON.stringify(out, null, 2));

  const dropS =
    data.combos.reduce((s, c) => s + (c.aboveMultisets?.length || 0), 0) -
    characters.reduce((s, c) => s + c.strong.length, 0);
  const dropW =
    data.combos.reduce((s, c) => s + (c.belowMultisets?.length || 0), 0) -
    characters.reduce((s, c) => s + c.weak.length, 0);
  return {
    roleSlug,
    role: out.role,
    chars: characters.length,
    groups: groups.length,
    k,
    dropS,
    dropW,
  };
}

function main() {
  const requested = process.argv.slice(2);
  const roles =
    requested.length > 0
      ? requested
      : readdirSync(SRC_DIR, { withFileTypes: true })
          .filter((d) => d.isDirectory())
          .map((d) => d.name)
          .filter((name) =>
            existsSync(join(SRC_DIR, name, "visualization_above_avg_cards.html"))
          );

  for (const r of roles) {
    const res = buildRole(r);
    if (res.skipped) {
      console.log(`✗ ${r}: ${res.skipped}`);
    } else {
      console.log(
        `✓ ${res.roleSlug} (${res.role}) chars=${res.chars} groups=${res.groups} ` +
          `K=${res.k} minGames=${MIN_GAMES} dropped(strong=${res.dropS}, weak=${res.dropW})`
      );
    }
  }
}

main();
