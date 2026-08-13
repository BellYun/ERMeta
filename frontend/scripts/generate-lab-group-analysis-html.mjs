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

function formatPercent(value) {
  return `${(Number(value) * 100).toFixed(1)}%`;
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

function groupMembersByInternalRole(members) {
  const byInternalRole = new Map();
  for (const member of members) {
    const label =
      member.classification?.metricRole ?? member.classification?.fitRole ?? "유연 연계";
    const reason = member.classification?.fitReason ?? "전투 상황에 맞춰 유연하게 보완합니다.";
    const metricSummary = member.classification?.metricSummary ?? "지표 검증 정보 없음";
    const key = `${label}::${reason}::${metricSummary}`;
    const group = byInternalRole.get(key) ?? {
      label,
      reason,
      metricSummary,
      members: [],
      totalGames: 0,
    };
    group.members.push(member);
    group.totalGames += member.totalGames;
    byInternalRole.set(key, group);
  }

  return [...byInternalRole.values()].sort(
    (a, b) => b.totalGames - a.totalGames || a.label.localeCompare(b.label, "ko")
  );
}

function renderInternalRoleGroups(members) {
  const internalRoles = groupMembersByInternalRole(members);
  return `
    <div class="internal-role-groups">
      ${internalRoles
        .map(
          (internalRole) => `
            <section class="internal-role-card">
              <header>
                <div>
                  <h4>${escapeHtml(internalRole.label)}</h4>
                  <p>${escapeHtml(internalRole.reason)}</p>
                  <p class="metric-summary">${escapeHtml(internalRole.metricSummary)}</p>
                </div>
                <div class="internal-role-metrics">
                  <span>${internalRole.members.length}명</span>
                  <span>${formatNumber(internalRole.totalGames)}판</span>
                </div>
              </header>
              <div class="internal-members">
                ${internalRole.members
                  .map(
                    (member) => `
                      <article class="internal-member" title="${escapeHtml(comboKey(member))}">
                        <div class="member-title">
                          <b>${escapeHtml(member.characterName)}</b>
                          <small>${escapeHtml(member.weaponName)}</small>
                        </div>
                        <div class="member-fit">
                          <strong>+${formatRp(member.classification?.partnerDelta ?? 0)} RP</strong>
                          <span>${formatNumber(member.classification?.partnerGames ?? 0)}판 · ${formatPercent(member.classification?.partnerGameShare ?? 0)}</span>
                        </div>
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
      ${renderInternalRoleGroups(group.members)}
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
    </article>
  `;
}

function renderRoleSection(data) {
  const groups = (data.groups ?? [])
    .map((group) => summarizeGroup(data, group))
    .filter((group) => group.members.length > 0);
  const totalMembers = groups.reduce((sum, group) => sum + group.members.length, 0);
  const totalGames = groups.reduce((sum, group) => sum + group.totalGames, 0);
  const internalRoleCount = groups.reduce(
    (sum, group) => sum + groupMembersByInternalRole(group.members).length,
    0
  );
  const seasons = (data.seasons ?? []).join("+") || "unknown";

  return `
    <section class="role-section" id="${data.roleSlug}">
      <div class="role-heading">
        <div>
          <h2>${escapeHtml(data.role)}</h2>
          <p>${escapeHtml(data.generatedFrom ?? "unknown")} · 시즌 ${escapeHtml(seasons)} · ${escapeHtml(data.generatedAt)} · minGames ${data.minGames}</p>
        </div>
        <div class="role-metrics">
          <span>${groups.length} 그룹</span>
          <span>${internalRoleCount} 내부 역할군</span>
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
          const internalRoles = groups.reduce(
            (sum, group) => sum + groupMembersByInternalRole(group.members).length,
            0
          );
          const largest = [...groups].sort((a, b) => b.totalGames - a.totalGames)[0];
          return `
            <div class="summary-card">
              <span>${escapeHtml(data.role)}</span>
              <b>${data.groups.length} 조합 · ${internalRoles} 내부 역할군</b>
              <small>${members}명 · ${formatNumber(games)}판</small>
              <small>최대 ${escapeHtml(largest?.label ?? "-")}</small>
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
    .second-order-link {
      display: inline-block;
      margin-top: 14px;
      border: 1px solid var(--blue);
      border-radius: 8px;
      padding: 8px 11px;
      color: var(--blue);
      text-decoration: none;
      font-size: 13px;
      font-weight: 700;
    }
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
    .internal-role-groups {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
      gap: 10px;
      margin: -2px 0 16px;
    }
    .internal-role-card {
      min-width: 0;
      border: 1px solid var(--line);
      border-left: 3px solid var(--blue);
      background: #fbfbf8;
      border-radius: 8px;
      padding: 12px;
    }
    .internal-role-card > header {
      display: flex;
      justify-content: space-between;
      align-items: start;
      gap: 12px;
      margin-bottom: 10px;
    }
    .internal-role-card h4 {
      margin: 0;
      font-size: 15px;
      color: var(--blue);
    }
    .internal-role-card p {
      margin-top: 3px;
      font-size: 12px;
      line-height: 1.55;
    }
    .internal-role-card .metric-summary {
      color: var(--blue);
      font-weight: 650;
      font-variant-numeric: tabular-nums;
    }
    .internal-role-metrics {
      display: flex;
      gap: 5px;
      flex-shrink: 0;
    }
    .internal-role-metrics span {
      border: 1px solid var(--line);
      background: #fff;
      border-radius: 999px;
      padding: 3px 7px;
      color: var(--muted);
      font-size: 11px;
      white-space: nowrap;
    }
    .internal-members { display: grid; gap: 6px; }
    .internal-member {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 10px;
      min-width: 0;
      border-top: 1px solid var(--line);
      padding-top: 7px;
    }
    .member-title, .member-fit { min-width: 0; }
    .member-title b, .member-title small, .member-fit strong, .member-fit span { display: block; }
    .member-title small, .member-fit span {
      color: var(--muted);
      font-size: 11px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .member-fit { flex-shrink: 0; text-align: right; }
    .member-fit strong { color: var(--green); font-size: 12px; }
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
    @media (max-width: 760px) {
      .role-heading, .group-card > header { display: block; }
      .role-metrics, .metrics { justify-content: flex-start; margin-top: 10px; }
      .grid { grid-template-columns: 1fr; }
      .internal-role-groups { grid-template-columns: 1fr; }
      .internal-role-card > header { display: block; }
      .internal-role-metrics { margin-top: 8px; }
      nav { position: static; }
    }
  </style>
</head>
<body>
  <header class="hero">
    <h1>유형분석 그룹 리포트</h1>
    <p>파트너 역할 조합과 전투 특성으로 먼저 묶은 뒤, 강·약 방향과 RP·판수 지표의 불일치가 명확한 후보만 재분리했습니다. 시즌 10·11 통합 성과와 지표군별 일치도를 함께 확인할 수 있습니다.</p>
    <a class="second-order-link" href="./composition-analysis.html">2차 조합 유형 분석 보기 →</a>
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
  const html = renderPage(datasets).replace(/[ \t]+$/gm, "");
  fs.writeFileSync(OUT_PATH, html);
  console.log(`wrote ${OUT_PATH}`);
}

main();
