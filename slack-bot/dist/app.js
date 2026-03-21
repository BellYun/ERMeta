"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const path = __importStar(require("path"));
const bolt_1 = require("@slack/bolt");
const codebase_1 = require("./codebase");
const claude_1 = require("./claude");
const app = new bolt_1.App({
    token: process.env.SLACK_BOT_TOKEN,
    appToken: process.env.SLACK_APP_TOKEN,
    socketMode: true,
});
const codebasePath = process.env.CODE_BASE_PATH || "../";
const reader = new codebase_1.CodebaseReader(codebasePath);
const explainer = new claude_1.CodeExplainer(process.env.ANTHROPIC_API_KEY);
function parseCommand(text) {
    // 멘션 제거
    const cleaned = text.replace(/<@[A-Z0-9]+>/g, "").trim();
    if (cleaned.startsWith("파일 설명") || cleaned.startsWith("파일설명")) {
        return { command: "explain_file", args: cleaned.replace(/파일\s?설명\s*/, "") };
    }
    if (cleaned.startsWith("검색")) {
        return { command: "search", args: cleaned.replace(/검색\s*/, "") };
    }
    if (cleaned.startsWith("구조")) {
        return { command: "structure", args: cleaned.replace(/구조\s*/, "") };
    }
    if (cleaned.startsWith("파일 목록") || cleaned.startsWith("파일목록")) {
        return { command: "list_files", args: cleaned.replace(/파일\s?목록\s*/, "") };
    }
    // 기본: 자유 질문
    return { command: "ask", args: cleaned };
}
// 앱 멘션 핸들러
app.event("app_mention", async ({ event, say }) => {
    const { command, args } = parseCommand(event.text || "");
    // 처리 중 메시지
    const loadingMsg = await say({
        text: "🔍 분석 중...",
        thread_ts: event.ts,
    });
    try {
        const response = await handleCommand(command, args);
        if (loadingMsg?.ts) {
            await app.client.chat.update({
                channel: event.channel,
                ts: loadingMsg.ts,
                text: response,
            });
        }
        else {
            await say({ text: response, thread_ts: event.ts });
        }
    }
    catch (error) {
        const errText = `❌ 오류가 발생했습니다: ${error instanceof Error ? error.message : "알 수 없는 오류"}`;
        if (loadingMsg?.ts) {
            await app.client.chat.update({
                channel: event.channel,
                ts: loadingMsg.ts,
                text: errText,
            });
        }
        else {
            await say({ text: errText, thread_ts: event.ts });
        }
    }
});
// DM 핸들러
app.event("message", async ({ event, say }) => {
    // DM만 처리 (채널 타입 'im')
    if (event.channel_type !== "im")
        return;
    if ("subtype" in event && event.subtype)
        return; // bot 메시지 등 무시
    const text = "text" in event ? event.text || "" : "";
    const { command, args } = parseCommand(text);
    const loadingMsg = await say("🔍 분석 중...");
    try {
        const response = await handleCommand(command, args);
        if (loadingMsg?.ts) {
            await app.client.chat.update({
                channel: event.channel,
                ts: loadingMsg.ts,
                text: response,
            });
        }
        else {
            await say(response);
        }
    }
    catch (error) {
        const errText = `❌ 오류가 발생했습니다: ${error instanceof Error ? error.message : "알 수 없는 오류"}`;
        if (loadingMsg?.ts) {
            await app.client.chat.update({
                channel: event.channel,
                ts: loadingMsg.ts,
                text: errText,
            });
        }
        else {
            await say(errText);
        }
    }
});
async function handleCommand(command, args) {
    switch (command) {
        case "explain_file": {
            const filePath = args.trim();
            if (!filePath) {
                return "📌 사용법: `파일 설명 frontend/src/app/page.tsx`";
            }
            const content = reader.readFile(filePath);
            if (!content) {
                return `❌ 파일을 찾을 수 없습니다: \`${filePath}\``;
            }
            return await explainer.explainCode(`이 파일(${filePath})의 코드를 설명해줘`, content);
        }
        case "search": {
            const query = args.trim();
            if (!query) {
                return "📌 사용법: `검색 fetchCharacterStats`";
            }
            const results = reader.grepCode(query);
            if (results.length === 0) {
                return `🔍 \`${query}\`에 대한 검색 결과가 없습니다.`;
            }
            const formatted = results
                .slice(0, 15)
                .map((r) => `\`${r.file}:${r.line}\` → ${r.content}`)
                .join("\n");
            const codeContext = results
                .slice(0, 5)
                .map((r) => `// ${r.file}:${r.line}\n${r.content}`)
                .join("\n\n");
            const explanation = await explainer.explainCode(`"${query}" 검색 결과를 분석하고 이 코드가 어떤 역할인지 설명해줘`, codeContext);
            return `*🔍 "${query}" 검색 결과 (${results.length}건)*\n\n${formatted}\n\n---\n${explanation}`;
        }
        case "structure": {
            const subDir = args.trim() || undefined;
            const structure = reader.getProjectStructure(subDir
                ? path.resolve(codebasePath, subDir)
                : undefined);
            if (!structure) {
                return subDir
                    ? `❌ 디렉토리를 찾을 수 없습니다: \`${subDir}\``
                    : "❌ 프로젝트 구조를 읽을 수 없습니다.";
            }
            return `*📁 프로젝트 구조${subDir ? ` (${subDir})` : ""}*\n\`\`\`\n${structure}\n\`\`\``;
        }
        case "list_files": {
            const pattern = args.trim() || "**/*.ts";
            const files = await reader.searchFiles(pattern);
            if (files.length === 0) {
                return `🔍 \`${pattern}\` 패턴에 일치하는 파일이 없습니다.`;
            }
            const fileList = files.map((f) => `• \`${f}\``).join("\n");
            return `*📄 파일 목록 (${pattern}) - ${files.length}건*\n${fileList}`;
        }
        case "ask":
        default: {
            const question = args.trim();
            if (!question) {
                return helpMessage();
            }
            // 질문에서 파일 경로 추출 시도
            const fileMatch = question.match(/(?:[\w-]+\/)+[\w.-]+\.(?:ts|tsx|js|jsx|css|json|md)/);
            if (fileMatch) {
                const content = reader.readFile(fileMatch[0]);
                if (content) {
                    return await explainer.explainCode(question, content);
                }
            }
            // 키워드 검색 시도
            const keywords = question
                .replace(/[은는이가를을에서도의]/g, " ")
                .split(/\s+/)
                .filter((w) => w.length > 2);
            let codeContext = "";
            for (const kw of keywords.slice(0, 3)) {
                const results = reader.grepCode(kw);
                if (results.length > 0) {
                    codeContext +=
                        results
                            .slice(0, 3)
                            .map((r) => `// ${r.file}:${r.line}\n${r.content}`)
                            .join("\n") + "\n\n";
                }
            }
            if (codeContext) {
                return await explainer.explainCode(question, codeContext);
            }
            return await explainer.answerQuestion(question);
        }
    }
}
function helpMessage() {
    return `*🤖 종윤봇 사용법*

• *파일 설명* \`경로\` — 특정 파일의 코드를 설명
  예: \`파일 설명 frontend/src/app/page.tsx\`

• *검색* \`키워드\` — 코드에서 키워드 검색 + 설명
  예: \`검색 fetchCharacterStats\`

• *구조* [\`디렉토리\`] — 프로젝트/디렉토리 구조 보기
  예: \`구조 frontend/src/components\`

• *파일 목록* [\`패턴\`] — 파일 목록 검색
  예: \`파일 목록 **/*.tsx\`

• *자유 질문* — 프로젝트에 대해 아무거나 질문
  예: \`티어 랭킹 어떻게 계산해?\``;
}
(async () => {
    console.log("📋 코드베이스 인덱스 생성 중...");
    const index = await reader.buildIndex();
    explainer.setCodebaseIndex(index);
    await app.start();
    console.log("⚡️ GGBot이 실행되었습니다!");
})();
//# sourceMappingURL=app.js.map