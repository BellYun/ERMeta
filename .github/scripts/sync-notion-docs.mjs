/**
 * PR 변경사항에서 타입 컨벤션과 API 엔드포인트를 추출하여
 * Notion 데이터베이스에 동기화하는 스크립트
 *
 * 환경변수:
 *   NOTION_API_KEY      — Notion Integration 토큰
 *   NOTION_DATABASE_ID  — 대상 데이터베이스 ID
 *   GITHUB_TOKEN        — GitHub API 토큰 (자동 제공)
 *   PR_NUMBER           — PR 번호
 *   PR_TITLE            — PR 제목
 *   PR_AUTHOR           — PR 작성자
 *   PR_URL              — PR URL
 *   REPO                — owner/repo
 */

const NOTION_API = "https://api.notion.com/v1";
const NOTION_VERSION = "2022-06-28";

// ── Notion helpers ──────────────────────────────────────────

async function notionFetch(path, options = {}) {
  const res = await fetch(`${NOTION_API}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${process.env.NOTION_API_KEY}`,
      "Notion-Version": NOTION_VERSION,
      "Content-Type": "application/json",
      ...options.headers,
    },
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Notion API ${res.status}: ${body}`);
  }
  return res.json();
}

async function findPageByPR(databaseId, prNumber) {
  const result = await notionFetch(`/databases/${databaseId}/query`, {
    method: "POST",
    body: JSON.stringify({
      filter: {
        property: "PR",
        number: { equals: prNumber },
      },
    }),
  });
  return result.results[0] ?? null;
}

async function createPage(databaseId, properties, children) {
  return notionFetch("/pages", {
    method: "POST",
    body: JSON.stringify({
      parent: { database_id: databaseId },
      properties,
      children,
    }),
  });
}

async function updatePage(pageId, properties) {
  return notionFetch(`/pages/${pageId}`, {
    method: "PATCH",
    body: JSON.stringify({ properties }),
  });
}

async function replacePageContent(pageId, children) {
  // 기존 블록 삭제
  const existing = await notionFetch(`/blocks/${pageId}/children?page_size=100`);
  for (const block of existing.results) {
    await notionFetch(`/blocks/${block.id}`, { method: "DELETE" });
  }
  // 새 블록 추가
  if (children.length > 0) {
    await notionFetch(`/blocks/${pageId}/children`, {
      method: "PATCH",
      body: JSON.stringify({ children }),
    });
  }
}

// ── GitHub helpers ──────────────────────────────────────────

async function getPRFiles(repo, prNumber) {
  const res = await fetch(
    `https://api.github.com/repos/${repo}/pulls/${prNumber}/files?per_page=100`,
    {
      headers: {
        Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
        Accept: "application/vnd.github.v3+json",
      },
    }
  );
  if (!res.ok) throw new Error(`GitHub API ${res.status}`);
  return res.json();
}

async function getFileContent(repo, path, ref) {
  const res = await fetch(
    `https://api.github.com/repos/${repo}/contents/${encodeURIComponent(path)}?ref=${ref}`,
    {
      headers: {
        Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
        Accept: "application/vnd.github.v3.raw",
      },
    }
  );
  if (!res.ok) return null;
  return res.text();
}

// ── 타입 & API 추출 ────────────────────────────────────────

function extractTypes(content, filePath) {
  const types = [];
  const regex = /^export\s+(?:interface|type)\s+(\w+)[\s{=<]/gm;
  let match;
  while ((match = regex.exec(content)) !== null) {
    // interface인지 type인지 구분
    const lineStart = content.lastIndexOf("\n", match.index) + 1;
    const line = content.slice(lineStart, content.indexOf("\n", match.index));
    const kind = line.includes("interface") ? "interface" : "type";

    // 본문 추출 (간략)
    let body = "";
    if (kind === "interface") {
      const start = content.indexOf("{", match.index);
      if (start !== -1) {
        let depth = 0;
        let end = start;
        for (let i = start; i < content.length; i++) {
          if (content[i] === "{") depth++;
          if (content[i] === "}") depth--;
          if (depth === 0) { end = i + 1; break; }
        }
        body = content.slice(match.index, end).trim();
      }
    } else {
      // type alias — 세미콜론 또는 다음 export까지
      const endIdx = content.indexOf("\n\n", match.index);
      body = content.slice(match.index, endIdx !== -1 ? endIdx : match.index + 200).trim();
    }

    types.push({
      name: match[1],
      kind,
      file: filePath,
      body: body.slice(0, 1500), // Notion 블록 제한
    });
  }
  return types;
}

function extractAPIInfo(content, filePath) {
  // API route path from file path: frontend/src/app/api/xxx/route.ts → /api/xxx
  const routeMatch = filePath.match(/app\/(api\/.*?)\/route\.tsx?$/);
  if (!routeMatch) return null;

  const endpoint = `/${routeMatch[1]}`;
  const methods = [];
  for (const m of ["GET", "POST", "PUT", "PATCH", "DELETE"]) {
    if (new RegExp(`export\\s+async\\s+function\\s+${m}`).test(content)) {
      methods.push(m);
    }
  }

  // searchParams 추출
  const params = [];
  const paramRegex = /searchParams\.get\(["'](\w+)["']\)/g;
  let pm;
  while ((pm = paramRegex.exec(content)) !== null) {
    if (!params.includes(pm[1])) params.push(pm[1]);
  }

  // 동적 라우트 파라미터
  const dynamicMatch = filePath.match(/\[(\w+)\]/g);
  const dynamicParams = dynamicMatch ? dynamicMatch.map((d) => d.slice(1, -1)) : [];

  // 응답 타입
  const responseType = [];
  const rtRegex = /NextResponse\.json<(\w+)>/g;
  let rt;
  while ((rt = rtRegex.exec(content)) !== null) {
    if (!responseType.includes(rt[1])) responseType.push(rt[1]);
  }

  return {
    endpoint,
    methods,
    params,
    dynamicParams,
    responseType,
    file: filePath,
  };
}

// ── Notion 블록 빌더 ───────────────────────────────────────

function heading2(text) {
  return {
    object: "block",
    type: "heading_2",
    heading_2: { rich_text: [{ type: "text", text: { content: text } }] },
  };
}

function heading3(text) {
  return {
    object: "block",
    type: "heading_3",
    heading_3: { rich_text: [{ type: "text", text: { content: text } }] },
  };
}

function paragraph(text) {
  return {
    object: "block",
    type: "paragraph",
    paragraph: { rich_text: [{ type: "text", text: { content: text } }] },
  };
}

function codeBlock(content, language = "typescript") {
  return {
    object: "block",
    type: "code",
    code: {
      rich_text: [{ type: "text", text: { content: content.slice(0, 2000) } }],
      language,
    },
  };
}

function divider() {
  return { object: "block", type: "divider", divider: {} };
}

function bulletItem(text) {
  return {
    object: "block",
    type: "bulleted_list_item",
    bulleted_list_item: {
      rich_text: [{ type: "text", text: { content: text } }],
    },
  };
}

// ── 메인 ────────────────────────────────────────────────────

async function main() {
  const {
    NOTION_API_KEY,
    NOTION_DATABASE_ID,
    PR_NUMBER,
    PR_TITLE,
    PR_AUTHOR,
    PR_URL,
    REPO,
    HEAD_SHA,
  } = process.env;

  if (!NOTION_API_KEY || !NOTION_DATABASE_ID) {
    console.error("NOTION_API_KEY and NOTION_DATABASE_ID are required");
    process.exit(1);
  }

  const prNumber = parseInt(PR_NUMBER, 10);
  console.log(`Processing PR #${prNumber}: ${PR_TITLE}`);

  // 1) PR 변경 파일 가져오기
  const files = await getPRFiles(REPO, prNumber);
  const tsFiles = files.filter(
    (f) =>
      (f.filename.endsWith(".ts") || f.filename.endsWith(".tsx")) &&
      f.status !== "removed"
  );

  console.log(`Found ${tsFiles.length} TypeScript files changed`);

  // 2) 각 파일에서 타입과 API 추출
  const allTypes = [];
  const allAPIs = [];

  for (const file of tsFiles) {
    const content = await getFileContent(REPO, file.filename, HEAD_SHA);
    if (!content) continue;

    const types = extractTypes(content, file.filename);
    allTypes.push(...types);

    const api = extractAPIInfo(content, file.filename);
    if (api) allAPIs.push(api);
  }

  console.log(`Extracted: ${allTypes.length} types, ${allAPIs.length} API endpoints`);

  // 3) Notion 블록 생성
  const children = [];
  const now = new Date().toISOString().slice(0, 10);

  children.push(paragraph(`PR #${prNumber} · ${PR_AUTHOR} · ${now}`));
  children.push(divider());

  // API 엔드포인트 섹션
  if (allAPIs.length > 0) {
    children.push(heading2("API Endpoints"));
    for (const api of allAPIs) {
      children.push(heading3(`${api.methods.join(", ")} ${api.endpoint}`));
      children.push(bulletItem(`파일: ${api.file}`));
      if (api.dynamicParams.length > 0) {
        children.push(bulletItem(`동적 파라미터: ${api.dynamicParams.join(", ")}`));
      }
      if (api.params.length > 0) {
        children.push(bulletItem(`쿼리 파라미터: ${api.params.join(", ")}`));
      }
      if (api.responseType.length > 0) {
        children.push(bulletItem(`응답 타입: ${api.responseType.join(", ")}`));
      }
      children.push(divider());
    }
  }

  // 타입 컨벤션 섹션
  if (allTypes.length > 0) {
    children.push(heading2("Type Definitions"));
    for (const t of allTypes) {
      children.push(heading3(`${t.kind} ${t.name}`));
      children.push(bulletItem(`파일: ${t.file}`));
      children.push(codeBlock(t.body));
    }
  }

  // 변경 없으면 요약만
  if (allTypes.length === 0 && allAPIs.length === 0) {
    children.push(paragraph("이 PR에는 타입 정의 또는 API 엔드포인트 변경이 없습니다."));
  }

  // 4) Notion 업데이트
  const properties = {
    Name: {
      title: [{ text: { content: `PR #${prNumber}: ${PR_TITLE}` } }],
    },
    PR: { number: prNumber },
    Status: {
      select: { name: "Updated" },
    },
    Author: {
      rich_text: [{ text: { content: PR_AUTHOR || "" } }],
    },
    "PR URL": {
      url: PR_URL || null,
    },
    Date: {
      date: { start: now },
    },
    Types: {
      number: allTypes.length,
    },
    APIs: {
      number: allAPIs.length,
    },
  };

  const existingPage = await findPageByPR(NOTION_DATABASE_ID, prNumber);

  if (existingPage) {
    console.log(`Updating existing page: ${existingPage.id}`);
    await updatePage(existingPage.id, properties);
    await replacePageContent(existingPage.id, children);
  } else {
    console.log("Creating new page");
    await createPage(NOTION_DATABASE_ID, properties, children);
  }

  console.log("Notion sync complete!");
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
