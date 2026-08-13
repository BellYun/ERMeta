/**
 * public/data/lab/composition-types.json 을 검토하는 standalone HTML 생성.
 *
 * Usage:
 *   node frontend/scripts/generate-lab-composition-analysis-html.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

/* eslint-disable no-console */

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const LAB_DIR = path.resolve(__dirname, "..", "public", "data", "lab");
const INPUT_PATH = path.resolve(LAB_DIR, "composition-types.json");
const OUT_PATH = path.resolve(LAB_DIR, "composition-analysis.html");

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function formatNumber(value) {
  return new Intl.NumberFormat("ko-KR").format(Math.round(value));
}

function formatRp(value) {
  const number = Number(value);
  return `${number >= 0 ? "+" : ""}${number.toFixed(3)}`;
}

function formatPercent(value) {
  return `${(Number(value) * 100).toFixed(1)}%`;
}

function confidenceLabel(confidence) {
  if (confidence === "high") return "높음";
  if (confidence === "medium") return "보통";
  return "낮음";
}

function typeBadge(type) {
  return `<span class="type-badge"><small>${escapeHtml(type.role)}</small>${escapeHtml(type.fitRole)}</span>`;
}

function renderTopCombinations(composition) {
  return `
    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th>내부 유형 조합</th>
            <th>보정 시너지</th>
            <th>원시 차이</th>
            <th>판수</th>
            <th>비중</th>
            <th>신뢰도</th>
          </tr>
        </thead>
        <tbody>
          ${composition.topCombinations
            .map(
              (entry) => `
                <tr>
                  <td>
                    <div class="type-row">${entry.types.map(typeBadge).join("")}</div>
                  </td>
                  <td class="positive">${formatRp(entry.adjustedLift)} RP</td>
                  <td>${formatRp(entry.rawLift)} RP</td>
                  <td>${formatNumber(entry.games)}</td>
                  <td>${formatPercent(entry.share)}</td>
                  <td><span class="confidence ${entry.confidence}">${confidenceLabel(entry.confidence)}</span></td>
                </tr>
              `
            )
            .join("")}
        </tbody>
      </table>
    </div>
  `;
}

function renderRecommendations(composition) {
  const byRole = new Map();
  for (const recommendation of composition.recommendations) {
    const entries = byRole.get(recommendation.focal.role) ?? [];
    entries.push(recommendation);
    byRole.set(recommendation.focal.role, entries);
  }

  return `
    <div class="recommendation-roles">
      ${[...byRole.entries()]
        .map(
          ([role, recommendations]) => `
            <section class="recommendation-role">
              <h4>${escapeHtml(role)} 유형을 골랐을 때</h4>
              <div class="recommendation-grid">
                ${[...recommendations]
                  .sort((left, right) => {
                    const leftBest = left.options[0];
                    const rightBest = right.options[0];
                    const leftScore = leftBest
                      ? leftBest.adjustedLift * leftBest.games ** 0.25
                      : Number.NEGATIVE_INFINITY;
                    const rightScore = rightBest
                      ? rightBest.adjustedLift * rightBest.games ** 0.25
                      : Number.NEGATIVE_INFINITY;
                    return rightScore - leftScore || right.totalGames - left.totalGames;
                  })
                  .map(
                    (recommendation, recommendationIndex) => `
                      <article class="recommendation-card">
                        <header>
                          <div>
                            <small>선택 유형 ${recommendationIndex + 1}위</small>
                            <h5>${escapeHtml(recommendation.focal.fitRole)}</h5>
                          </div>
                          <span>${formatNumber(recommendation.totalGames)}판</span>
                        </header>
                        ${
                          recommendation.options.length > 0
                            ? `<ol>${recommendation.options
                                .map(
                                  (option) => `
                                    <li>
                                      <div class="type-row">${option.partners.map(typeBadge).join("")}</div>
                                      <div class="option-metrics">
                                        <b>${formatRp(option.adjustedLift)} RP</b>
                                        <span>${formatNumber(option.games)}판 · 조건부 ${formatPercent(option.conditionalShare)}</span>
                                      </div>
                                    </li>
                                  `
                                )
                                .join("")}</ol>`
                            : '<p class="no-recommendation">신뢰 표본에서 양수 추천 조합이 없습니다.</p>'
                        }
                      </article>
                    `
                  )
                  .join("")}
              </div>
            </section>
          `
        )
        .join("")}
    </div>
  `;
}

function renderTypeCatalog(composition) {
  const byRole = new Map();
  for (const type of composition.typeCatalog) {
    const entries = byRole.get(type.role) ?? [];
    entries.push(type);
    byRole.set(type.role, entries);
  }

  return `
    <div class="type-catalog">
      ${[...byRole.entries()]
        .map(
          ([role, types]) => `
            <section class="catalog-role">
              <h4>${escapeHtml(role)}</h4>
              <div class="catalog-grid">
                ${types
                  .sort((left, right) => left.fitRole.localeCompare(right.fitRole, "ko"))
                  .map((type) => {
                    return `
                      <article class="catalog-card">
                        <b>${escapeHtml(type.fitRole)}</b>
                        <span>${
                          type.characters.length > 0
                            ? type.characters
                                .slice(0, 6)
                                .map(
                                  (character) =>
                                    `<span class="catalog-character">${escapeHtml(character.characterName)}(${escapeHtml(character.weaponName)})` +
                                    (character.adjustedFit == null
                                      ? " · 연계 표본 없음"
                                      : ` · ${formatRp(character.adjustedFit)} · ${formatNumber(character.fitGames)}판${character.fitReliable ? "" : " · 저표본 참고"}`) +
                                    "</span>"
                                )
                                .join("")
                            : "캐릭터 예시 없음"
                        }</span>
                        <small>${
                          type.conditionalSplit
                            ? `고정 역할 조합 내부 지표로 ${escapeHtml(type.baseFitRole)}에서 재분리 · 강점 연계 기준 추천순`
                            : "고정 역할 조합 내부에서 추가 분리 신호 없음 · 강점 연계 기준 추천순"
                        }${
                          type.bestPartnerTypes.length > 0
                            ? ` · 강점 연계: ${type.bestPartnerTypes.map((partner) => escapeHtml(partner.fitRole)).join(" + ")} (${formatRp(type.bestPartnerResidual)} · ${formatNumber(type.bestPartnerGames)}판)`
                            : ""
                        }</small>
                      </article>
                    `;
                  })
                  .join("")}
              </div>
            </section>
          `
        )
        .join("")}
    </div>
  `;
}

function renderComposition(composition, index) {
  const searchExamples = composition.typeCatalog
    .flatMap((type) => type.characters)
    .map((candidate) => candidate.characterName)
    .join(" ");
  return `
    <details class="composition" data-search="${escapeHtml(`${composition.roleComposition} ${searchExamples}`)}" ${index < 5 ? "open" : ""}>
      <summary>
        <div>
          <h2>${escapeHtml(composition.roleComposition)}</h2>
          <p>관측 ${composition.observedTypeCombinations}개 · 신뢰 표본 ${composition.reliableTypeCombinations}개 · 조건부 재분리 ${composition.conditionalSplitBaseTypes}개 · 최소 ${formatNumber(composition.minGames)}판</p>
        </div>
        <div class="summary-metrics">
          <span><b>${formatNumber(composition.totalGames)}</b>판</span>
          <span><b>${formatRp(composition.avgResidual)}</b> 평균 보정</span>
        </div>
      </summary>
      <div class="composition-body">
        <section>
          <h3>상위 내부 유형 조합</h3>
          <p class="section-copy">이 표의 판수와 보정 시너지는 현재 역할 조합 안에서 정확히 같은 세 내부 유형을 가진 경기만 집계합니다. 다른 역할 조합과 캐릭터별 평균은 섞지 않습니다.</p>
          ${renderTopCombinations(composition)}
        </section>
        <section>
          <h3>역할별 선택 유형 순위</h3>
          <p class="section-copy">한 자리의 내부 유형을 고정했을 때 가장 성과가 좋은 나머지 두 유형을 기준으로 선택 유형을 정렬했습니다. 모든 수치는 현재 역할 조합 내부에서만 계산됩니다.</p>
          ${renderRecommendations(composition)}
        </section>
        <section>
          <h3>유형별 캐릭터 예시</h3>
          <p class="section-copy">현재 역할 조합 안에서 파트너 유형별 성과 방향이 비슷한 캐릭터끼리 묶었습니다. A형·B형은 같은 기본 특성에서 지표가 갈려 재분리된 하위군입니다.</p>
          ${renderTypeCatalog(composition)}
        </section>
      </div>
    </details>
  `;
}

function renderPage(data) {
  const topComposition = data.roleCompositions[0];
  const totalConditionalSplits = data.roleCompositions.reduce(
    (sum, composition) => sum + composition.conditionalSplitBaseTypes,
    0
  );
  return `<!doctype html>
<html lang="ko">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>2차 조합 유형 분석</title>
  <style>
    :root {
      color-scheme: light;
      --bg: #f6f7f5;
      --panel: #fff;
      --panel-soft: #fafbf9;
      --ink: #1c2025;
      --muted: #66707b;
      --line: #dce1e5;
      --blue: #245d8f;
      --blue-soft: #eaf2f8;
      --green: #176a46;
      --amber: #8a5a10;
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      background: var(--bg);
      color: var(--ink);
      font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      line-height: 1.45;
    }
    a { color: inherit; }
    h1, h2, h3, h4, h5, p { margin: 0; }
    .hero {
      padding: 34px clamp(18px, 4vw, 54px) 24px;
      background: var(--panel);
      border-bottom: 1px solid var(--line);
    }
    .hero-top { display: flex; justify-content: space-between; gap: 20px; align-items: start; }
    .hero h1 { font-size: clamp(28px, 4vw, 43px); }
    .hero p { max-width: 900px; margin-top: 9px; color: var(--muted); }
    .back-link {
      flex-shrink: 0;
      border: 1px solid var(--line);
      border-radius: 8px;
      padding: 8px 11px;
      text-decoration: none;
      font-size: 13px;
      font-weight: 650;
    }
    .method {
      margin-top: 16px;
      border-left: 3px solid var(--blue);
      background: var(--blue-soft);
      border-radius: 0 8px 8px 0;
      padding: 10px 13px;
      color: #28475f;
      font-size: 13px;
    }
    main { padding: 20px clamp(18px, 4vw, 54px) 48px; }
    .dashboard {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(190px, 1fr));
      gap: 10px;
      margin-bottom: 16px;
    }
    .metric-card {
      border: 1px solid var(--line);
      border-radius: 9px;
      background: var(--panel);
      padding: 13px 15px;
    }
    .metric-card small { display: block; color: var(--muted); }
    .metric-card b { display: block; margin-top: 3px; font-size: 21px; }
    .toolbar {
      position: sticky;
      top: 0;
      z-index: 5;
      display: flex;
      gap: 10px;
      margin-bottom: 14px;
      padding: 10px 0;
      background: color-mix(in srgb, var(--bg) 92%, transparent);
      backdrop-filter: blur(8px);
    }
    .toolbar input {
      width: min(520px, 100%);
      border: 1px solid var(--line);
      border-radius: 8px;
      background: var(--panel);
      padding: 10px 12px;
      font: inherit;
    }
    .compositions { display: grid; gap: 12px; }
    .composition {
      border: 1px solid var(--line);
      border-radius: 9px;
      background: var(--panel);
      overflow: clip;
    }
    .composition > summary {
      display: flex;
      justify-content: space-between;
      gap: 18px;
      align-items: center;
      cursor: pointer;
      padding: 15px 17px;
      list-style-position: inside;
    }
    .composition > summary h2 { display: inline; margin-left: 5px; font-size: 19px; }
    .composition > summary p { margin: 4px 0 0 23px; color: var(--muted); font-size: 12px; }
    .summary-metrics { display: flex; flex-wrap: wrap; justify-content: flex-end; gap: 7px; }
    .summary-metrics span {
      border: 1px solid var(--line);
      border-radius: 999px;
      padding: 5px 8px;
      white-space: nowrap;
      font-size: 12px;
    }
    .composition-body { display: grid; gap: 24px; padding: 4px 17px 20px; }
    .composition-body h3 { margin-top: 7px; font-size: 16px; }
    .section-copy { margin: 3px 0 10px; color: var(--muted); font-size: 12px; }
    .table-wrap { overflow-x: auto; }
    table { width: 100%; border-collapse: collapse; font-size: 12px; }
    th, td { border-top: 1px solid var(--line); padding: 8px 7px; text-align: right; }
    th { color: var(--muted); font-weight: 650; white-space: nowrap; }
    th:first-child, td:first-child { text-align: left; }
    .type-row { display: flex; flex-wrap: wrap; gap: 5px; }
    .type-badge {
      display: inline-flex;
      gap: 5px;
      align-items: baseline;
      border: 1px solid var(--line);
      border-radius: 6px;
      background: var(--panel-soft);
      padding: 4px 6px;
      white-space: nowrap;
      font-weight: 650;
    }
    .type-badge small { color: var(--muted); font-weight: 500; }
    .positive { color: var(--green); font-weight: 750; }
    .confidence { border-radius: 999px; padding: 3px 6px; font-weight: 650; }
    .confidence.high { background: #e4f3eb; color: var(--green); }
    .confidence.medium { background: #f6eedc; color: var(--amber); }
    .confidence.low { background: #eef0f2; color: var(--muted); }
    .recommendation-roles { display: grid; gap: 18px; }
    .recommendation-role h4 { margin-bottom: 8px; color: var(--blue); font-size: 14px; }
    .recommendation-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(310px, 1fr));
      gap: 9px;
    }
    .recommendation-card {
      min-width: 0;
      border: 1px solid var(--line);
      border-radius: 8px;
      background: var(--panel-soft);
      padding: 11px;
    }
    .recommendation-card > header {
      display: flex;
      justify-content: space-between;
      gap: 12px;
      align-items: end;
      margin-bottom: 8px;
    }
    .recommendation-card header small, .recommendation-card header span { color: var(--muted); font-size: 11px; }
    .recommendation-card h5 { margin-top: 2px; font-size: 14px; }
    .recommendation-card ol { margin: 0; padding-left: 24px; }
    .recommendation-card li { padding: 7px 0; border-top: 1px solid var(--line); }
    .option-metrics { display: flex; justify-content: space-between; gap: 8px; margin-top: 5px; font-size: 11px; }
    .option-metrics b { color: var(--green); }
    .option-metrics span { color: var(--muted); }
    .no-recommendation { padding: 10px 0 2px; color: var(--muted); font-size: 12px; }
    .type-catalog { display: grid; gap: 17px; }
    .catalog-role h4 { margin-bottom: 8px; color: var(--blue); font-size: 14px; }
    .catalog-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 8px; }
    .catalog-card { border: 1px solid var(--line); border-radius: 8px; background: var(--panel-soft); padding: 10px; }
    .catalog-card b, .catalog-card span, .catalog-card small { display: block; }
    .catalog-card b { font-size: 13px; }
    .catalog-card span { margin-top: 4px; font-size: 11px; }
    .catalog-card .catalog-character { display: block; margin-top: 3px; }
    .catalog-card small { margin-top: 4px; color: var(--muted); font-size: 10px; }
    .hidden { display: none; }
    @media (max-width: 760px) {
      .hero-top, .composition > summary { display: block; }
      .back-link { display: inline-block; margin-top: 14px; }
      .summary-metrics { justify-content: flex-start; margin: 10px 0 0 22px; }
      .recommendation-grid { grid-template-columns: 1fr; }
    }
  </style>
</head>
<body>
  <header class="hero">
    <div class="hero-top">
      <div>
        <h1>2차 조합 유형 분석</h1>
        <p>1차 내부 역할을 기반으로 역할 조합을 고정하고, 한 유형을 골랐을 때 함께 쓰기 좋은 나머지 두 유형을 시즌 10·11 지표로 계산했습니다.</p>
      </div>
      <a class="back-link" href="./group-analysis.html">← 1차 분류 리포트</a>
    </div>
    <div class="method">보정 시너지 = 실제 트리오 평균 RP − 세 캐릭터의 개별 기대 RP. 표본이 적은 조합은 판수 기반으로 0에 수축하며, 각 역할 조합에서 최소 300판 또는 전체 판수의 0.1% 중 큰 값을 적용합니다.</div>
  </header>
  <main>
    <section class="dashboard">
      <div class="metric-card"><small>관측 역할 조합</small><b>${data.roleCompositionCount}개</b></div>
      <div class="metric-card"><small>신뢰 내부 유형 조합</small><b>${formatNumber(data.reliableTypeCombinationCount)}개</b></div>
      <div class="metric-card"><small>전체 조건부 재분리</small><b>${formatNumber(totalConditionalSplits)}건</b></div>
      <div class="metric-card"><small>분류된 원본 행</small><b>${formatNumber(data.sourceRows)}행</b></div>
      <div class="metric-card"><small>최대 역할 조합</small><b>${escapeHtml(topComposition?.roleComposition ?? "-")}</b></div>
    </section>
    <div class="toolbar">
      <input id="composition-search" type="search" placeholder="역할 조합 검색: 전사, 스킬딜러, 원거리 딜러…" aria-label="역할 조합 검색" />
    </div>
    <section class="compositions" id="compositions">
      ${data.roleCompositions.map(renderComposition).join("")}
    </section>
  </main>
  <script>
    const input = document.querySelector("#composition-search");
    const sections = [...document.querySelectorAll(".composition")];
    input.addEventListener("input", () => {
      const query = input.value.trim();
      for (const section of sections) {
        const matches = !query || section.dataset.search.includes(query);
        section.classList.toggle("hidden", !matches);
        if (query && matches) section.open = true;
      }
    });
  </script>
</body>
</html>
`;
}

function main() {
  const data = JSON.parse(fs.readFileSync(INPUT_PATH, "utf8"));
  const html = renderPage(data).replace(/[ \t]+$/gm, "");
  fs.writeFileSync(OUT_PATH, html);
  console.log(
    `wrote ${OUT_PATH} roles=${data.roleCompositionCount} reliable=${data.reliableTypeCombinationCount}`
  );
}

main();
