export declare class CodebaseReader {
    private basePath;
    private ignorePatterns;
    constructor(basePath: string);
    readFile(filePath: string): string | null;
    searchFiles(pattern: string): Promise<string[]>;
    getProjectStructure(dir?: string, depth?: number, maxDepth?: number): string;
    grepCode(query: string, filePattern?: string): {
        file: string;
        line: number;
        content: string;
    }[];
    buildIndex(): Promise<string>;
    private matchesPattern;
}
//# sourceMappingURL=codebase.d.ts.map