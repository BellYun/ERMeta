// 각 role 의 visualization.html 에 21-페어 핑거프린트 섹션 append.
// idempotent: 마커 발견 시 스킵.
// run: node frontend/scripts/append-pair-fingerprint.mjs

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..", "..", "DATA", "trio-role-combinations");
const ROLES = ["rangers", "skilldealers", "tanks", "warriors"];
const MARKER = "<!-- PAIR_FINGERPRINT_SECTION -->";

const SNIPPET = `
${MARKER}
<style>
.pair-fp-section{background:var(--surface);border:1px solid var(--border);
                 border-radius:12px;padding:18px;margin-top:24px;}
.pair-fp-section h2{margin:0 0 6px;font-size:1.1rem;}
.pair-fp-section .desc{color:var(--muted);font-size:0.82rem;margin-bottom:14px;}
.pair-fp-grid{display:grid;grid-template-columns:repeat(auto-fit, minmax(340px, 1fr));gap:14px;}
.pair-fp-card{background:var(--surface-2);border:1px solid var(--border);
              border-radius:10px;padding:12px;}
.pair-fp-card h3{margin:0 0 4px;font-size:0.95rem;}
.pair-fp-card .pf-meta{color:var(--muted);font-size:0.74rem;margin-bottom:8px;}
.pair-fp-chart-wrap{position:relative;height:280px;}
</style>

<section class="pair-fp-section">
  <h2>🧬 21-페어 핑거프린트 (세분화)</h2>
  <p class="desc">
    파트너 직업 페어 21가지 (예: 탱+원딜, 스딜+스딜, ...) 를 축으로 한 레이더.
    각 멤버의 topMultisets 에서 partner pair 추출 후 게임 수 가중 평균 RP delta.
    축 위치 = 표본 ≥ 100판 페어만. 안쪽 (zero) 기준 → 바깥쪽 = 친화 / 안쪽 = 약점.
  </p>
  <div id="pair-fp-grid" class="pair-fp-grid"></div>
</section>

<script>
(function(){
  if (typeof DATA === 'undefined' || !DATA.clusters) return;
  const FOCUS_ROLE = (DATA.config && DATA.config.focusRole) || '';
  const PARTNER_ROLES = ["탱커","원거리 딜러","스킬딜러","전사","지원가","암살자"];
  const ROLE_SHORT = {"탱커":"탱","원거리 딜러":"원딜","스킬딜러":"스딜","전사":"전사","지원가":"지원","암살자":"암살"};
  const ROLE_COLOR = {"탱커":"#60a5fa","원거리 딜러":"#34d399","스킬딜러":"#a78bfa","전사":"#f87171","지원가":"#fbbf24","암살자":"#94a3b8"};
  const MIN_GAMES = 100;

  // 21 페어 (정렬·중복 허용)
  const PAIRS = [];
  for (let i = 0; i < PARTNER_ROLES.length; i++) {
    for (let j = i; j < PARTNER_ROLES.length; j++) {
      PAIRS.push([PARTNER_ROLES[i], PARTNER_ROLES[j]]);
    }
  }
  const pairKey = (a,b) => [a,b].sort().join('|');
  const pairLabel = (a,b) => ROLE_SHORT[a] + '+' + ROLE_SHORT[b];

  function partnerPair(multiset, focusRole) {
    const roles = multiset.split(' + ').map(s => s.trim());
    const idx = roles.indexOf(focusRole);
    if (idx >= 0) roles.splice(idx, 1);
    if (roles.length !== 2) return null;
    if (!PARTNER_ROLES.includes(roles[0]) || !PARTNER_ROLES.includes(roles[1])) return null;
    return roles.sort();
  }

  function clusterPairAffinity(cluster) {
    const acc = {};
    cluster.members.forEach(m => {
      (m.topMultisets || []).forEach(c => {
        const pp = partnerPair(c.multiset, FOCUS_ROLE);
        if (!pp) return;
        const k = pp.join('|');
        if (!acc[k]) acc[k] = { sum: 0, games: 0 };
        acc[k].sum += (c.rp_delta || 0) * (c.games || 0);
        acc[k].games += (c.games || 0);
      });
    });
    const result = {};
    Object.keys(acc).forEach(k => {
      result[k] = {
        delta: acc[k].games > 0 ? acc[k].sum / acc[k].games : 0,
        games: acc[k].games
      };
    });
    return result;
  }

  const grid = document.getElementById('pair-fp-grid');
  const COLORS = [
    { bg: 'rgba(96, 165, 250, 0.18)', border: '#60a5fa' },
    { bg: 'rgba(74, 222, 128, 0.18)', border: '#4ade80' },
    { bg: 'rgba(251, 191, 36, 0.18)', border: '#fbbf24' },
    { bg: 'rgba(167, 139, 250, 0.18)', border: '#a78bfa' },
    { bg: 'rgba(248, 113, 113, 0.18)', border: '#f87171' },
    { bg: 'rgba(34, 211, 238, 0.18)', border: '#22d3ee' },
  ];

  DATA.clusters.forEach((cl, idx) => {
    const aff = clusterPairAffinity(cl);
    const activePairs = PAIRS.filter(([a,b]) => (aff[pairKey(a,b)]?.games || 0) >= MIN_GAMES);
    const labels = activePairs.map(([a,b]) => pairLabel(a,b));
    const values = activePairs.map(([a,b]) => aff[pairKey(a,b)].delta);
    const gamesArr = activePairs.map(([a,b]) => aff[pairKey(a,b)].games);
    const totalGames = cl.members.reduce((s,m) => s + (m.totalGames || 0), 0);

    const color = COLORS[idx % COLORS.length];
    const card = document.createElement('div');
    card.className = 'pair-fp-card';
    card.innerHTML =
      '<h3>C' + cl.cluster + ' ' + cl.label + '</h3>' +
      '<div class="pf-meta">멤버 ' + cl.size + '명 · 합산 ' + totalGames.toLocaleString('ko-KR') + '판 · 활성 페어 ' + activePairs.length + '/21</div>' +
      '<div class="pair-fp-chart-wrap"><canvas id="pf-chart-' + cl.cluster + '"></canvas></div>';
    grid.appendChild(card);

    new Chart(document.getElementById('pf-chart-' + cl.cluster), {
      type: 'radar',
      data: {
        labels: labels,
        datasets: [{
          label: cl.label,
          data: values,
          backgroundColor: color.bg,
          borderColor: color.border,
          borderWidth: 1.5,
          pointRadius: 3,
          pointBackgroundColor: color.border
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: function(ctx) {
                const idx = ctx.dataIndex;
                const games = gamesArr[idx];
                return ctx.label + ': ' + ctx.parsed.r.toFixed(2) + ' RP · ' + games.toLocaleString('ko-KR') + '판';
              }
            }
          }
        },
        scales: {
          r: {
            angleLines: { color: '#2a3140' },
            grid: { color: '#2a3140' },
            pointLabels: { color: '#e6e8ec', font: { size: 10 } },
            ticks: { color: '#8b94a3', backdropColor: 'transparent', font: { size: 9 } }
          }
        }
      }
    });
  });
})();
</script>
`;

let touched = 0;
for (const role of ROLES) {
  const file = path.join(ROOT, role, "visualization.html");
  if (!fs.existsSync(file)) {
    console.warn(`⚠ skip ${role}: file not found`);
    continue;
  }
  let html = fs.readFileSync(file, "utf-8");
  if (html.includes(MARKER)) {
    console.log(`= ${role}: 이미 추가됨 (skip)`);
    continue;
  }
  if (!html.includes("</body>")) {
    console.warn(`⚠ skip ${role}: </body> 없음`);
    continue;
  }
  html = html.replace("</body>", SNIPPET + "\n</body>");
  fs.writeFileSync(file, html);
  console.log(`✓ ${role}: 핑거프린트 섹션 추가`);
  touched++;
}
console.log(`\n총 ${touched}/${ROLES.length} 파일 수정`);
