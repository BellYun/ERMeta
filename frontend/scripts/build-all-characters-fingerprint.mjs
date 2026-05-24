// raw_character_multiset.json 에서 전체 (캐릭+무기) 의 21-페어 핑거프린트 일람 HTML 생성.
// 그룹 수동 분류용 — 사용자가 보면서 그룹 라벨 클릭해 묶을 수 있는 인터랙티브 페이지.
// output: DATA/trio-role-combinations/all_characters_fingerprint.html
// run: node frontend/scripts/build-all-characters-fingerprint.mjs

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SOURCE = path.resolve(__dirname, "..", "..", "DATA", "trio-role-combinations", "raw_character_multiset.json");
const OUTPUT = path.resolve(__dirname, "..", "..", "DATA", "trio-role-combinations", "all_characters_fingerprint.html");

const MIN_TOTAL_GAMES = 500;
const MIN_PAIR_GAMES = 100;
const PARTNER_ROLES = ["탱커", "원거리 딜러", "스킬딜러", "전사", "지원가", "암살자"];

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

function partnerPair(multiset, focusRole) {
  const roles = multiset.split(" + ").map((s) => s.trim());
  const idx = roles.indexOf(focusRole);
  if (idx >= 0) roles.splice(idx, 1);
  if (roles.length !== 2) return null;
  if (!PARTNER_ROLES.includes(roles[0]) || !PARTNER_ROLES.includes(roles[1])) return null;
  return [...roles].sort();
}

const raw = JSON.parse(fs.readFileSync(SOURCE, "utf-8"));

// (focus_cc, focus_wc) 별 통계 집계 + 평균 rp 계산
const byCombo = new Map();
for (const r of raw) {
  if (!CHAR_NAMES[r.focus_cc]) continue;
  const key = `${r.focus_cc}_${r.focus_wc}`;
  let bucket = byCombo.get(key);
  if (!bucket) {
    bucket = {
      cc: r.focus_cc,
      wc: r.focus_wc,
      role: r.focus_role,
      totalGames: 0,
      weightedRP: 0,
      rows: [],
    };
    byCombo.set(key, bucket);
  }
  bucket.totalGames += r.games;
  bucket.weightedRP += (r.avg_rp || 0) * (r.games || 0);
  bucket.rows.push(r);
}

const combos = [];
for (const [, bucket] of byCombo) {
  if (bucket.totalGames < MIN_TOTAL_GAMES) continue;
  const ownMean = bucket.weightedRP / bucket.totalGames;

  // 21-페어 affinity
  const acc = {};
  for (const r of bucket.rows) {
    const pair = partnerPair(r.multiset_key, bucket.role);
    if (!pair) continue;
    const k = pair.join("|");
    if (!acc[k]) acc[k] = { sum: 0, weight: 0, games: 0 };
    const delta = (r.avg_rp || 0) - ownMean;
    const sqrtG = Math.sqrt(r.games || 0);
    acc[k].sum += delta * sqrtG;
    acc[k].weight += sqrtG;
    acc[k].games += r.games || 0;
  }
  const pairAffinity = {};
  for (const k of Object.keys(acc)) {
    pairAffinity[k] = {
      delta: acc[k].weight > 0 ? acc[k].sum / acc[k].weight : 0,
      games: acc[k].games,
    };
  }

  combos.push({
    key: `${bucket.cc}_${bucket.wc}`,
    cc: bucket.cc,
    wc: bucket.wc,
    name: CHAR_NAMES[bucket.cc] || `?${bucket.cc}`,
    weapon: WEAPON_NAMES[bucket.wc] || `무기${bucket.wc}`,
    role: bucket.role,
    totalGames: bucket.totalGames,
    ownMean: Math.round(ownMean * 1000) / 1000,
    pairAffinity,
  });
}

// 역할 → 캐릭터 정렬 (역할 그룹화 + 표본 큰 순)
combos.sort((a, b) => {
  if (a.role !== b.role) return a.role.localeCompare(b.role, "ko");
  return b.totalGames - a.totalGames;
});

console.log(`✓ 총 ${combos.length}개 (캐릭+무기) 핑거프린트 생성`);
const byRole = combos.reduce((m, c) => ((m[c.role] = (m[c.role] || 0) + 1), m), {});
console.log("  by role:", byRole);

const PAIRS_JS = [];
for (let i = 0; i < PARTNER_ROLES.length; i++) {
  for (let j = i; j < PARTNER_ROLES.length; j++) PAIRS_JS.push([PARTNER_ROLES[i], PARTNER_ROLES[j]]);
}

const html = `<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="UTF-8">
<title>전체 캐릭터 21-페어 핑거프린트 (수동 그룹용)</title>
<script src="https://cdn.jsdelivr.net/npm/chart.js@4"></script>
<style>
:root { --bg:#0f1419; --surface:#1a1f29; --surface-2:#232936; --border:#2a3140;
        --fg:#e6e8ec; --muted:#8b94a3; --primary:#4f86ff; }
*{box-sizing:border-box;}
body{margin:0;font-family:-apple-system,"Pretendard",sans-serif;
     background:var(--bg);color:var(--fg);padding:20px;}
h1{font-size:1.5rem;margin:0 0 6px;}
.sub{color:var(--muted);font-size:0.85rem;margin-bottom:16px;}
.ctrls{display:flex;flex-wrap:wrap;gap:10px;margin-bottom:16px;align-items:center;
       background:var(--surface);border:1px solid var(--border);border-radius:8px;padding:10px;}
.ctrls label{color:var(--muted);font-size:0.82rem;display:flex;align-items:center;gap:5px;}
.ctrls input[type="text"],.ctrls input[type="number"]{
  background:#0f1419;color:var(--fg);border:1px solid var(--border);
  border-radius:4px;padding:4px 8px;font-size:0.85rem;}
.ctrls select{background:#0f1419;color:var(--fg);border:1px solid var(--border);
              border-radius:4px;padding:4px 8px;font-size:0.85rem;}
.ctrls button{background:var(--primary);color:white;border:none;border-radius:4px;
              padding:5px 12px;cursor:pointer;font-size:0.82rem;}
.role-pill{display:inline-block;padding:2px 8px;border-radius:4px;font-size:0.7rem;
           margin-left:6px;background:var(--surface-2);color:var(--muted);}
.role-pill[data-active="true"]{background:var(--primary);color:white;}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:10px;}
.card{background:var(--surface);border:1px solid var(--border);border-radius:8px;padding:8px;
      transition:border-color 0.15s,transform 0.15s;cursor:pointer;}
.card:hover{border-color:var(--primary);transform:translateY(-1px);}
.card[data-marked]{border-color:#fbbf24;background:rgba(251,191,36,0.06);}
.card[data-group]{border-width:2px;}
.card .title{font-size:0.85rem;font-weight:600;color:var(--fg);}
.card .meta{font-size:0.68rem;color:var(--muted);margin-top:1px;}
.card .group-badge{display:inline-block;font-size:0.6rem;font-weight:bold;padding:1px 5px;
                   border-radius:3px;margin-left:4px;color:white;}
.chart-wrap{position:relative;height:180px;margin-top:6px;}
.toolbar{position:sticky;top:0;z-index:50;background:var(--bg);padding:10px 0;
         border-bottom:1px solid var(--border);margin:-20px -20px 16px;padding-left:20px;padding-right:20px;}
.groups-panel{background:var(--surface);border:1px solid var(--border);border-radius:8px;
              padding:10px;margin-bottom:12px;}
.groups-panel .group-list{display:flex;gap:8px;flex-wrap:wrap;align-items:center;}
.groups-panel .group-chip{display:inline-flex;align-items:center;gap:5px;padding:4px 10px;
                          border-radius:4px;font-size:0.75rem;color:white;cursor:pointer;
                          border:2px solid transparent;}
.groups-panel .group-chip.active{border-color:var(--fg);}
.groups-panel .group-chip .count{font-size:0.7rem;opacity:0.85;}
</style>
</head>
<body>
<div class="toolbar">
  <h1>🧬 전체 캐릭터 21-페어 핑거프린트 — 수동 그룹화</h1>
  <p class="sub">표본 ≥ ${MIN_TOTAL_GAMES.toLocaleString("ko-KR")}판 / 페어별 표본 ≥ ${MIN_PAIR_GAMES}판. 카드 클릭 → 활성 그룹에 배정. 그룹 칩 클릭 = 활성 그룹 변경. JSON 으로 export 가능.</p>
</div>

<div class="ctrls">
  <label>역할 필터:
    <select id="role-filter">
      <option value="">전체</option>
      ${PARTNER_ROLES.map((r) => `<option value="${r}">${r}</option>`).join("")}
    </select>
  </label>
  <label>검색: <input id="search" type="text" placeholder="캐릭/무기" style="width:140px"/></label>
  <label>스케일 (±): <input id="scale" type="number" value="2" min="0.5" step="0.5" style="width:60px"/></label>
  <label>활성 페어만 표시 (≥${MIN_PAIR_GAMES}판): <input id="filter-pairs" type="checkbox" checked /></label>
  <button id="export-json">그룹 JSON 내보내기</button>
  <button id="reset-groups">전체 그룹 리셋</button>
  <span style="color:var(--muted);font-size:0.8rem;margin-left:auto" id="count-info"></span>
</div>

<div class="groups-panel">
  <div style="font-size:0.82rem;color:var(--muted);margin-bottom:6px">활성 그룹 (클릭해서 카드에 배정):</div>
  <div class="group-list" id="group-list"></div>
  <div style="margin-top:8px;display:flex;gap:6px;align-items:center;font-size:0.75rem">
    <input id="new-group-name" type="text" placeholder="새 그룹 라벨 (예: 스킬딜러 친화)" style="flex:1;background:#0f1419;color:var(--fg);border:1px solid var(--border);border-radius:4px;padding:4px 8px"/>
    <button id="add-group" style="background:var(--primary);color:white;border:none;border-radius:4px;padding:5px 12px;cursor:pointer">그룹 추가</button>
  </div>
</div>

<div id="grid" class="grid"></div>

<script>
const PARTNER_ROLES = ${JSON.stringify(PARTNER_ROLES)};
const ROLE_SHORT = {"탱커":"탱","원거리 딜러":"원딜","스킬딜러":"스딜","전사":"전사","지원가":"지원","암살자":"암살"};
const PAIRS = ${JSON.stringify(PAIRS_JS)};
const MIN_PAIR_GAMES = ${MIN_PAIR_GAMES};
const COMBOS = ${JSON.stringify(combos)};

const pairKey = (a,b) => [a,b].sort().join('|');
const pairLabel = (a,b) => ROLE_SHORT[a] + '+' + ROLE_SHORT[b];

const GROUP_PALETTE = ["#4f86ff","#34d399","#fbbf24","#a78bfa","#f87171","#22d3ee","#fb923c","#facc15","#86efac","#fda4af","#7dd3fc","#818cf8"];
let groups = []; // [{ id, label, color }]
let assignments = {}; // comboKey → groupId
let activeGroupId = null;
let charts = {};

function loadState() {
  try {
    const s = JSON.parse(localStorage.getItem('mfp-groups') || '{}');
    groups = s.groups || [];
    assignments = s.assignments || {};
    activeGroupId = s.activeGroupId || null;
  } catch(e) {}
}
function saveState() {
  localStorage.setItem('mfp-groups', JSON.stringify({ groups, assignments, activeGroupId }));
}

function ensureDefaultGroups() {
  if (groups.length === 0) {
    groups = [
      { id: 1, label: '미분류', color: GROUP_PALETTE[0] },
    ];
    activeGroupId = 1;
  }
}

function renderGroupList() {
  const list = document.getElementById('group-list');
  list.innerHTML = '';
  groups.forEach(g => {
    const count = Object.values(assignments).filter(a => a === g.id).length;
    const chip = document.createElement('span');
    chip.className = 'group-chip' + (g.id === activeGroupId ? ' active' : '');
    chip.style.background = g.color;
    chip.innerHTML = g.label + ' <span class="count">(' + count + ')</span>';
    chip.addEventListener('click', () => { activeGroupId = g.id; saveState(); renderGroupList(); renderGrid(); });
    list.appendChild(chip);
  });
  if (groups.length > 1) {
    const removeBtn = document.createElement('button');
    removeBtn.textContent = '활성 그룹 삭제';
    removeBtn.style.cssText = 'background:#f87171;color:white;border:none;border-radius:4px;padding:4px 10px;cursor:pointer;font-size:0.7rem;margin-left:6px';
    removeBtn.addEventListener('click', () => {
      if (!confirm('활성 그룹을 삭제하시겠습니까? 멤버는 미분류 상태가 됩니다.')) return;
      const removeId = activeGroupId;
      groups = groups.filter(g => g.id !== removeId);
      Object.keys(assignments).forEach(k => { if (assignments[k] === removeId) delete assignments[k]; });
      activeGroupId = groups[0]?.id ?? null;
      saveState(); renderGroupList(); renderGrid();
    });
    list.appendChild(removeBtn);
  }
}

function buildCard(combo) {
  const card = document.createElement('div');
  card.className = 'card';
  card.dataset.key = combo.key;
  const gid = assignments[combo.key];
  const g = groups.find(g => g.id === gid);
  if (g) {
    card.dataset.group = String(gid);
    card.style.borderColor = g.color;
  }
  const groupBadge = g ? '<span class="group-badge" style="background:' + g.color + '">' + g.label + '</span>' : '';
  card.innerHTML =
    '<div class="title">' + combo.name + ' ' + combo.weapon + groupBadge + '</div>' +
    '<div class="meta">' + combo.role + ' · ' + combo.totalGames.toLocaleString('ko-KR') + '판 · 자체평균 ' + combo.ownMean + '</div>' +
    '<div class="chart-wrap"><canvas></canvas></div>';
  card.addEventListener('click', () => {
    if (activeGroupId == null) return;
    if (assignments[combo.key] === activeGroupId) {
      delete assignments[combo.key];
    } else {
      assignments[combo.key] = activeGroupId;
    }
    saveState(); renderGroupList(); renderGrid();
  });
  return card;
}

function buildChart(canvas, combo, scale, filterPairs) {
  const activePairs = filterPairs
    ? PAIRS.filter(([a,b]) => (combo.pairAffinity[pairKey(a,b)]?.games || 0) >= MIN_PAIR_GAMES)
    : PAIRS;
  const labels = activePairs.map(([a,b]) => pairLabel(a,b));
  const values = activePairs.map(([a,b]) => combo.pairAffinity[pairKey(a,b)]?.delta || 0);
  return new Chart(canvas, {
    type: 'radar',
    data: { labels, datasets: [{
      label: combo.name,
      data: values,
      backgroundColor: 'rgba(96,165,250,0.22)',
      borderColor: '#60a5fa',
      borderWidth: 1.4,
      pointRadius: 2,
      pointBackgroundColor: '#60a5fa',
    }] },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false }, tooltip: {
        callbacks: { label: (ctx) => ctx.label + ': ' + ctx.parsed.r.toFixed(2) + ' RP' }
      }},
      scales: { r: {
        suggestedMin: -scale, suggestedMax: scale,
        angleLines: { color: '#2a3140' }, grid: { color: '#2a3140' },
        pointLabels: { color: '#e6e8ec', font: { size: 7 } },
        ticks: { color: '#8b94a3', backdropColor: 'transparent', font: { size: 7 } },
      }},
    },
  });
}

function renderGrid() {
  const grid = document.getElementById('grid');
  Object.values(charts).forEach(c => { try { c.destroy(); } catch(e) {} });
  charts = {};
  grid.innerHTML = '';
  const roleFilter = document.getElementById('role-filter').value;
  const search = document.getElementById('search').value.trim().toLowerCase();
  const scale = parseFloat(document.getElementById('scale').value) || 2;
  const filterPairs = document.getElementById('filter-pairs').checked;

  const filtered = COMBOS.filter(c =>
    (!roleFilter || c.role === roleFilter) &&
    (!search || (c.name + ' ' + c.weapon).toLowerCase().includes(search))
  );
  document.getElementById('count-info').textContent = filtered.length + ' / ' + COMBOS.length + '개 표시';

  filtered.forEach(combo => {
    const card = buildCard(combo);
    grid.appendChild(card);
    const canvas = card.querySelector('canvas');
    charts[combo.key] = buildChart(canvas, combo, scale, filterPairs);
  });
}

document.getElementById('add-group').addEventListener('click', () => {
  const input = document.getElementById('new-group-name');
  const label = input.value.trim();
  if (!label) return;
  const id = (groups.reduce((m, g) => Math.max(m, g.id), 0) || 0) + 1;
  const color = GROUP_PALETTE[(groups.length) % GROUP_PALETTE.length];
  groups.push({ id, label, color });
  activeGroupId = id;
  input.value = '';
  saveState(); renderGroupList(); renderGrid();
});
document.getElementById('export-json').addEventListener('click', () => {
  const out = groups.map(g => ({
    id: g.id,
    label: g.label,
    members: Object.keys(assignments).filter(k => assignments[k] === g.id),
  }));
  const blob = new Blob([JSON.stringify(out, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = 'manual_groups.json'; a.click();
  URL.revokeObjectURL(url);
});
document.getElementById('reset-groups').addEventListener('click', () => {
  if (!confirm('모든 그룹/배정을 초기화합니다.')) return;
  groups = []; assignments = {}; activeGroupId = null;
  ensureDefaultGroups();
  saveState(); renderGroupList(); renderGrid();
});
document.getElementById('role-filter').addEventListener('change', renderGrid);
document.getElementById('search').addEventListener('input', renderGrid);
document.getElementById('scale').addEventListener('change', renderGrid);
document.getElementById('filter-pairs').addEventListener('change', renderGrid);

loadState(); ensureDefaultGroups();
renderGroupList(); renderGrid();
</script>
</body>
</html>`;

fs.writeFileSync(OUTPUT, html);
console.log(`✓ HTML written: ${OUTPUT}`);
console.log(`  file:///${OUTPUT}`);
