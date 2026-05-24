// rangers 페이지에 사용자가 손수 정의한 수제 그룹의 핑거프린트 비교 섹션 추가.
// 그룹 1: 리오(31) 활(7) + 카티야(72) 저격총(11)
// 그룹 2: 로지(21) 권총(9) + 츠바메(70) 암기(6)
// idempotent: 마커 발견 시 삭제 후 재삽입.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..", "..", "DATA", "trio-role-combinations");
const TARGET_FILE = path.join(ROOT, "rangers", "visualization_above_avg_cards.html");
const MARKER = "<!-- HANDCRAFTED_GROUPS_SECTION -->";

const HANDCRAFTED_GROUPS = [
  {
    id: 1,
    label: "리오 + 카티야",
    color: "#60a5fa",
    members: ["31_7", "72_11"],
  },
  {
    id: 2,
    label: "로지 + 츠바메",
    color: "#fbbf24",
    members: ["21_9", "70_6"],
  },
];

const PARTNER_ROLES_JS = JSON.stringify(["탱커", "원거리 딜러", "스킬딜러", "전사", "지원가", "암살자"]);
const GROUPS_JS = JSON.stringify(HANDCRAFTED_GROUPS);

const SNIPPET = `
${MARKER}
<style>
.hc-section{background:var(--surface, #1a1f29);border:1px solid var(--border, #2a3140);
            border-radius:12px;padding:18px;margin-top:24px;}
.hc-section h2{margin:0 0 6px;font-size:1.1rem;}
.hc-section .desc{color:var(--muted, #8b94a3);font-size:0.82rem;margin-bottom:14px;}
.hc-grid{display:grid;grid-template-columns:repeat(auto-fit, minmax(360px, 1fr));gap:14px;}
.hc-card{background:#232936;border:2px solid var(--border, #2a3140);border-radius:8px;padding:14px;}
.hc-card .ttl{font-size:1rem;font-weight:700;margin-bottom:4px;color:var(--fg, #e6e8ec);}
.hc-card .sub{font-size:0.72rem;color:var(--muted, #8b94a3);margin-bottom:10px;}
.hc-chart-wrap{position:relative;height:380px;}
.hc-ctrls{display:flex;gap:8px;margin-bottom:12px;align-items:center;font-size:0.78rem;color:var(--muted, #8b94a3);
          background:#0f1419;border:1px solid var(--border, #2a3140);border-radius:6px;padding:6px 10px;}
.hc-ctrls input{background:#0f1419;color:var(--fg, #e6e8ec);border:1px solid var(--border, #2a3140);
                border-radius:4px;padding:3px 8px;font-size:0.78rem;width:55px;}
</style>

<section class="hc-section">
  <h2>🧬 수제 그룹 비교 (리오+카티야 vs 로지+츠바메)</h2>
  <p class="desc">
    수동으로 정의한 2개 그룹의 21-페어 핑거프린트. 굵은 채움 = 그룹 평균, 얇은 선 = 멤버 개별.
    두 그룹의 모양 차이 = "그룹 정체성" 차이.
  </p>
  <div class="hc-ctrls">
    <label>스케일 (±): <input id="hc-scale" type="number" value="2" min="0.5" step="0.5"/></label>
    <label>top-N multiset: <input id="hc-topn" type="number" value="20" min="3" max="40"/></label>
  </div>
  <div id="hc-grid" class="hc-grid"></div>
</section>

<script>
(function(){
  if (typeof DATA === 'undefined' || !DATA.combos) return;
  const FOCUS_ROLE = DATA.focusRole || '';
  const PARTNER_ROLES = ${PARTNER_ROLES_JS};
  const ROLE_SHORT = {"탱커":"탱","원거리 딜러":"원딜","스킬딜러":"스딜","전사":"전사","지원가":"지원","암살자":"암살"};
  const PAIRS = [];
  for (let i = 0; i < PARTNER_ROLES.length; i++) {
    for (let j = i; j < PARTNER_ROLES.length; j++) PAIRS.push([PARTNER_ROLES[i], PARTNER_ROLES[j]]);
  }
  const GROUPS = ${GROUPS_JS};
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

  function affinity(combos, topN) {
    const acc = {};
    combos.forEach(combo => {
      const above = (combo.aboveMultisets || []).slice(0, topN);
      const below = (combo.belowMultisets || []).slice(0, topN);
      [...above, ...below].forEach(c => {
        const pp = partnerPair(c.multiset, FOCUS_ROLE);
        if (!pp) return;
        const k = pp.join('|');
        if (!acc[k]) acc[k] = { sum: 0, weight: 0 };
        const sqrtG = Math.sqrt(c.games || 0);
        acc[k].sum += (c.delta || 0) * sqrtG;
        acc[k].weight += sqrtG;
      });
    });
    const out = {};
    Object.keys(acc).forEach(k => { out[k] = acc[k].weight > 0 ? acc[k].sum / acc[k].weight : 0; });
    return out;
  }

  const byKey = new Map();
  DATA.combos.forEach(c => byKey.set(c.characterCode + '_' + c.weapon, c));

  const MEMBER_PALETTE = ['#4ade80', '#fbbf24', '#a78bfa', '#f87171', '#22d3ee', '#fb923c'];

  let charts = [];
  function render() {
    const scale = parseFloat(document.getElementById('hc-scale').value) || 2;
    const topN = parseInt(document.getElementById('hc-topn').value, 10) || 20;
    const grid = document.getElementById('hc-grid');
    charts.forEach(c => { try { c.destroy(); } catch(e) {} });
    charts = [];
    grid.innerHTML = '';

    GROUPS.forEach((g, gi) => {
      const members = g.members.map(k => byKey.get(k)).filter(Boolean);
      if (!members.length) return;
      const groupAff = affinity(members, topN);
      const groupValues = PAIRS.map(([a,b]) => groupAff[pairKey(a,b)] || 0);
      const totalGames = members.reduce((s, m) => s + (m.totalGames || 0), 0);
      const memberStr = members.map(m => m.characterName + ' ' + (m.weaponsString || '')).join(', ');

      const card = document.createElement('div');
      card.className = 'hc-card';
      card.style.borderColor = g.color;
      card.innerHTML =
        '<div class="ttl" style="color:' + g.color + '">그룹 ' + g.id + ' · ' + g.label + '</div>' +
        '<div class="sub">멤버: ' + memberStr + ' · 합산 ' + totalGames.toLocaleString('ko-KR') + '판</div>' +
        '<div class="hc-chart-wrap"><canvas id="hc-chart-' + gi + '"></canvas></div>';
      grid.appendChild(card);

      const datasets = [
        {
          label: '그룹 평균',
          data: groupValues,
          backgroundColor: g.color + '24',
          borderColor: g.color,
          borderWidth: 2,
          pointRadius: 3,
          pointBackgroundColor: g.color,
        },
      ];
      members.forEach((m, mi) => {
        const aff = affinity([m], topN);
        const data = PAIRS.map(([a,b]) => aff[pairKey(a,b)] || 0);
        datasets.push({
          label: m.characterName + ' ' + (m.weaponsString || ''),
          data,
          backgroundColor: 'transparent',
          borderColor: MEMBER_PALETTE[mi % MEMBER_PALETTE.length],
          borderWidth: 1,
          pointRadius: 1.5,
          pointBackgroundColor: MEMBER_PALETTE[mi % MEMBER_PALETTE.length],
        });
      });

      const chart = new Chart(document.getElementById('hc-chart-' + gi), {
        type: 'radar',
        data: { labels: PAIRS.map(([a,b]) => pairLabel(a,b)), datasets },
        options: {
          responsive: true, maintainAspectRatio: false,
          plugins: {
            legend: { position: 'bottom', labels: { color: '#e6e8ec', font: { size: 9 }, boxWidth: 8, padding: 4 } },
            tooltip: { callbacks: { label: (ctx) => ctx.dataset.label + ' · ' + ctx.label + ': ' + ctx.parsed.r.toFixed(2) + ' RP' } },
          },
          scales: {
            r: {
              suggestedMin: -scale, suggestedMax: scale,
              angleLines: { color: '#2a3140' }, grid: { color: '#2a3140' },
              pointLabels: { color: '#e6e8ec', font: { size: 10 } },
              ticks: { color: '#8b94a3', backdropColor: 'transparent', font: { size: 9 } },
            },
          },
        },
      });
      charts.push(chart);
    });
  }

  document.getElementById('hc-scale').addEventListener('change', render);
  document.getElementById('hc-topn').addEventListener('change', render);
  render();
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
console.log("✓ 수제 그룹 비교 섹션 추가:");
HANDCRAFTED_GROUPS.forEach(g => console.log("  · 그룹", g.id, ":", g.label, "(" + g.members.join(", ") + ")"));
