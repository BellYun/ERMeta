// rangers/visualization_above_avg_cards.html 에 전체 캐릭터 미니 핑거프린트 + 수동 그룹화 섹션 추가.
// DATA.combos 를 그대로 사용 (이미 그 역할 데이터만 들어있음).
// idempotent: 마커 발견 시 삭제 후 재삽입.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..", "..", "DATA", "trio-role-combinations");
const TARGET_FILE = path.join(ROOT, "rangers", "visualization_above_avg_cards.html");
const MARKER = "<!-- MANUAL_GROUPING_SECTION -->";

const PARTNER_ROLES_JS = JSON.stringify(["탱커", "원거리 딜러", "스킬딜러", "전사", "지원가", "암살자"]);

const SNIPPET = `
${MARKER}
<style>
.mg-section{background:var(--surface, #1a1f29);border:1px solid var(--border, #2a3140);
            border-radius:12px;padding:18px;margin-top:24px;}
.mg-section h2{margin:0 0 6px;font-size:1.1rem;}
.mg-section .desc{color:var(--muted, #8b94a3);font-size:0.82rem;margin-bottom:14px;}
.mg-section .ctrls{display:flex;flex-wrap:wrap;gap:10px;margin-bottom:14px;align-items:center;
                   background:#0f1419;border:1px solid var(--border, #2a3140);border-radius:6px;padding:8px;}
.mg-section .ctrls label{color:var(--muted, #8b94a3);font-size:0.8rem;display:flex;align-items:center;gap:5px;}
.mg-section .ctrls input[type="text"],.mg-section .ctrls input[type="number"]{
  background:#0f1419;color:var(--fg, #e6e8ec);border:1px solid var(--border, #2a3140);
  border-radius:4px;padding:3px 8px;font-size:0.8rem;}
.mg-section .ctrls button{background:var(--primary, #4f86ff);color:white;border:none;border-radius:4px;
                          padding:4px 12px;cursor:pointer;font-size:0.78rem;}
.mg-groups-panel{background:#0f1419;border:1px solid var(--border, #2a3140);border-radius:6px;
                 padding:10px;margin-bottom:14px;}
.mg-group-list{display:flex;gap:6px;flex-wrap:wrap;align-items:center;}
.mg-group-chip{display:inline-flex;align-items:center;gap:5px;padding:3px 10px;
               border-radius:4px;font-size:0.74rem;color:white;cursor:pointer;
               border:2px solid transparent;}
.mg-group-chip.active{border-color:var(--fg, #e6e8ec);}
.mg-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:8px;}
.mg-card{background:#232936;border:2px solid var(--border, #2a3140);border-radius:6px;padding:6px;
         cursor:pointer;transition:transform 0.1s,border-color 0.15s;}
.mg-card:hover{transform:translateY(-1px);border-color:var(--primary, #4f86ff);}
.mg-card .ttl{font-size:0.78rem;font-weight:600;color:var(--fg, #e6e8ec);}
.mg-card .meta{font-size:0.62rem;color:var(--muted, #8b94a3);}
.mg-card .grp-badge{display:inline-block;font-size:0.55rem;font-weight:bold;padding:1px 5px;
                    border-radius:3px;margin-left:4px;color:white;vertical-align:middle;}
.mg-chart-wrap{position:relative;height:160px;margin-top:4px;}
</style>

<section class="mg-section">
  <h2>🧬 전체 캐릭터 미니 핑거프린트 + 수동 그룹화</h2>
  <p class="desc">
    이 페이지의 직업군(<strong style="color:var(--fg, #e6e8ec)" id="mg-focus-role"></strong>) 전체 캐릭터 21-페어 핑거프린트.
    카드 클릭 = 활성 그룹에 배정. 그룹 칩 클릭 = 활성 그룹 변경. 결과는 브라우저 localStorage 에 자동 저장 + JSON export 가능.
  </p>

  <div class="ctrls">
    <label>검색: <input id="mg-search" type="text" placeholder="이름/무기" style="width:140px"/></label>
    <label>스케일 (±): <input id="mg-scale" type="number" value="2" min="0.5" step="0.5" style="width:60px"/></label>
    <label>top-N multiset: <input id="mg-topn" type="number" value="20" min="3" max="40" style="width:60px"/></label>
    <button id="mg-export">그룹 JSON 내보내기</button>
    <button id="mg-reset" style="background:#f87171">전체 리셋</button>
    <span style="color:var(--muted, #8b94a3);font-size:0.78rem;margin-left:auto" id="mg-count"></span>
  </div>

  <div class="mg-groups-panel">
    <div style="font-size:0.78rem;color:var(--muted, #8b94a3);margin-bottom:6px">활성 그룹:</div>
    <div class="mg-group-list" id="mg-group-list"></div>
    <div style="margin-top:8px;display:flex;gap:6px;align-items:center;font-size:0.75rem">
      <input id="mg-new-name" type="text" placeholder="새 그룹 라벨 (예: 스킬딜러 친화)"
             style="flex:1;background:#0f1419;color:var(--fg, #e6e8ec);border:1px solid var(--border, #2a3140);border-radius:4px;padding:4px 8px"/>
      <button id="mg-add-group" style="background:var(--primary, #4f86ff);color:white;border:none;border-radius:4px;padding:4px 12px;cursor:pointer">그룹 추가</button>
    </div>
  </div>

  <div id="mg-grid" class="mg-grid"></div>
</section>

<script>
(function(){
  if (typeof DATA === 'undefined' || !DATA.combos) return;
  const FOCUS_ROLE = DATA.focusRole || '';
  document.getElementById('mg-focus-role').textContent = FOCUS_ROLE;

  const PARTNER_ROLES = ${PARTNER_ROLES_JS};
  const ROLE_SHORT = {"탱커":"탱","원거리 딜러":"원딜","스킬딜러":"스딜","전사":"전사","지원가":"지원","암살자":"암살"};
  const PAIRS = [];
  for (let i = 0; i < PARTNER_ROLES.length; i++) {
    for (let j = i; j < PARTNER_ROLES.length; j++) PAIRS.push([PARTNER_ROLES[i], PARTNER_ROLES[j]]);
  }
  const pairKey = (a,b) => [a,b].sort().join('|');
  const pairLabel = (a,b) => ROLE_SHORT[a] + '+' + ROLE_SHORT[b];

  function partnerPair(multiset, focusRole) {
    const roles = multiset.split(' + ').map(s => s.trim());
    const idx = roles.indexOf(focusRole);
    if (idx >= 0) roles.splice(idx, 1);
    if (roles.length !== 2) return null;
    if (!PARTNER_ROLES.includes(roles[0]) || !PARTNER_ROLES.includes(roles[1])) return null;
    return [...roles].sort();
  }

  function comboPairAffinity(combo, topN) {
    const above = (combo.aboveMultisets || []).slice(0, topN);
    const below = (combo.belowMultisets || []).slice(0, topN);
    const all = [...above, ...below];
    const acc = {};
    all.forEach(c => {
      const pp = partnerPair(c.multiset, FOCUS_ROLE);
      if (!pp) return;
      const k = pp.join('|');
      if (!acc[k]) acc[k] = { sum: 0, weight: 0 };
      const sqrtG = Math.sqrt(c.games || 0);
      acc[k].sum += (c.delta || 0) * sqrtG;
      acc[k].weight += sqrtG;
    });
    const out = {};
    Object.keys(acc).forEach(k => { out[k] = acc[k].weight > 0 ? acc[k].sum / acc[k].weight : 0; });
    return out;
  }

  const STORAGE_KEY = 'mg-state-' + FOCUS_ROLE;
  const GROUP_PALETTE = ["#4f86ff","#34d399","#fbbf24","#a78bfa","#f87171","#22d3ee","#fb923c","#facc15","#86efac","#fda4af","#7dd3fc","#818cf8"];
  let groups = [];
  let assignments = {};
  let activeGroupId = null;
  let charts = {};

  function loadState() {
    try {
      const s = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
      groups = s.groups || [];
      assignments = s.assignments || {};
      activeGroupId = s.activeGroupId || null;
    } catch(e) {}
  }
  function saveState() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ groups, assignments, activeGroupId }));
  }
  function ensureDefaultGroups() {
    if (groups.length === 0) {
      groups = [{ id: 1, label: '미분류', color: GROUP_PALETTE[0] }];
      activeGroupId = 1;
    }
  }

  function renderGroupList() {
    const list = document.getElementById('mg-group-list');
    list.innerHTML = '';
    groups.forEach(g => {
      const count = Object.values(assignments).filter(a => a === g.id).length;
      const chip = document.createElement('span');
      chip.className = 'mg-group-chip' + (g.id === activeGroupId ? ' active' : '');
      chip.style.background = g.color;
      chip.innerHTML = g.label + ' (' + count + ')';
      chip.addEventListener('click', () => { activeGroupId = g.id; saveState(); renderGroupList(); renderGrid(); });
      list.appendChild(chip);
    });
    if (groups.length > 1) {
      const rm = document.createElement('button');
      rm.textContent = '활성 그룹 삭제';
      rm.style.cssText = 'background:#f87171;color:white;border:none;border-radius:4px;padding:3px 8px;cursor:pointer;font-size:0.68rem';
      rm.addEventListener('click', () => {
        if (!confirm('활성 그룹을 삭제하시겠습니까?')) return;
        const rid = activeGroupId;
        groups = groups.filter(g => g.id !== rid);
        Object.keys(assignments).forEach(k => { if (assignments[k] === rid) delete assignments[k]; });
        activeGroupId = groups[0]?.id ?? null;
        saveState(); renderGroupList(); renderGrid();
      });
      list.appendChild(rm);
    }
  }

  function renderGrid() {
    const grid = document.getElementById('mg-grid');
    Object.values(charts).forEach(c => { try { c.destroy(); } catch(e) {} });
    charts = {};
    grid.innerHTML = '';
    const search = document.getElementById('mg-search').value.trim().toLowerCase();
    const scale = parseFloat(document.getElementById('mg-scale').value) || 2;
    const topN = parseInt(document.getElementById('mg-topn').value, 10) || 20;

    const filtered = DATA.combos.filter(c =>
      !search || (c.characterName + ' ' + (c.weaponsString || '')).toLowerCase().includes(search)
    );
    document.getElementById('mg-count').textContent = filtered.length + ' / ' + DATA.combos.length + '개 표시';

    filtered.forEach(combo => {
      const key = combo.characterCode + '_' + combo.weapon;
      const card = document.createElement('div');
      card.className = 'mg-card';
      const gid = assignments[key];
      const g = groups.find(g => g.id === gid);
      if (g) { card.style.borderColor = g.color; }
      const badge = g ? '<span class="grp-badge" style="background:' + g.color + '">' + g.label + '</span>' : '';
      card.innerHTML =
        '<div class="ttl">' + combo.characterName + ' <span style="color:#8b94a3;font-weight:normal">· ' + (combo.weaponsString || '') + '</span>' + badge + '</div>' +
        '<div class="meta">' + combo.totalGames.toLocaleString('ko-KR') + '판 · own ' + combo.ownMeanRP + '</div>' +
        '<div class="mg-chart-wrap"><canvas></canvas></div>';
      card.addEventListener('click', () => {
        if (activeGroupId == null) return;
        if (assignments[key] === activeGroupId) delete assignments[key];
        else assignments[key] = activeGroupId;
        saveState(); renderGroupList(); renderGrid();
      });
      grid.appendChild(card);

      const aff = comboPairAffinity(combo, topN);
      const values = PAIRS.map(([a,b]) => aff[pairKey(a,b)] || 0);
      const canvas = card.querySelector('canvas');
      charts[key] = new Chart(canvas, {
        type: 'radar',
        data: { labels: PAIRS.map(([a,b]) => pairLabel(a,b)), datasets: [{
          label: combo.characterName,
          data: values,
          backgroundColor: 'rgba(96,165,250,0.22)',
          borderColor: '#60a5fa',
          borderWidth: 1.3,
          pointRadius: 1.5,
          pointBackgroundColor: '#60a5fa',
        }]},
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { display: false }, tooltip: {
            callbacks: { label: (ctx) => ctx.label + ': ' + ctx.parsed.r.toFixed(2) + ' RP' }
          }},
          scales: { r: {
            suggestedMin: -scale, suggestedMax: scale,
            angleLines: { color: '#2a3140' }, grid: { color: '#2a3140' },
            pointLabels: { color: '#e6e8ec', font: { size: 6 } },
            ticks: { color: '#8b94a3', backdropColor: 'transparent', font: { size: 6 } },
          }},
        },
      });
    });
  }

  document.getElementById('mg-add-group').addEventListener('click', () => {
    const input = document.getElementById('mg-new-name');
    const label = input.value.trim();
    if (!label) return;
    const id = (groups.reduce((m, g) => Math.max(m, g.id), 0) || 0) + 1;
    const color = GROUP_PALETTE[(groups.length) % GROUP_PALETTE.length];
    groups.push({ id, label, color });
    activeGroupId = id;
    input.value = '';
    saveState(); renderGroupList(); renderGrid();
  });
  document.getElementById('mg-export').addEventListener('click', () => {
    const out = {
      focusRole: FOCUS_ROLE,
      groups: groups.map(g => ({
        id: g.id, label: g.label,
        members: Object.keys(assignments).filter(k => assignments[k] === g.id),
      })),
    };
    const blob = new Blob([JSON.stringify(out, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'manual_groups_' + FOCUS_ROLE + '.json'; a.click();
    URL.revokeObjectURL(url);
  });
  document.getElementById('mg-reset').addEventListener('click', () => {
    if (!confirm('전체 그룹/배정 리셋?')) return;
    groups = []; assignments = {}; activeGroupId = null;
    ensureDefaultGroups();
    saveState(); renderGroupList(); renderGrid();
  });
  document.getElementById('mg-search').addEventListener('input', renderGrid);
  document.getElementById('mg-scale').addEventListener('change', renderGrid);
  document.getElementById('mg-topn').addEventListener('change', renderGrid);

  loadState(); ensureDefaultGroups();
  renderGroupList(); renderGrid();
})();
</script>
`;

if (!fs.existsSync(TARGET_FILE)) {
  console.error("✗ target not found:", TARGET_FILE);
  process.exit(1);
}
let html = fs.readFileSync(TARGET_FILE, "utf-8");
const markerIdx = html.indexOf(MARKER);
if (markerIdx !== -1) {
  const before = html.slice(0, markerIdx);
  const afterStart = html.indexOf("</section>", markerIdx);
  const scriptEnd = html.indexOf("</script>", afterStart);
  const cutEnd = scriptEnd + "</script>".length;
  html = before + html.slice(cutEnd);
}
if (!html.includes("</body>")) {
  console.error("✗ </body> 없음");
  process.exit(1);
}
html = html.replace("</body>", SNIPPET + "\n</body>");
fs.writeFileSync(TARGET_FILE, html);
console.log("✓ rangers 페이지에 수동 그룹화 섹션 추가");
