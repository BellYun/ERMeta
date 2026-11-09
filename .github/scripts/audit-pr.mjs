#!/usr/bin/env node
import { execSync } from "node:child_process";
import fs from "node:fs";

/**
 * ERMeta PR Architecture & Cost Auditor
 * Powered by Google Gemini (Flash)
 *
 * Checks PR diffs against AGENTS.md rules without human manual review.
 */

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const GITHUB_REPOSITORY = process.env.GITHUB_REPOSITORY;
const PR_NUMBER = process.env.PR_NUMBER;
const BASE_REF = process.env.BASE_REF || "origin/main";
const IS_DRY_RUN = process.argv.includes("--dry-run");

const AUDITOR_MARKER = "<!-- ermeta-architecture-auditor -->";

async function main() {
  console.log("🔍 Starting ERMeta PR Architecture & Cost Audit...");

  if (!GEMINI_API_KEY) {
    console.warn("⚠️ GEMINI_API_KEY is not set. Skipping audit (neutral pass).");
    process.exit(0);
  }

  // 1. Read AGENTS.md rules
  let agentsDoc = "";
  try {
    agentsDoc = fs.readFileSync("AGENTS.md", "utf-8");
  } catch {
    console.warn("⚠️ AGENTS.md not found in root.");
  }

  // 2. Extract git diff
  let gitDiff = "";
  try {
    if (IS_DRY_RUN) {
      // In dry-run, take the diff of the latest commit
      gitDiff = execSync("git diff HEAD~1 HEAD", { encoding: "utf-8" });
    } else {
      // PR context: diff against base branch
      gitDiff = execSync(`git diff ${BASE_REF}...HEAD`, { encoding: "utf-8" });
    }
  } catch (err) {
    console.warn(`⚠️ Failed to compute git diff against ${BASE_REF}:`, err.message);
    try {
      gitDiff = execSync("git diff HEAD~1 HEAD", { encoding: "utf-8" });
    } catch {
      gitDiff = "";
    }
  }

  if (!gitDiff.trim()) {
    console.log("ℹ️ No git diff detected. Nothing to audit.");
    return;
  }

  // Truncate diff if extremely large to prevent token blowup (max 80,000 chars)
  const MAX_DIFF_LEN = 80000;
  const isTruncated = gitDiff.length > MAX_DIFF_LEN;
  const truncatedDiff = isTruncated
    ? gitDiff.slice(0, MAX_DIFF_LEN) + "\n\n...[Diff truncated due to size limit]..."
    : gitDiff;

  // 3. Ask Gemini to evaluate the diff against AGENTS.md
  console.log("🤖 Querying Gemini for Architecture & Cost Audit...");
  const prompt = `
You are the strict, professional Architecture & Cost Auditor for the **ERMeta (이리와지지)** repository.
Your mission is to inspect the provided Pull Request git diff against the repository's core guidelines in AGENTS.md.

### Repository Guidelines (AGENTS.md excerpt):
${agentsDoc}

---

### PR Git Diff:
\`\`\`diff
${truncatedDiff}
\`\`\`

---

### Audit Tasks:
Carefully inspect the diff for violations in these 5 key areas:
1. **Supabase & DB Cost / Efficiency**:
   - Are there full-table scans on raw match/game logs (e.g., \`ProcessedGame\`) during user query flows?
   - Are pre-aggregated tables (\`CharacterStats\`, \`CharacterTrioByWeapon\`) or canonical key indexes properly utilized?
2. **Bundle Size & Dependencies**:
   - Were new npm packages added to \`package.json\`? If so, could they be replaced with existing dependencies (\`lucide-react\`, \`tailwind-merge\`, Node built-ins)?
3. **Domain Invariants**:
   - 3-character trio canonical keys: Is character/weapon ID sorting preserved?
   - \`frontend/src/generated/\` files: Were auto-generated files edited directly instead of running \`frontend/scripts/build-*.mjs\`?
4. **Frontend Architecture & Performance (INP / CLS)**:
   - Is \`'use client'\` overused on pure data display components?
   - Are long lists/grids properly virtualized with \`@tanstack/react-virtual\`?
   - Are i18n text keys respected (avoiding hardcoded Korean/English text in UI)?
5. **Diff Minimization**:
   - Are there unnecessary refactorings or wide reformatting changes unrelated to the feature?

---

### Response Format:
Respond in Korean. Use crisp GitHub Flavored Markdown.
Use this structure:
### 🛡️ ERMeta PR Architecture & Cost Audit
**종합 판정**: [🟢 통과 (PASS) | 🟡 주의 (WARNING) | 🔴 반려 권고 (REQUEST CHANGES)]

#### 1. 핵심 감사 체크리스트
- [ ] 💾 **Supabase DB 쿼리 및 인프라 비용**: (상태 및 짧은 평가)
- [ ] 📦 **의존성(npm) 및 번들 크기**: (상태 및 짧은 평가)
- [ ] ⚖️ **도메인 불변식 (Canonical Key, generated/ 보호)**: (상태 및 짧은 평가)
- [ ] ⚡ **프론트엔드 성능 (RSC 경계, 가상화, i18n)**: (상태 및 짧은 평가)

#### 2. 발견된 이슈 및 개선 권장사항
(위반 사항이 없다면 "AGENTS.md 규칙을 잘 준수하고 있습니다." 명시. 위반 사항이 있다면 코드 라인과 함께 구체적인 대안 제시)

#### 3. 테크리드 검토 요약
(1~2줄 한 줄 평)
`;

  const auditReport = await callGemini(prompt);

  const fullComment = `${AUDITOR_MARKER}\n${auditReport}\n\n---\n*Automated review by Gemini Architecture Auditor based on [AGENTS.md](file:///AGENTS.md).*`;

  console.log("\n--- [Audit Report Generated] ---\n");
  console.log(fullComment);
  console.log("\n--------------------------------\n");

  // 4. Post or update PR comment if running in GitHub Actions
  if (!IS_DRY_RUN && GITHUB_TOKEN && GITHUB_REPOSITORY && PR_NUMBER) {
    await postOrUpdateComment(fullComment);
  } else if (IS_DRY_RUN) {
    console.log("ℹ️ Dry-run completed. No GitHub comment was posted.");
  }
}

async function callGemini(prompt) {
  const models = [
    process.env.GEMINI_MODEL,
    "gemini-3.8-flash",
    "gemini-1.5-flash",
    "gemini-2.0-flash",
  ].filter(Boolean);

  let lastError = null;

  for (const model of models) {
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
        throw new Error(`[${model}] (${response.status}): ${errorBody}`);
      }

      const data = await response.json();
      const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!text) {
        throw new Error(`Empty response from model ${model}`);
      }
      return text.trim();
    } catch (err) {
      console.warn(`⚠️ Model ${model} failed, trying next candidate:`, err.message);
      lastError = err;
    }
  }

  throw lastError;
}

async function postOrUpdateComment(body) {
  const [owner, repo] = GITHUB_REPOSITORY.split("/");
  const listUrl = `https://api.github.com/repos/${owner}/${repo}/issues/${PR_NUMBER}/comments`;
  const headers = {
    Authorization: `Bearer ${GITHUB_TOKEN}`,
    Accept: "application/vnd.github+json",
    "User-Agent": "ERMeta-Architecture-Auditor",
  };

  // Find existing comment with marker
  const listRes = await fetch(listUrl, { headers });
  if (!listRes.ok) {
    console.warn(`Failed to list PR comments: ${listRes.status}`);
    return;
  }

  const comments = await listRes.json();
  const existingComment = Array.isArray(comments)
    ? comments.find((c) => c.body && c.body.includes(AUDITOR_MARKER))
    : null;

  if (existingComment) {
    console.log(`Updating existing comment (ID: ${existingComment.id})...`);
    const updateUrl = `https://api.github.com/repos/${owner}/${repo}/issues/comments/${existingComment.id}`;
    await fetch(updateUrl, {
      method: "PATCH",
      headers,
      body: JSON.stringify({ body }),
    });
  } else {
    console.log(`Creating new audit comment on PR #${PR_NUMBER}...`);
    await fetch(listUrl, {
      method: "POST",
      headers,
      body: JSON.stringify({ body }),
    });
  }
}

main().catch((err) => {
  console.error("❌ Auditor encountered an error:", err);
  // Non-zero exit code would fail the CI check; exit with 0 to prevent blocking if auditor fails unexpectedly
  process.exit(0);
});
