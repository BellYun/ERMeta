#!/usr/bin/env node
import fs from "node:fs";

/**
 * ERMeta Issue-to-Plan Technical Spec Generator
 * Powered by Google Gemini
 *
 * Automatically produces architectural implementation specs for Codex / developers.
 */

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const GITHUB_REPOSITORY = process.env.GITHUB_REPOSITORY;
const ISSUE_NUMBER = process.env.ISSUE_NUMBER;
const ISSUE_TITLE = process.env.ISSUE_TITLE || "";
const ISSUE_BODY = process.env.ISSUE_BODY || "";
const IS_DRY_RUN = process.argv.includes("--dry-run");

const PLANNER_MARKER = "<!-- ermeta-issue-planner -->";

async function main() {
  console.log(`🧭 Starting Issue Planner for #${ISSUE_NUMBER}: "${ISSUE_TITLE}"...`);

  if (!GEMINI_API_KEY) {
    console.warn("⚠️ GEMINI_API_KEY is not set. Skipping planning.");
    process.exit(0);
  }

  if (!ISSUE_TITLE && !ISSUE_BODY) {
    console.warn("⚠️ Empty issue title and body. Nothing to plan.");
    return;
  }

  // Read AGENTS.md for architecture & cost guardrails
  let agentsDoc = "";
  try {
    agentsDoc = fs.readFileSync("AGENTS.md", "utf-8");
  } catch {
    console.warn("⚠️ AGENTS.md not found.");
  }

  console.log("🤖 Querying Gemini to generate architectural plan & technical spec...");

  const prompt = `
You are the Chief Technical Architect and Tech Lead for **ERMeta (이리와지지)**.
A developer or product manager has opened a GitHub Issue.
Your mission is to formulate a crisp, concrete, zero-ambiguity **Technical Implementation Plan** so that a senior coder (like OpenAI Codex or an engineer) can implement it with minimal diff and zero architectural violations.

---

### Repository Guardrails (AGENTS.md):
${agentsDoc}

---

### GitHub Issue to Plan:
- **Title**: ${ISSUE_TITLE}
- **Description**:
${ISSUE_BODY}

---

### Instructions:
Formulate the plan in Korean. Use clean GitHub Flavored Markdown.
Strictly adhere to:
- **Diff Minimization**: Identify the absolute minimum set of files to touch.
- **Cost Guardrails**: Never allow full-table scans on raw match logs (ProcessedGame). Require pre-aggregated tables or canonical indexes.
- **Frontend Performance**: Preserve virtualization (@tanstack/react-virtual) if listing items. Keep RSC boundaries clean.
- **Domain Invariants**: Preserve trio canonical keys. Never edit frontend/src/generated/ directly.

### Output Structure:
### 🧭 ERMeta Architectural Implementation Plan (Spec)
> **요구사항 핵심**: (1~2줄 요약)

#### 1. 📂 변경 대상 파일 목록 (Target Files)
- \`[파일 경로]\` - (어떤 함수/컴포넌트를 추가/수정하는지)

#### 2. 🛡️ 필수 준수 가드레일 (AGENTS.md Guardrails)
- [ ] 💾 **Supabase DB**: (쿼리 방식 및 인덱스 활용 가이드)
- [ ] 📦 **의존성**: (외부 라이브러리 추가 금지, 기존 유틸 재사용)
- [ ] ⚡ **성능/아키텍처**: (RSC 경계, 가상화 유지 여부, i18n 적용)

#### 3. 🛠️ 단계별 구현 가이드 (Step-by-Step)
1. **[단계 1]**: ...
2. **[단계 2]**: ...
3. **[검증 단계]**: 실행할 자가 검증 명령어 (\`cd frontend && npm test\`, \`npm run build\` 등)

#### 4. 🤖 Codex / Developer 실행용 프롬프트 (Prompt for Builder)
\`\`\`markdown
[Codex에게 복사-붙여넣기하여 바로 작업을 지시할 수 있는 정밀 프롬프트]
\`\`\`
`;

  const specReport = await callGemini(prompt);
  const fullComment = `${PLANNER_MARKER}\n${specReport}\n\n---\n*Architectural blueprint generated automatically by Gemini Planner based on [AGENTS.md](file:///AGENTS.md).*`;

  console.log("\n--- [Generated Blueprint] ---\n");
  console.log(fullComment);
  console.log("\n-----------------------------\n");

  if (!IS_DRY_RUN && GITHUB_TOKEN && GITHUB_REPOSITORY && ISSUE_NUMBER) {
    await postOrUpdateComment(fullComment);
  }
}

async function callGemini(prompt) {
  const models = [
    process.env.GEMINI_MODEL,
    "gemini-3.8-flash",
    "gemini-3.8-pro",
  ].filter(Boolean);

  let lastError = null;

  for (const model of models) {
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_API_KEY}`;
        const response = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: {
              temperature: 0.2,
            },
          }),
        });

        if (!response.ok) {
          const errorBody = await response.text();
          if ((response.status === 503 || response.status === 429) && attempt < 3) {
            const waitMs = attempt * 2000;
            console.warn(`⏳ [${model}] ${response.status} High demand. Retrying in ${waitMs / 1000}s...`);
            await new Promise((r) => setTimeout(r, waitMs));
            continue;
          }
          throw new Error(`[${model}] (${response.status}): ${errorBody}`);
        }

        const data = await response.json();
        const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!text) throw new Error(`Empty response from model ${model}`);
        return text.trim();
      } catch (err) {
        if (attempt < 3 && (err.message.includes("503") || err.message.includes("429"))) {
          const waitMs = attempt * 2000;
          console.warn(`⏳ [${model}] Temporary error. Retrying in ${waitMs / 1000}s...`);
          await new Promise((r) => setTimeout(r, waitMs));
          continue;
        }
        console.warn(`⚠️ Model ${model} failed:`, err.message);
        lastError = err;
        break;
      }
    }
  }

  throw lastError;
}

async function postOrUpdateComment(body) {
  const [owner, repo] = GITHUB_REPOSITORY.split("/");
  const listUrl = `https://api.github.com/repos/${owner}/${repo}/issues/${ISSUE_NUMBER}/comments`;
  const headers = {
    Authorization: `Bearer ${GITHUB_TOKEN}`,
    Accept: "application/vnd.github+json",
    "User-Agent": "ERMeta-Issue-Planner",
  };

  const listRes = await fetch(listUrl, { headers });
  if (!listRes.ok) {
    console.warn(`Failed to list issue comments: ${listRes.status}`);
    return;
  }

  const comments = await listRes.json();
  const existingComment = Array.isArray(comments)
    ? comments.find((c) => c.body && c.body.includes(PLANNER_MARKER))
    : null;

  if (existingComment) {
    console.log(`Updating existing plan comment (ID: ${existingComment.id})...`);
    const updateUrl = `https://api.github.com/repos/${owner}/${repo}/issues/comments/${existingComment.id}`;
    await fetch(updateUrl, {
      method: "PATCH",
      headers,
      body: JSON.stringify({ body }),
    });
  } else {
    console.log(`Posting new plan comment on Issue #${ISSUE_NUMBER}...`);
    await fetch(listUrl, {
      method: "POST",
      headers,
      body: JSON.stringify({ body }),
    });
  }
}

main().catch((err) => {
  console.error("❌ Planner error:", err);
  process.exit(0);
});
