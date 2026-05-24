// rangers 페이지에 캐릭터 페어별 cosine 유사도 매트릭스 섹션 추가.
// 코호트 평균 차감 → 캐릭터 고유 시그널만으로 유사도 계산.
// idempotent.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..", "..", "DATA", "trio-role-combinations");
const TARGET_FILE = path.join(ROOT, "rangers", "visualization_above_avg_cards.html");
const MARKER = "<!-- SIMILARITY_MATRIX_SECTION -->";

const PARTNER_ROLES_JS = JSON.stringify(["탱커", "원거리 딜러", "스킬딜러", "전사", "지원가", "암살자"]);

const SNIPPET = `
${MARKER}
<style>
.sim-section{background:var(--surface, #1a1f29);border:1px solid var(--border, #2a3140);
             border-radius:12px;padding:18px;margin-top:24px;}
.sim-section h2{margin:0 0 6px;font-size:1.1rem;}
.sim-section .desc{color:var(--muted, #8b94a3);font-size:0.82rem;margin-bottom:14px;}
.sim-ctrls{display:flex;gap:10px;margin-bottom:12px;align-items:center;font-size:0.78rem;color:var(--muted, #8b94a3);
           background:#0f1419;border:1px solid var(--border, #2a3140);border-radius:6px;padding:6px 10px;flex-wrap:wrap;}
.sim-ctrls input[type="number"]{background:#0f1419;color:var(--fg, #e6e8ec);border:1px solid var(--border, #2a3140);
                                border-radius:4px;padding:3px 8px;font-size:0.78rem;width:55px;}
.sim-table{border-collapse:collapse;font-size:0.7rem;margin-bottom:12px;}
.sim-table th,.sim-table td{padding:3px 4px;text-align:center;border:1px solid #1a1f29;}
.sim-table th{color:var(--muted, #8b94a3);font-weight:500;background:#0f1419;writing-mode:vertical-rl;
              text-orientation:mixed;white-space:nowrap;height:80px;}
.sim-table th.row-label{writing-mode:horizontal-tb;text-align:right;padding-right:6px;
                        width:120px;height:auto;color:var(--fg, #e6e8ec);background:transparent;}
.sim-table td{font-family:monospace;font-size:0.65rem;color:white;min-width:28px;cursor:default;}
.sim-pairs{display:grid;grid-template-columns:1fr 1fr;gap:14px;}
.sim-list{background:#0f1419;border:1px solid var(--border, #2a3140);border-radius:6px;padding:10px;}
.sim-list h3{margin:0 0 8px;font-size:0.85rem;}
.sim-list ul{list-style:none;padding:0;margin:0;font-size:0.78rem;}
.sim-list li{padding:3px 0;display:flex;justify-content:space-between;gap:8px;border-bottom:1px solid #1a1f29;}
.sim-list li:last-child{border-bottom:none;}
.sim-list .name{color:var(--fg, #e6e8ec);}
.sim-list .val{font-family:monospace;color:var(--muted, #8b94a3);}
</style>

<section class="sim-section">
  <h2>🧬 캐릭터 페어 유사도 매트릭스</h2>
  <p class="desc">
    각 캐릭터의 21-페어 affinity 벡터를 코호트 평균 차감 후 cosine 유사도 계산.
    셀 색 = +1 (완전 동일, 진한 초록) ~ -1 (완전 반대, 진한 빨강). 0 = 무관.
    가장 비슷한 페어 / 가장 다른 페어를 자동 추출.
  </p>
  <div class="sim-ctrls">
    <label>top-N multiset: <input id="sim-topn" type="number" value="20" min="3" max="40"/></label>
    <label><input id="sim-subtract" type="checkbox" checked /> 코호트 평균 차감</label>
    <span style="margin-left:auto" id="sim-info"></span>
  </div>
  <div style="overflow-x:auto;margin-bottom:14px"><table class="sim-table" id="sim-table"></table></div>
  <div class="sim-pairs">
    <div class="sim-list">
      <h3 style="color:var(--success, #4ade80)">✓ 가장 비슷한 페어 Top 10</h3>
      <ul id="sim-top"></ul>
    </div>
    <div class="sim-list">
      <h3 style="color:var(--danger, #f87171)">✗ 가장 다른 페어 Top 10</h3>
      <ul id="sim-bottom"></ul>
    </div>
  </div>
</section>

<script>
(function(){
  if (typeof DATA === 'undefined' || !DATA.combos) return;
  const FOCUS_ROLE = DATA.focusRole || '';
  const PARTNER_ROLES = ${PARTNER_ROLES_JS};
  const PAIRS = [];
  for (let i = 0; i < PARTNER_ROLES.length; i++) {
    for (let j = i; j < PARTNER_ROLES.length; j++) PAIRS.push([PARTNER_ROLES[i], PARTNER_ROLES[j]]);
  }
  const pairKey = (a,b) => [a,b].sort().join('|');

  function partnerPair(multiset, focusRole) {
    const roles = multiset.split(' + ').map(s => s.trim());
    const idx = roles.indexOf(focusRole);
    if (idx >= 0) roles.splice(idx, 1);
    if (roles.length !== 2) return null;
    if (!PARTNER_ROLES.includes(roles[0]) || !PARTNER_ROLES.includes(roles[1])) return null;
    return [...roles].sort();
  }

  function comboPairVec(combo, topN) {
    const above = (combo.aboveMultisets || []).slice(0, topN);
    const below = (combo.belowMultisets || []).slice(0, topN);
    const acc = {};
    [...above, ...below].forEach(c => {
      const pp = partnerPair(c.multiset, FOCUS_ROLE);
      if (!pp) return;
      const k = pp.join('|');
      if (!acc[k]) acc[k] = { sum: 0, weight: 0 };
      const sqrtG = Math.sqrt(c.games || 0);
      acc[k].sum += (c.delta || 0) * sqrtG;
      acc[k].weight += sqrtG;
    });
    return PAIRS.map(([a,b]) => {
      const v = acc[pairKey(a,b)];
      return v && v.weight > 0 ? v.sum / v.weight : 0;
    });
  }

  function cosine(a, b) {
    let dot = 0, na = 0, nb = 0;
    for (let i = 0; i < a.length; i++) { dot += a[i] * b[i]; na += a[i] * a[i]; nb += b[i] * b[i]; }
    const denom = Math.sqrt(na) * Math.sqrt(nb);
    return denom > 0 ? dot / denom : 0;
  }

  const combos = DATA.combos.slice().sort((a, b) => b.totalGames - a.totalGames);

  function colorForSim(v) {
    if (v > 0) {
      const a = Math.min(1, v) * 0.85;
      return 'rgba(74, 222, 128, ' + a + ')';
    }
    const a = Math.min(1, -v) * 0.85;
    return 'rgba(248, 113, 113, ' + a + ')';
  }

  function render() {
    const topN = parseInt(document.getElementById('sim-topn').value, 10) || 20;
    const subtract = document.getElementById('sim-subtract').checked;

    const vectors = combos.map(c => comboPairVec(c, topN));
    if (subtract) {
      // 코호트 평균 차감
      const mean = new Array(PAIRS.length).fill(0);
      vectors.forEach(v => v.forEach((x, i) => mean[i] += x));
      mean.forEach((_, i) => mean[i] /= vectors.length);
      vectors.forEach(v => v.forEach((_, i) => v[i] -= mean[i]));
    }

    // n×n cosine sim
    const n = combos.length;
    const sim = Array.from({ length: n }, () => new Array(n).fill(0));
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        sim[i][j] = i === j ? 1 : cosine(vectors[i], vectors[j]);
      }
    }

    // 매트릭스 렌더
    const table = document.getElementById('sim-table');
    let html = '<thead><tr><th class="row-label"></th>';
    combos.forEach(c => { html += '<th>' + c.characterName + '<br>' + (c.weaponsString || '') + '</th>'; });
    html += '</tr></thead><tbody>';
    for (let i = 0; i < n; i++) {
      html += '<tr><th class="row-label">' + combos[i].characterName + ' · ' + (combos[i].weaponsString || '') + '</th>';
      for (let j = 0; j < n; j++) {
        const v = sim[i][j];
        const bg = i === j ? 'rgba(255,255,255,0.05)' : colorForSim(v);
        const text = i === j ? '—' : (v >= 0 ? '+' : '') + v.toFixed(2);
        html += '<td style="background:' + bg + '" title="' + combos[i].characterName + ' ↔ ' + combos[j].characterName + ': ' + v.toFixed(3) + '">' + text + '</td>';
      }
      html += '</tr>';
    }
    html += '</tbody>';
    table.innerHTML = html;

    // top similar pairs
    const pairs = [];
    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        pairs.push({ a: combos[i], b: combos[j], sim: sim[i][j] });
      }
    }
    pairs.sort((a, b) => b.sim - a.sim);

    const fmtPair = (p) => p.a.characterName + ' ' + (p.a.weaponsString || '') + ' ↔ ' + p.b.characterName + ' ' + (p.b.weaponsString || '');
    document.getElementById('sim-top').innerHTML = pairs.slice(0, 10).map(p =>
      '<li><span class="name">' + fmtPair(p) + '</span><span class="val" style="color:#4ade80">' + (p.sim >= 0 ? '+' : '') + p.sim.toFixed(3) + '</span></li>'
    ).join('');
    document.getElementById('sim-bottom').innerHTML = pairs.slice(-10).reverse().map(p =>
      '<li><span class="name">' + fmtPair(p) + '</span><span class="val" style="color:#f87171">' + p.sim.toFixed(3) + '</span></li>'
    ).join('');

    document.getElementById('sim-info').textContent = n + '×' + n + ' 매트릭스 · ' + pairs.length + '쌍';
  }

  document.getElementById('sim-topn').addEventListener('change', render);
  document.getElementById('sim-subtract').addEventListener('change', render);
  render();
})();
</script>
`;

if (!fs.existsSync(TARGET_FILE)) {
  console.error("✗ target not found");
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
html = html.replace("</body>", SNIPPET + "\n</body>");
fs.writeFileSync(TARGET_FILE, html);
console.log("✓ 유사도 매트릭스 섹션 추가");
