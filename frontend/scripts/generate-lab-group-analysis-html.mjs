/**
 * public/data/lab/*.json 의 그룹을 사람이 검토하기 위한 standalone HTML 생성.
 *
 * Usage:
 *   node frontend/scripts/generate-lab-group-analysis-html.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

/* eslint-disable no-console */

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const LAB_DIR = path.resolve(__dirname, "..", "public", "data", "lab");
const OUT_PATH = path.resolve(LAB_DIR, "group-analysis.html");

const ROLE_FILES = [
  "tanks",
  "warriors",
  "assassins",
  "skilldealers",
  "rangers",
  "supports",
];

function comboKey(character) {
  return `${character.characterCode}_${character.weapon ?? "null"}`;
}

function formatNumber(value) {
  return new Intl.NumberFormat("ko-KR").format(Math.round(value));
}

function formatRp(value) {
  return Number(value).toFixed(3);
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function aggregateEntries(members, field, direction) {
  const byMultiset = new Map();
  for (const member of members) {
    for (const entry of member[field] ?? []) {
      const current = byMultiset.get(entry.multiset) ?? { games: 0, weightedDelta: 0, count: 0 };
      current.games += entry.games;
      current.weightedDelta += entry.delta * entry.games;
      current.count += 1;
      byMultiset.set(entry.multiset, current);
    }
  }

  return [...byMultiset.entries()]
    .map(([multiset, stat]) => ({
      multiset,
      games: stat.games,
      count: stat.count,
      delta: stat.weightedDelta / stat.games,
    }))
    .sort((a, b) =>
      direction === "desc"
        ? b.delta - a.delta || b.games - a.games
        : a.delta - b.delta || b.games - a.games
    )
    .slice(0, 5);
}

function summarizeGroup(data, group) {
  const keys = new Set(group.characterKeys ?? []);
  const members = data.characters
    .filter((character) => character.groupId === group.id || keys.has(comboKey(character)))
    .sort((a, b) => b.totalGames - a.totalGames);
  const totalGames = members.reduce((sum, member) => sum + member.totalGames, 0);
  const weightedRp =
    totalGames > 0
      ? members.reduce((sum, member) => sum + member.ownMeanRP * member.totalGames, 0) / totalGames
      : 0;

  return {
    ...group,
    members,
    totalGames,
    weightedRp,
    strong: aggregateEntries(members, "strong", "desc"),
    weak: aggregateEntries(members, "weak", "asc"),
  };
}

function renderEntryList(entries, kind) {
  if (entries.length === 0) {
    return `<div class="empty">표본 조건을 통과한 항목 없음</div>`;
  }
  return `
    <ol class="entry-list ${kind}">
      ${entries
        .map(
          (entry) => `
            <li>
              <span class="entry-name">${escapeHtml(entry.multiset)}</span>
              <span class="entry-meta">${entry.delta > 0 ? "+" : ""}${formatRp(entry.delta)} · ${formatNumber(entry.games)}판 · ${entry.count}명</span>
            </li>
          `
        )
        .join("")}
    </ol>
  `;
}

function renderMembers(members) {
  return `
    <table>
      <thead>
        <tr>
          <th>실험체</th>
          <th>무기</th>
          <th>게임</th>
          <th>평균 RP</th>
        </tr>
      </thead>
      <tbody>
        ${members
          .map(
            (member) => `
              <tr>
                <td>${escapeHtml(member.characterName)}</td>
                <td>${escapeHtml(member.weaponName)}</td>
                <td>${formatNumber(member.totalGames)}</td>
                <td>${formatRp(member.ownMeanRP)}</td>
              </tr>
            `
          )
          .join("")}
      </tbody>
    </table>
  `;
}

function renderMemberChips(members) {
  return `
    <div class="member-chips">
      ${members
        .map(
          (member) => `
            <span title="${escapeHtml(comboKey(member))}">
              <b>${escapeHtml(member.characterName)}</b>
              <small>${escapeHtml(member.weaponName)}</small>
            </span>
          `
        )
        .join("")}
    </div>
  `;
}

function renderGroupCard(group) {
  return `
    <article class="group-card" id="group-${group.id}">
      <header>
        <div>
          <h3>${escapeHtml(group.label)}</h3>
          <p>그룹 ${group.id} · ${group.curated ? "수동 라벨" : "자동/임시 라벨"}</p>
        </div>
        <div class="metrics">
          <span><b>${group.members.length}</b>명</span>
          <span><b>${formatNumber(group.totalGames)}</b>판</span>
          <span><b>${formatRp(group.weightedRp)}</b> RP</span>
        </div>
      </header>
      ${renderMemberChips(group.members)}
      <div class="grid">
        <section>
          <h4>강한 조합 유형</h4>
          ${renderEntryList(group.strong, "strong")}
        </section>
        <section>
          <h4>약한 조합 유형</h4>
          ${renderEntryList(group.weak, "weak")}
        </section>
      </div>
      ${renderMembers(group.members)}
    </article>
  `;
}

function renderRoleSection(data) {
  const groups = (data.groups ?? [])
    .map((group) => summarizeGroup(data, group))
    .filter((group) => group.members.length > 0);
  const totalMembers = groups.reduce((sum, group) => sum + group.members.length, 0);
  const totalGames = groups.reduce((sum, group) => sum + group.totalGames, 0);

  return `
    <section class="role-section" id="${data.roleSlug}">
      <div class="role-heading">
        <div>
          <h2>${escapeHtml(data.role)}</h2>
          <p>${escapeHtml(data.generatedFrom ?? "unknown")} · ${escapeHtml(data.generatedAt)} · minGames ${data.minGames}</p>
        </div>
        <div class="role-metrics">
          <span>${groups.length} 그룹</span>
          <span>${totalMembers}명</span>
          <span>${formatNumber(totalGames)}판</span>
        </div>
      </div>
      <div class="cards">
        ${groups.map(renderGroupCard).join("")}
      </div>
    </section>
  `;
}

function renderNav(datasets) {
  return `
    <nav>
      ${datasets
        .map(
          (data) => `
            <a href="#${data.roleSlug}">
              ${escapeHtml(data.role)}
              <small>${data.groups.length}</small>
            </a>
          `
        )
        .join("")}
    </nav>
  `;
}

function renderSummary(datasets) {
  return `
    <section class="summary">
      ${datasets
        .map((data) => {
          const groups = data.groups.map((group) => summarizeGroup(data, group));
          const games = groups.reduce((sum, group) => sum + group.totalGames, 0);
          const members = groups.reduce((sum, group) => sum + group.members.length, 0);
          const largest = [...groups].sort((a, b) => b.totalGames - a.totalGames)[0];
          return `
            <div class="summary-card">
              <span>${escapeHtml(data.role)}</span>
              <b>${data.groups.length} 그룹 · ${members}명</b>
              <small>${formatNumber(games)}판 · 최대 ${escapeHtml(largest?.label ?? "-")}</small>
            </div>
          `;
        })
        .join("")}
    </section>
  `;
}

function renderPage(datasets) {
  return `<!doctype html>
<html lang="ko">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>유형분석 그룹 리포트</title>
  <style>
    :root {
      color-scheme: light;
      --bg: #f7f7f4;
      --panel: #ffffff;
      --ink: #1c1f23;
      --muted: #69717c;
      --line: #dfe3e8;
      --green: #176a46;
      --red: #a23c3c;
      --blue: #245d8f;
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      background: var(--bg);
      color: var(--ink);
      font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      line-height: 1.45;
    }
    header.hero {
      padding: 36px clamp(20px, 4vw, 56px) 18px;
      border-bottom: 1px solid var(--line);
      background: #fff;
    }
    h1, h2, h3, h4, p { margin: 0; }
    h1 { font-size: clamp(28px, 4vw, 44px); letter-spacing: 0; }
    .hero p { margin-top: 10px; color: var(--muted); max-width: 920px; }
    nav {
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
      padding: 14px clamp(20px, 4vw, 56px);
      background: #fff;
      border-bottom: 1px solid var(--line);
      position: sticky;
      top: 0;
      z-index: 5;
    }
    nav a {
      color: var(--ink);
      text-decoration: none;
      border: 1px solid var(--line);
      background: #fdfdfb;
      padding: 8px 11px;
      border-radius: 8px;
      font-weight: 650;
    }
    nav small { color: var(--muted); margin-left: 4px; }
    main { padding: 22px clamp(20px, 4vw, 56px) 48px; }
    .summary {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
      gap: 12px;
      margin-bottom: 28px;
    }
    .summary-card, .group-card {
      background: var(--panel);
      border: 1px solid var(--line);
      border-radius: 8px;
    }
    .summary-card { padding: 14px 16px; }
    .summary-card span, .summary-card small { display: block; color: var(--muted); }
    .summary-card b { display: block; margin: 4px 0; }
    .role-section { margin-top: 36px; }
    .role-heading {
      display: flex;
      justify-content: space-between;
      gap: 16px;
      align-items: end;
      margin-bottom: 12px;
    }
    .role-heading h2 { font-size: 28px; }
    .role-heading p, .group-card p { color: var(--muted); margin-top: 4px; }
    .role-metrics, .metrics {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      justify-content: flex-end;
    }
    .role-metrics span, .metrics span {
      border: 1px solid var(--line);
      background: #fbfbf8;
      padding: 6px 9px;
      border-radius: 8px;
      white-space: nowrap;
    }
    .cards { display: grid; gap: 14px; }
    .group-card { padding: 16px; }
    .group-card > header {
      display: flex;
      justify-content: space-between;
      gap: 16px;
      align-items: start;
      margin-bottom: 14px;
    }
    .group-card h3 { font-size: 20px; }
    .member-chips {
      display: flex;
      flex-wrap: wrap;
      gap: 7px;
      margin: -2px 0 14px;
    }
    .member-chips span {
      display: inline-flex;
      align-items: baseline;
      gap: 5px;
      max-width: 100%;
      border: 1px solid var(--line);
      background: #fbfbf8;
      border-radius: 8px;
      padding: 6px 8px;
      white-space: nowrap;
    }
    .member-chips small {
      color: var(--muted);
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .grid {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 14px;
      margin-bottom: 14px;
    }
    h4 { font-size: 14px; margin-bottom: 8px; color: var(--blue); }
    .entry-list {
      margin: 0;
      padding-left: 20px;
    }
    .entry-list li { margin: 5px 0; }
    .entry-name { font-weight: 650; }
    .entry-meta { color: var(--muted); margin-left: 6px; }
    .strong .entry-meta { color: var(--green); }
    .weak .entry-meta { color: var(--red); }
    .empty { color: var(--muted); font-size: 14px; }
    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 14px;
    }
    th, td {
      border-top: 1px solid var(--line);
      padding: 8px 7px;
      text-align: left;
    }
    th { color: var(--muted); font-weight: 650; }
    td:nth-child(3), td:nth-child(4), th:nth-child(3), th:nth-child(4) { text-align: right; }
    @media (max-width: 760px) {
      .role-heading, .group-card > header { display: block; }
      .role-metrics, .metrics { justify-content: flex-start; margin-top: 10px; }
      .grid { grid-template-columns: 1fr; }
      nav { position: static; }
    }
  </style>
</head>
<body>
  <header class="hero">
    <h1>유형분석 그룹 리포트</h1>
    <p>현재 Lab JSON의 그룹 라벨과 멤버를 기준으로, 새 사전집계 테이블에서 재계산된 게임 수, 평균 RP, 강한/약한 조합 유형을 묶어 본 검토용 HTML입니다.</p>
  </header>
  ${renderNav(datasets)}
  <main>
    ${renderSummary(datasets)}
    ${datasets.map(renderRoleSection).join("")}
  </main>
</body>
</html>
`;
}

function main() {
  const datasets = ROLE_FILES.map((slug) =>
    JSON.parse(fs.readFileSync(path.resolve(LAB_DIR, `${slug}.json`), "utf8"))
  );
  fs.writeFileSync(OUT_PATH, renderPage(datasets));
  console.log(`wrote ${OUT_PATH}`);
}

main();
