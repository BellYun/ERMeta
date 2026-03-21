export declare class CodeExplainer {
    private client;
    private systemPrompt;
    constructor(apiKey: string);
    setCodebaseIndex(index: string): void;
    explainCode(question: string, codeContext: string): Promise<string>;
    answerQuestion(question: string): Promise<string>;
}
//# sourceMappingURL=claude.d.ts.map