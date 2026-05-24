// rangers/visualization_above_avg_cards.html 에 "전체 캐릭터 핑거프린트 오버레이" 섹션 추가.
// 큰 레이더 1개 + 캐릭터별 토글 칩.
// idempotent: 마커 발견 시 삭제 후 재삽입.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..", "..", "DATA", "trio-role-combinations");
const TARGET_FILE = path.join(ROOT, "rangers", "visualization_above_avg_cards.html");
const MARKER = "<!-- OVERLAY_FINGERPRINT_SECTION -->";

const PARTNER_ROLES_JS = JSON.stringify(["탱커", "원거리 딜러", "스킬딜러", "전사", "지원가", "암살자"]);

const SNIPPET = `
${MARKER}
<style>
.ov-section{background:var(--surface, #1a1f29);border:1px solid var(--border, #2a3140);
            border-radius:12px;padding:18px;margin-top:24px;}
.ov-section h2{margin:0 0 6px;font-size:1.1rem;}
.ov-section .desc{color:var(--muted, #8b94a3);font-size:0.82rem;margin-bottom:14px;}
.ov-section .ctrls{display:flex;flex-wrap:wrap;gap:10px;margin-bottom:12px;align-items:center;
                   background:#0f1419;border:1px solid var(--border, #2a3140);border-radius:6px;padding:8px;}
.ov-section .ctrls label{color:var(--muted, #8b94a3);font-size:0.8rem;display:flex;align-items:center;gap:5px;}
.ov-section .ctrls input[type="number"]{
  background:#0f1419;color:var(--fg, #e6e8ec);border:1px solid var(--border, #2a3140);
  border-radius:4px;padding:3px 8px;font-size:0.8rem;width:60px;}
.ov-section .ctrls button{background:var(--primary, #4f86ff);color:white;border:none;border-radius:4px;
                          padding:4px 12px;cursor:pointer;font-size:0.78rem;}
.ov-chart-wrap{position:relative;height:560px;background:#0f1419;border:1px solid var(--border, #2a3140);
               border-radius:8px;padding:10px;margin-bottom:12px;}
.ov-chip-list{display:flex;gap:5px;flex-wrap:wrap;}
.ov-chip{display:inline-flex;align-items:center;gap:5px;padding:4px 10px;border-radius:18px;
         font-size:0.74rem;cursor:pointer;border:2px solid transparent;color:white;
         user-select:none;transition:opacity 0.15s;}
.ov-chip[data-off="true"]{opacity:0.25;}
.ov-chip .swatch{width:8px;height:8px;border-radius:2px;display:inline-block;}
</style>

<section class="ov-section">
  <h2>🧬 전체 캐릭터 핑거프린트 오버레이</h2>
  <p class="desc">
    이 페이지 직업군 (<strong style="color:var(--fg, #e6e8ec)" id="ov-focus-role"></strong>) 의 모든 캐릭터를 한 레이더에 중첩.
    아래 칩 클릭 = 그 캐릭터 보이기/숨기기 토글. 비슷한 모양 = 비슷한 시너지 패턴.
  </p>
  <div class="ctrls">
    <label>스케일 (±): <input id="ov-scale" type="number" value="2" min="0.5" step="0.5"/></label>
    <label>top-N multiset: <input id="ov-topn" type="number" value="20" min="3" max="40"/></label>
    <label><input id="ov-fill" type="checkbox"/> 폴리곤 채움</label>
    <label><input id="ov-deviation" type="checkbox"/> 코호트 평균 차감 (캐릭터 고유 시그널만)</label>
    <button id="ov-all-on">전부 켜기</button>
    <button id="ov-all-off" style="background:#6b7280">전부 끄기</button>
    <span style="color:var(--muted, #8b94a3);font-size:0.78rem;margin-left:auto" id="ov-count"></span>
  </div>
  <div class="ov-chart-wrap"><canvas id="ov-chart"></canvas></div>
  <div class="ov-chip-list" id="ov-chip-list"></div>
</section>

<script>
(function(){
  if (typeof DATA === 'undefined' || !DATA.combos) return;
  const FOCUS_ROLE = DATA.focusRole || '';
  document.getElementById('ov-focus-role').textContent = FOCUS_ROLE;

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

  // 큰 팔레트 — 캐릭터별 고유 색
  const PALETTE = [
    "#60a5fa","#34d399","#fbbf24","#a78bfa","#f87171","#22d3ee",
    "#fb923c","#facc15","#86efac","#fda4af","#7dd3fc","#818cf8",
    "#fcd34d","#a3e635","#f472b6","#5eead4","#c084fc","#fb7185",
    "#bef264","#67e8f9","#f9a8d4","#fde047","#93c5fd","#6ee7b7",
  ];

  const STORAGE_KEY = 'ov-visible-' + FOCUS_ROLE;
  let visibility = {};
  try { visibility = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}'); } catch(e) {}

  const combos = DATA.combos.slice().sort((a, b) => b.totalGames - a.totalGames);
  combos.forEach((c, i) => {
    const key = c.characterCode + '_' + c.weapon;
    if (visibility[key] === undefined) visibility[key] = true;
  });

  function comboLabel(c) {
    return c.characterName + ' ' + (c.weaponsString || '');
  }

  let chart;
  function buildChart() {
    const scale = parseFloat(document.getElementById('ov-scale').value) || 2;
    const topN = parseInt(document.getElementById('ov-topn').value, 10) || 20;
    const fill = document.getElementById('ov-fill').checked;
    const deviation = document.getElementById('ov-deviation').checked;

    // 모든 캐릭터의 raw affinity 계산
    const allAff = combos.map(c => comboPairAffinity(c, topN));
    // 코호트 평균 (페어별)
    const cohortMean = {};
    PAIRS.forEach(([a,b]) => {
      const k = pairKey(a,b);
      const sum = allAff.reduce((s, aff) => s + (aff[k] || 0), 0);
      cohortMean[k] = sum / allAff.length;
    });

    const datasets = combos.map((c, i) => {
      const key = c.characterCode + '_' + c.weapon;
      const color = PALETTE[i % PALETTE.length];
      const aff = allAff[i];
      const data = PAIRS.map(([a,b]) => {
        const k = pairKey(a,b);
        const v = aff[k] || 0;
        return deviation ? v - cohortMean[k] : v;
      });
      return {
        label: comboLabel(c),
        data,
        backgroundColor: fill ? color + '20' : 'transparent',
        borderColor: color,
        borderWidth: 1.6,
        pointRadius: 1.8,
        pointBackgroundColor: color,
        hidden: !visibility[key],
        _key: key,
      };
    });

    if (chart) chart.destroy();
    chart = new Chart(document.getElementById('ov-chart'), {
      type: 'radar',
      data: { labels: PAIRS.map(([a,b]) => pairLabel(a,b)), datasets },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: (ctx) => ctx.dataset.label + ' · ' + ctx.label + ': ' + ctx.parsed.r.toFixed(2) + ' RP',
            },
          },
        },
        scales: {
          r: {
            suggestedMin: -scale, suggestedMax: scale,
            angleLines: { color: '#2a3140' },
            grid: { color: '#2a3140' },
            pointLabels: { color: '#e6e8ec', font: { size: 10 } },
            ticks: { color: '#8b94a3', backdropColor: 'transparent', font: { size: 9 } },
          },
        },
      },
    });
    updateCount();
  }

  function renderChips() {
    const list = document.getElementById('ov-chip-list');
    list.innerHTML = '';
    combos.forEach((c, i) => {
      const key = c.characterCode + '_' + c.weapon;
      const color = PALETTE[i % PALETTE.length];
      const chip = document.createElement('span');
      chip.className = 'ov-chip';
      chip.style.background = color + '24';
      chip.style.color = color;
      chip.style.borderColor = color + '88';
      chip.dataset.off = String(!visibility[key]);
      chip.innerHTML = '<span class="swatch" style="background:' + color + '"></span>' + comboLabel(c);
      chip.addEventListener('click', () => {
        visibility[key] = !visibility[key];
        try { localStorage.setItem(STORAGE_KEY, JSON.stringify(visibility)); } catch(e) {}
        chip.dataset.off = String(!visibility[key]);
        const ds = chart.data.datasets.find(d => d._key === key);
        if (ds) { ds.hidden = !visibility[key]; chart.update(); updateCount(); }
      });
      list.appendChild(chip);
    });
  }

  function updateCount() {
    const on = combos.filter(c => visibility[c.characterCode + '_' + c.weapon]).length;
    document.getElementById('ov-count').textContent = on + ' / ' + combos.length + ' 표시 중';
  }

  document.getElementById('ov-all-on').addEventListener('click', () => {
    combos.forEach(c => { visibility[c.characterCode + '_' + c.weapon] = true; });
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(visibility)); } catch(e) {}
    chart.data.datasets.forEach(d => { d.hidden = false; });
    chart.update();
    renderChips();
    updateCount();
  });
  document.getElementById('ov-all-off').addEventListener('click', () => {
    combos.forEach(c => { visibility[c.characterCode + '_' + c.weapon] = false; });
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(visibility)); } catch(e) {}
    chart.data.datasets.forEach(d => { d.hidden = true; });
    chart.update();
    renderChips();
    updateCount();
  });
  document.getElementById('ov-scale').addEventListener('change', buildChart);
  document.getElementById('ov-topn').addEventListener('change', buildChart);
  document.getElementById('ov-fill').addEventListener('change', buildChart);
  document.getElementById('ov-deviation').addEventListener('change', buildChart);

  buildChart();
  renderChips();
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
console.log("✓ rangers 페이지에 오버레이 핑거프린트 섹션 추가");
