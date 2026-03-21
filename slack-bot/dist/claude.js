"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CodeExplainer = void 0;
const sdk_1 = __importDefault(require("@anthropic-ai/sdk"));
const BASE_SYSTEM_PROMPT = `당신은 "GGBot"입니다. ERMeta(이리와지지/ER&GG) 프로젝트의 코드를 설명해주는 전문 봇입니다.

프로젝트 개요:
- 이터널리턴(Eternal Return) 게임 통계 분석 서비스
- Frontend: Next.js (App Router) + Tailwind CSS v4
- Backend: NestJS
- DB: Supabase (PostgreSQL)
- 주요 기능: 캐릭터 티어 랭킹, 시너지/조합 추천, 트렌드 분석

응답 규칙:
1. 한국어로 답변
2. 코드를 설명할 때는 핵심 로직을 쉽게 풀어서 설명
3. 파일 경로와 라인 번호를 함께 제공
4. Slack mrkdwn 형식 사용 (*bold*, \`code\`, \`\`\`코드블록\`\`\`)
5. 너무 길지 않게, 핵심만 간결하게 설명
6. 아래 코드베이스 인덱스를 참고하여 질문에 관련된 파일을 정확히 안내`;
const MAX_CODE_LENGTH = 8000;
class CodeExplainer {
    client;
    systemPrompt;
    constructor(apiKey) {
        this.client = new sdk_1.default({ apiKey });
        this.systemPrompt = BASE_SYSTEM_PROMPT;
    }
    setCodebaseIndex(index) {
        const truncated = index.length > 30000
            ? index.slice(0, 30000) + "\n\n... (인덱스 잘림)"
            : index;
        this.systemPrompt = `${BASE_SYSTEM_PROMPT}\n\n## 코드베이스 인덱스\n${truncated}`;
        console.log(`📋 코드베이스 인덱스 로드 완료 (${index.length}자)`);
    }
    async explainCode(question, codeContext) {
        const truncatedCode = codeContext.length > MAX_CODE_LENGTH
            ? codeContext.slice(0, MAX_CODE_LENGTH) + "\n\n... (코드가 길어서 잘림)"
            : codeContext;
        const message = await this.client.messages.create({
            model: "claude-sonnet-4-20250514",
            max_tokens: 2048,
            system: this.systemPrompt,
            messages: [
                {
                    role: "user",
                    content: `${question}\n\n관련 코드:\n\`\`\`\n${truncatedCode}\n\`\`\``,
                },
            ],
        });
        const textBlock = message.content.find((block) => block.type === "text");
        return textBlock ? textBlock.text : "응답을 생성하지 못했습니다.";
    }
    async answerQuestion(question) {
        const message = await this.client.messages.create({
            model: "claude-sonnet-4-20250514",
            max_tokens: 2048,
            system: this.systemPrompt,
            messages: [{ role: "user", content: question }],
        });
        const textBlock = message.content.find((block) => block.type === "text");
        return textBlock ? textBlock.text : "응답을 생성하지 못했습니다.";
    }
}
exports.CodeExplainer = CodeExplainer;
//# sourceMappingURL=claude.js.map