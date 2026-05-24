// visualization_above_avg_cards.html 에 "그룹별 21-페어 핑거프린트" 섹션 추가.
// clusters_v2.json 의 그룹 매핑을 inline 한 뒤 DATA.combos[] 를 그룹 합산.
// idempotent: 마커 발견 시 스킵 (또는 --force 로 갱신).
// run: node frontend/scripts/append-pair-fingerprint-cards.mjs

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..", "..", "DATA", "trio-role-combinations");
const ROLES = ["rangers", "skilldealers", "tanks", "warriors"];
const MARKER = "<!-- PAIR_FINGERPRINT_CARDS_SECTION -->";

function buildSnippet(clustersJson) {
  // clusters_v2.json 에서 (cluster_id, label, characterKeys[]) 만 추출
  const clusters = (clustersJson.clusters || []).map((c) => ({
    id: c.cluster,
    label: c.label,
    keys: (c.members || []).map((m) => `${m.characterCode}_${m.weapon}`),
  }));
  const clustersInline = JSON.stringify(clusters);
  const defaultK = clusters.length || 6;

  const snippet = `
${MARKER}
<script src="https://cdn.jsdelivr.net/npm/chart.js@4"></script>
<style>
.pair-fp-cards-section{background:var(--surface, #1a1f29);border:1px solid var(--border, #2a3140);
                       border-radius:12px;padding:18px;margin-top:24px;}
.pair-fp-cards-section h2{margin:0 0 6px;font-size:1.1rem;}
.pair-fp-cards-section .desc{color:var(--muted, #8b94a3);font-size:0.82rem;margin-bottom:14px;}
.pair-fp-cards-section .ctrls{display:flex;flex-wrap:wrap;gap:8px;margin-bottom:14px;
                              align-items:center;font-size:0.8rem;color:var(--muted, #8b94a3);}
.pair-fp-cards-section .ctrls input{width:80px;background:#0f1419;color:#e6e8ec;
                                    border:1px solid #2a3140;border-radius:4px;padding:3px 6px;}
.pair-fp-cards-grid{display:grid;grid-template-columns:repeat(auto-fit, minmax(440px, 1fr));gap:14px;}
.pair-fp-mini-card{background:#232936;border:1px solid #2a3140;border-radius:8px;padding:12px;}
.pair-fp-mini-card .ttl{font-size:0.95rem;font-weight:600;margin-bottom:2px;color:#e6e8ec;}
.pair-fp-mini-card .sub{font-size:0.74rem;color:#8b94a3;margin-bottom:8px;}
.pair-fp-mini-card .members{font-size:0.7rem;color:#8b94a3;margin-bottom:8px;line-height:1.4;}
.pair-fp-mini-wrap{position:relative;height:440px;}
</style>

<section class="pair-fp-cards-section">
  <h2>🧬 그룹별 21-페어 핑거프린트 (멤버 중첩)</h2>
  <p class="desc">
    위쪽 <strong style="color:var(--fg)">k-select</strong> 값 따라감. 21축 = 6 직업의 모든 페어 (탱+탱, 탱+원딜, ...).
    굵은 채움 = 그룹 평균. 얇은 선 = 멤버 개별. 멤버 선이 평균에 잘 겹치면 응집도 좋은 그룹.
  </p>
  <div class="ctrls">
    <label>스케일 (±):
      <input id="pf-scale" type="number" value="2" min="0.5" step="0.5" />
    </label>
    <span id="pf-current-k" style="color:var(--fg, #e6e8ec)"></span>
  </div>
  <div id="pair-fp-cards-grid" class="pair-fp-cards-grid"></div>
</section>

<script>
(function(){
  if (typeof DATA === 'undefined' || !DATA.combos) return;
  if (!DATA.groupSignatures) { console.warn('PAIR_FP: DATA.groupSignatures 없음'); return; }
  const FOCUS_ROLE = DATA.focusRole || '';
  const PARTNER_ROLES = ["탱커","원거리 딜러","스킬딜러","전사","지원가","암살자"];
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
    return roles.sort();
  }

  // ─── (이전 자체 k-means 코드는 제거 — DATA.groupSignatures[K] 따라감) ───
  /* eslint-disable no-unused-vars */
  function comboFeatureVector(combo, topN) {
    // 원본 cluster_v2 와 동일: top-N aboveMultisets, (rp_delta * sqrt(games)) 가중 평균
    // 가중평균 = sum(rp_delta * sqrt(games)) / sum(sqrt(games))
    const tops = (combo.aboveMultisets || []).slice(0, topN);
    const acc = {};
    PARTNER_ROLES.forEach(r => { acc[r] = { numerator: 0, weight: 0 }; });
    tops.forEach(c => {
      const roles = c.multiset.split(' + ').map(s => s.trim());
      const idx = roles.indexOf(FOCUS_ROLE);
      if (idx >= 0) roles.splice(idx, 1);
      const sqrtGames = Math.sqrt(c.games || 0);
      const value = (c.delta || 0) * sqrtGames;
      roles.forEach(r => {
        if (acc[r]) {
          acc[r].numerator += value;
          acc[r].weight += sqrtGames;
        }
      });
    });
    return PARTNER_ROLES.map(r => acc[r].weight > 0 ? acc[r].numerator / acc[r].weight : 0);
  }

  function euclid(a, b) {
    let s = 0;
    for (let i = 0; i < a.length; i++) { const d = a[i] - b[i]; s += d * d; }
    return s;
  }

  function kmeans(vectors, k, maxIter = 50) {
    if (vectors.length === 0 || k <= 0) return [];
    const actualK = Math.min(k, vectors.length);
    // k-means++ init
    const centroids = [vectors[Math.floor(Math.random() * vectors.length)].slice()];
    while (centroids.length < actualK) {
      const dists = vectors.map(v => Math.min(...centroids.map(c => euclid(v, c))));
      const sum = dists.reduce((s, d) => s + d, 0);
      if (sum === 0) {
        const remaining = vectors.filter((_, i) => !centroids.some(c => euclid(c, vectors[i]) === 0));
        if (remaining.length === 0) break;
        centroids.push(remaining[0].slice());
        continue;
      }
      let r = Math.random() * sum;
      let chosen = 0;
      for (let i = 0; i < dists.length; i++) { r -= dists[i]; if (r <= 0) { chosen = i; break; } }
      centroids.push(vectors[chosen].slice());
    }

    let assignments = new Array(vectors.length).fill(0);
    for (let iter = 0; iter < maxIter; iter++) {
      let changed = false;
      for (let i = 0; i < vectors.length; i++) {
        let best = 0; let bestD = Infinity;
        for (let c = 0; c < centroids.length; c++) {
          const d = euclid(vectors[i], centroids[c]);
          if (d < bestD) { bestD = d; best = c; }
        }
        if (assignments[i] !== best) { assignments[i] = best; changed = true; }
      }
      if (!changed) break;
      // recompute centroids; empty cluster 는 가장 먼 outlier 로 reseed
      const dim = vectors[0].length;
      for (let c = 0; c < centroids.length; c++) {
        const sum = new Array(dim).fill(0);
        let count = 0;
        for (let i = 0; i < vectors.length; i++) {
          if (assignments[i] === c) { for (let d = 0; d < dim; d++) sum[d] += vectors[i][d]; count++; }
        }
        if (count > 0) {
          for (let d = 0; d < dim; d++) centroids[c][d] = sum[d] / count;
        } else {
          // empty cluster → 현재 centroids 와 가장 먼 vector 로 reseed
          let farthestIdx = 0; let farthestD = -1;
          for (let i = 0; i < vectors.length; i++) {
            const minD = Math.min(...centroids.map(cv => euclid(vectors[i], cv)));
            if (minD > farthestD) { farthestD = minD; farthestIdx = i; }
          }
          centroids[c] = vectors[farthestIdx].slice();
          // 해당 outlier 를 강제로 c 에 배정
          assignments[farthestIdx] = c;
          changed = true;
        }
      }
    }
    return assignments;
  }

  function withinClusterSS(vectors, centroids, assignments) {
    let s = 0;
    for (let i = 0; i < vectors.length; i++) s += euclid(vectors[i], centroids[assignments[i]]);
    return s;
  }

  function labelGroup(combos) {
    // 멤버들이 가장 자주 강한 (positive delta) 멀티셋의 파트너 역할 Top 1~2
    const partnerScore = {};
    PARTNER_ROLES.forEach(r => partnerScore[r] = 0);
    combos.forEach(combo => {
      (combo.aboveMultisets || []).forEach(c => {
        const roles = c.multiset.split(' + ').map(s => s.trim());
        const idx = roles.indexOf(FOCUS_ROLE);
        if (idx >= 0) roles.splice(idx, 1);
        roles.forEach(r => { if (partnerScore[r] != null) partnerScore[r] += (c.delta || 0); });
      });
    });
    const sorted = PARTNER_ROLES.slice().sort((a, b) => partnerScore[b] - partnerScore[a]);
    return sorted[0] + ' 친화';
  }

  function reCluster(k, topN) {
    const combos = DATA.combos;
    const vectors = combos.map(c => comboFeatureVector(c, topN));
    // 여러 번 돌려서 best (lowest WCSS) 선택
    let bestAssignments = null;
    let bestWCSS = Infinity;
    let bestCentroids = null;
    for (let trial = 0; trial < 8; trial++) {
      const assignments = kmeans(vectors, k);
      // centroids 재계산 (assignments 기준)
      const dim = vectors[0]?.length || 0;
      const centroids = [];
      for (let c = 0; c < k; c++) {
        const sum = new Array(dim).fill(0);
        let count = 0;
        for (let i = 0; i < vectors.length; i++) {
          if (assignments[i] === c) { for (let d = 0; d < dim; d++) sum[d] += vectors[i][d]; count++; }
        }
        centroids.push(count > 0 ? sum.map(s => s / count) : new Array(dim).fill(0));
      }
      const wcss = withinClusterSS(vectors, centroids, assignments);
      if (wcss < bestWCSS) { bestWCSS = wcss; bestAssignments = assignments; bestCentroids = centroids; }
    }
    // 그룹별 combo 모으기
    const groups = [];
    for (let c = 0; c < k; c++) {
      const members = combos.filter((_, i) => bestAssignments[i] === c);
      if (members.length === 0) continue;
      groups.push({
        id: groups.length,
        label: labelGroup(members),
        members,
      });
    }
    return groups;
  }

  function comboPairAffinity(combo) {
    // 단일 캐릭+무기의 페어별 affinity
    const acc = {};
    const all = [...(combo.aboveMultisets || []), ...(combo.belowMultisets || [])];
    all.forEach(c => {
      const pp = partnerPair(c.multiset, FOCUS_ROLE);
      if (!pp) return;
      const k = pp.join('|');
      if (!acc[k]) acc[k] = { sum: 0, games: 0 };
      acc[k].sum += (c.delta || 0) * (c.games || 0);
      acc[k].games += (c.games || 0);
    });
    const result = {};
    Object.keys(acc).forEach(k => {
      result[k] = { delta: acc[k].games > 0 ? acc[k].sum / acc[k].games : 0, games: acc[k].games };
    });
    return result;
  }

  function aggregatePairAffinity(combos) {
    // 그룹 멤버들의 affinity 합산
    const acc = {};
    combos.forEach(combo => {
      const all = [...(combo.aboveMultisets || []), ...(combo.belowMultisets || [])];
      all.forEach(c => {
        const pp = partnerPair(c.multiset, FOCUS_ROLE);
        if (!pp) return;
        const k = pp.join('|');
        if (!acc[k]) acc[k] = { sum: 0, games: 0 };
        acc[k].sum += (c.delta || 0) * (c.games || 0);
        acc[k].games += (c.games || 0);
      });
    });
    const result = {};
    Object.keys(acc).forEach(k => {
      result[k] = { delta: acc[k].games > 0 ? acc[k].sum / acc[k].games : 0, games: acc[k].games };
    });
    return result;
  }

  const grid = document.getElementById('pair-fp-cards-grid');
  const scaleInput = document.getElementById('pf-scale');
  const kBadge = document.getElementById('pf-current-k');
  const charts = [];

  function currentK() {
    const sel = document.getElementById('k-select');
    if (sel) return parseInt(sel.value, 10);
    return DATA.defaultK || 6;
  }

  function groupsFromSignatures(k) {
    const sigs = DATA.groupSignatures[String(k)] || {};
    // page 위쪽 render() 와 동일 정렬: size 기준 desc
    const sorted = Object.entries(sigs)
      .sort((a, b) => b[1].size - a[1].size)
      .map(([gid, s], idx) => ({
        id: idx,
        origGid: parseInt(gid, 10),
        label: (DATA.groupNames && DATA.groupNames[String(k)] && DATA.groupNames[String(k)][gid]) || ('그룹 ' + (idx + 1)),
        members: (s.memberIds || []).map(i => DATA.combos[i]).filter(Boolean),
        sig: s,
      }));
    return sorted;
  }
  // 멤버 색 팔레트 (그룹 평균은 항상 파란색 채움)
  const MEMBER_COLORS = [
    '#4ade80', '#fbbf24', '#a78bfa', '#f87171', '#22d3ee',
    '#fb923c', '#facc15', '#a3e635', '#34d399', '#f472b6',
    '#818cf8', '#fcd34d', '#86efac', '#fda4af', '#7dd3fc',
  ];

  // ALL 21 페어를 항상 그림 — 필터 없음
  const ALL_LABELS = PAIRS.map(([a,b]) => pairLabel(a,b));

  function valuesFor(aff) {
    return PAIRS.map(([a,b]) => aff[pairKey(a,b)]?.delta ?? 0);
  }
  function gamesFor(aff) {
    return PAIRS.map(([a,b]) => aff[pairKey(a,b)]?.games ?? 0);
  }

  function render() {
    grid.innerHTML = '';
    while (charts.length) {
      const c = charts.pop();
      try { c.destroy(); } catch(e) {}
    }
    const SCALE = parseFloat(scaleInput.value) || 2;
    const K = currentK();
    if (kBadge) kBadge.textContent = '현재 K = ' + K + ' (위쪽 k-select 와 동기화)';

    const groups = groupsFromSignatures(K);
    if (!groups.length) {
      grid.innerHTML = '<p style="color:#8b94a3;font-size:0.85rem;text-align:center;padding:30px;">K=' + K + ' 에 대한 groupSignatures 데이터 없음.</p>';
      return;
    }

    groups.forEach((cl, ci) => {
      const combos = cl.members;
      if (!combos.length) return;

      const groupAff = aggregatePairAffinity(combos);
      const groupValues = valuesFor(groupAff);
      const totalGames = combos.reduce((s,c) => s + (c.totalGames || 0), 0);
      const memberStr = combos.map(c => c.characterName + ' ' + (c.weaponsString || '')).join(', ');

      const card = document.createElement('div');
      card.className = 'pair-fp-mini-card';
      card.innerHTML =
        '<div class="ttl">그룹 ' + (ci + 1) + ' · ' + cl.label + '</div>' +
        '<div class="sub">멤버 ' + combos.length + '명 · 합산 ' + totalGames.toLocaleString('ko-KR') + '판</div>' +
        '<div class="members">' + memberStr + '</div>' +
        '<div class="pair-fp-mini-wrap"><canvas id="pf-card-' + ci + '"></canvas></div>';
      grid.appendChild(card);

      // 데이터셋: 그룹 평균 (채움) + 각 멤버 (얇은 선)
      const datasets = [
        {
          label: cl.label + ' (그룹 평균)',
          data: groupValues,
          backgroundColor: 'rgba(96, 165, 250, 0.22)',
          borderColor: '#60a5fa',
          borderWidth: 2,
          pointRadius: 2.5,
          pointBackgroundColor: '#60a5fa',
          order: 100,
        },
      ];
      combos.forEach((combo, mi) => {
        const aff = comboPairAffinity(combo);
        const color = MEMBER_COLORS[mi % MEMBER_COLORS.length];
        datasets.push({
          label: combo.characterName + ' ' + (combo.weaponsString || ''),
          data: valuesFor(aff),
          backgroundColor: 'transparent',
          borderColor: color,
          borderWidth: 1,
          pointRadius: 1.5,
          pointBackgroundColor: color,
          order: 50,
        });
      });

      const chart = new Chart(document.getElementById('pf-card-' + ci), {
        type: 'radar',
        data: { labels: ALL_LABELS, datasets },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              position: 'bottom',
              labels: { color: '#e6e8ec', font: { size: 9 }, boxWidth: 8, padding: 4 },
            },
            tooltip: {
              callbacks: {
                label: function(ctx) {
                  const v = ctx.parsed.r.toFixed(2);
                  const dsLabel = ctx.dataset.label || '';
                  return dsLabel + ' · ' + ctx.label + ': ' + v + ' RP';
                },
              },
            },
          },
          scales: {
            r: {
              suggestedMin: -SCALE,
              suggestedMax: SCALE,
              angleLines: { color: '#2a3140' },
              grid: { color: '#2a3140' },
              pointLabels: { color: '#e6e8ec', font: { size: 9 } },
              ticks: { color: '#8b94a3', backdropColor: 'transparent', font: { size: 8 } },
            },
          },
        },
      });
      charts.push(chart);
    });

    if (!grid.children.length) {
      grid.innerHTML = '<p style="color:#8b94a3;font-size:0.85rem;text-align:center;padding:30px;">표시할 그룹이 없습니다.</p>';
    }
  }

  // 위쪽 k-select 변경 따라가기
  const kSelect = document.getElementById('k-select');
  if (kSelect) kSelect.addEventListener('change', render);
  scaleInput.addEventListener('change', render);
  render();
})();
</script>
`;
  return snippet.replace("__DEFAULT_K__", String(defaultK));
}

function processFile(role) {
  const file = path.join(ROOT, role, "visualization_above_avg_cards.html");
  const clustersFile = path.join(ROOT, role, "_clusters_v2.json");
  if (!fs.existsSync(file)) {
    console.warn(`⚠ skip ${role}: visualization_above_avg_cards.html not found`);
    return false;
  }
  if (!fs.existsSync(clustersFile)) {
    console.warn(`⚠ skip ${role}: _clusters_v2.json not found`);
    return false;
  }
  const clustersJson = JSON.parse(fs.readFileSync(clustersFile, "utf-8"));
  let html = fs.readFileSync(file, "utf-8");

  // 이전 마커 블록이 있으면 잘라내고 새로 삽입
  const markerIdx = html.indexOf(MARKER);
  if (markerIdx !== -1) {
    const before = html.slice(0, markerIdx);
    const afterStart = html.indexOf("</section>", markerIdx);
    const scriptEnd = html.indexOf("</script>", afterStart);
    const cutEnd = scriptEnd + "</script>".length;
    html = before + html.slice(cutEnd);
    // </body> 앞에 새 snippet 삽입
  }
  if (!html.includes("</body>")) {
    console.warn(`⚠ skip ${role}: </body> 없음`);
    return false;
  }
  html = html.replace("</body>", buildSnippet(clustersJson) + "\n</body>");
  fs.writeFileSync(file, html);
  console.log(`✓ ${role}: 그룹별 핑거프린트 섹션 갱신 (그룹 ${clustersJson.clusters?.length ?? 0}개)`);
  return true;
}

let touched = 0;
for (const role of ROLES) {
  if (processFile(role)) touched++;
}
console.log(`\n총 ${touched}/${ROLES.length} 파일 수정`);
