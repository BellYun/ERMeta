#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, "../..");
const FRONTEND_DIR = path.resolve(ROOT_DIR, "frontend");

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

// Parse CLI flags
const args = process.argv.slice(2);
function getArg(flag) {
  const idx = args.indexOf(flag);
  return idx !== -1 && args[idx + 1] ? args[idx + 1] : null;
}
const url = getArg("--url");
const filePath = getArg("--file");
const version = getArg("--version");
const isDryRun = args.includes("--dry-run");

if (!version) {
  console.error("❌ Error: --version <e.g. 12.8> is required.");
  process.exit(1);
}

if (!url && !filePath) {
  console.error("❌ Error: Either --url <URL> or --file <path> is required.");
  process.exit(1);
}

if (!GEMINI_API_KEY) {
  console.error("❌ Error: GEMINI_API_KEY environment variable is required.");
  process.exit(1);
}

async function fetchHtmlText(targetUrl) {
  console.log(`🌐 Fetching patch notes from ${targetUrl}...`);
  const res = await fetch(targetUrl, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "Accept-Language": "ko-KR,ko;q=0.9",
    },
  });
  if (!res.ok) {
    throw new Error(`Failed to fetch ${targetUrl}: ${res.status} ${res.statusText}`);
  }
  const html = await res.text();
  // Strip script, style, comments, and HTML tags
  const cleanText = html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, "")
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\r\n|\r/g, "\n")
    .replace(/[ \t]+/g, " ")
    .replace(/\n\s*\n+/g, "\n\n");

  return cleanText;
}

async function callGemini(prompt) {
  const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`;
  const response = await fetch(apiUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.1,
      },
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Gemini API error (${response.status}): ${errorBody}`);
  }

  const data = await response.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error("Empty response from Gemini API");
  return text.trim();
}

async function main() {
  console.log(`🚀 Starting Patch Note Generator for v${version}...`);

  let rawContent = "";
  if (url) {
    rawContent = await fetchHtmlText(url);
  } else if (filePath) {
    rawContent = fs.readFileSync(path.resolve(process.cwd(), filePath), "utf-8");
  }

  // Load character map and weapon map for reference
  const charMapPath = path.resolve(FRONTEND_DIR, "src/lib/characterMap.ts");
  const charMapCode = fs.readFileSync(charMapPath, "utf-8");
  const weaponMapPath = path.resolve(FRONTEND_DIR, "src/lib/weaponMap.ts");
  const weaponMapCode = fs.readFileSync(weaponMapPath, "utf-8");

  // Read reference file (12.7.ts or latest available)
  const refPath = path.resolve(FRONTEND_DIR, "src/data/12.7.ts");
  const sample12_7 = fs.existsSync(refPath) ? fs.readFileSync(refPath, "utf-8") : "";

  const prompt = `
You are an expert compiler that transforms official Eternal Return (이터널리턴) balance patch notes into exact TypeScript code for the ERMeta service.

### Target Patch Version:
"${version}"

### Reference File Format (Example from v12.7):
\`\`\`typescript
${sample12_7}
\`\`\`

### Character Code Mapping Reference:
${charMapCode.slice(0, 4000)}

### Weapon Code Mapping Reference:
${weaponMapCode.slice(0, 3000)}

---

### Instructions:
1. Parse the character balance changes from the raw patch notes below.
2. Ignore cobalt-only changes (코발트 프로토콜 제외).
3. For each character:
   - Identify their characterCode from the Character Code Reference.
   - For each change, determine:
     - \`target\`: e.g. "스냅샷(Q) · 스킬 증폭 계수", "기본 체력", "방망이 숙련도 · 레벨당 스킬 증폭"
     - \`changeType\`: "buff" | "nerf" | "rework"
     - \`valueSummary\`: e.g. "80% → 85%", "930 → 900", "12/14/16/18/20% → 7/9/11/13/15%"
     - \`weaponMasteryCode\`: Include if the change is weapon-mastery or weapon-specific (e.g. 18 for 쌍검, 3 for 방망이, etc. from Weapon Code Reference). Otherwise omit.
4. Keep the helper functions \`change\` and \`note\` identical to the reference.
5. Add character name comment at the end of each note line (e.g. \`// 나타폰\`).
6. Output ONLY the valid TypeScript code. Do not wrap in markdown quotes if possible, or use standard \`\`\`typescript fence.

---

### Raw Patch Notes Text:
${rawContent.slice(0, 70000)}
`;

  console.log("🤖 Asking Gemini to parse patch changes and synthesize TypeScript code...");
  const rawCode = await callGemini(prompt);

  // Extract clean code
  const codeMatch = rawCode.match(/```(?:typescript|ts)?([\s\S]*?)```/);
  const cleanCode = (codeMatch ? codeMatch[1] : rawCode).trim() + "\n";

  if (isDryRun) {
    console.log("\n--- [DRY RUN OUTPUT] ---\n");
    console.log(cleanCode);
    console.log("\n--- [END DRY RUN] ---\n");
    return;
  }

  // 1. Write the new version file: frontend/src/data/{version}.ts
  const targetFilePath = path.resolve(FRONTEND_DIR, `src/data/${version}.ts`);
  fs.writeFileSync(targetFilePath, cleanCode, "utf-8");
  console.log(`✅ Created: frontend/src/data/${version}.ts`);

  // 2. Update frontend/src/data/patch-notes.ts
  const indexFilePath = path.resolve(FRONTEND_DIR, "src/data/patch-notes.ts");
  let indexContent = fs.readFileSync(indexFilePath, "utf-8");

  const [major, minor] = version.split(".");
  const varName = `PATCH_${major}_${minor}`;
  const importLine = `import { PATCH_NOTES as ${varName} } from "./${version}";`;

  if (!indexContent.includes(importLine)) {
    // Add import right before export type or after last import
    const lastImportIdx = indexContent.lastIndexOf("import { PATCH_NOTES as");
    if (lastImportIdx !== -1) {
      const nextLineIdx = indexContent.indexOf("\n", lastImportIdx);
      indexContent =
        indexContent.slice(0, nextLineIdx + 1) +
        importLine +
        "\n" +
        indexContent.slice(nextLineIdx + 1);
    }

    // Add to PATCH_NOTES array
    const arrayClosingIdx = indexContent.indexOf("];", indexContent.indexOf("export const PATCH_NOTES"));
    if (arrayClosingIdx !== -1) {
      indexContent =
        indexContent.slice(0, arrayClosingIdx) +
        `  ...${varName},\n` +
        indexContent.slice(arrayClosingIdx);
    }

    fs.writeFileSync(indexFilePath, indexContent, "utf-8");
    console.log(`✅ Updated: frontend/src/data/patch-notes.ts (registered ${varName})`);
  } else {
    console.log(`ℹ️ ${varName} already imported in patch-notes.ts`);
  }

  console.log(`\n🎉 Successfully generated patch data for v${version}!`);
}

main().catch((err) => {
  console.error("❌ Error generating patch note:", err);
  process.exit(1);
});
