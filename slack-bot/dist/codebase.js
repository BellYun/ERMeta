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
exports.CodebaseReader = void 0;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const glob_1 = require("glob");
class CodebaseReader {
    basePath;
    ignorePatterns = [
        "node_modules",
        "dist",
        ".next",
        ".git",
        "*.lock",
        "package-lock.json",
    ];
    constructor(basePath) {
        this.basePath = path.resolve(basePath);
    }
    readFile(filePath) {
        const fullPath = path.resolve(this.basePath, filePath);
        if (!fullPath.startsWith(this.basePath)) {
            return null; // path traversal 방지
        }
        try {
            return fs.readFileSync(fullPath, "utf-8");
        }
        catch {
            return null;
        }
    }
    async searchFiles(pattern) {
        if (pattern.includes("..")) {
            return []; // path traversal 방지
        }
        const results = await (0, glob_1.glob)(pattern, {
            cwd: this.basePath,
            ignore: this.ignorePatterns,
            nodir: true,
        });
        return results.slice(0, 50); // 최대 50개
    }
    getProjectStructure(dir, depth = 0, maxDepth = 3) {
        const targetDir = dir || this.basePath;
        const resolved = path.resolve(targetDir);
        if (!resolved.startsWith(this.basePath)) {
            return ""; // path traversal 방지
        }
        if (depth >= maxDepth)
            return "";
        const lines = [];
        let entries;
        try {
            entries = fs.readdirSync(targetDir, { withFileTypes: true });
        }
        catch {
            return "";
        }
        const filtered = entries.filter((e) => !this.ignorePatterns.some((p) => {
            if (p.startsWith("*"))
                return e.name.endsWith(p.slice(1));
            return e.name === p;
        }));
        const sorted = filtered.sort((a, b) => {
            if (a.isDirectory() && !b.isDirectory())
                return -1;
            if (!a.isDirectory() && b.isDirectory())
                return 1;
            return a.name.localeCompare(b.name);
        });
        for (const entry of sorted) {
            const indent = "  ".repeat(depth);
            const icon = entry.isDirectory() ? "📁" : "📄";
            lines.push(`${indent}${icon} ${entry.name}`);
            if (entry.isDirectory()) {
                const sub = this.getProjectStructure(path.join(targetDir, entry.name), depth + 1, maxDepth);
                if (sub)
                    lines.push(sub);
            }
        }
        return lines.join("\n");
    }
    grepCode(query, filePattern = "**/*.{ts,tsx,js,jsx}") {
        const results = [];
        const targetDir = this.basePath;
        const searchDir = (dir) => {
            let entries;
            try {
                entries = fs.readdirSync(dir, { withFileTypes: true });
            }
            catch {
                return;
            }
            for (const entry of entries) {
                const fullPath = path.join(dir, entry.name);
                if (this.ignorePatterns.some((p) => {
                    if (p.startsWith("*"))
                        return entry.name.endsWith(p.slice(1));
                    return entry.name === p;
                }))
                    continue;
                if (entry.isDirectory()) {
                    searchDir(fullPath);
                }
                else if (this.matchesPattern(entry.name, filePattern)) {
                    try {
                        const content = fs.readFileSync(fullPath, "utf-8");
                        const lines = content.split("\n");
                        const lowerQuery = query.toLowerCase();
                        for (let i = 0; i < lines.length; i++) {
                            if (lines[i].toLowerCase().includes(lowerQuery)) {
                                results.push({
                                    file: path.relative(this.basePath, fullPath),
                                    line: i + 1,
                                    content: lines[i].trim(),
                                });
                                if (results.length >= 30)
                                    return;
                            }
                        }
                    }
                    catch {
                        // skip unreadable files
                    }
                }
                if (results.length >= 30)
                    return;
            }
        };
        searchDir(targetDir);
        return results;
    }
    async buildIndex() {
        const files = await (0, glob_1.glob)("**/*.{ts,tsx,js,jsx}", {
            cwd: this.basePath,
            ignore: [...this.ignorePatterns, "**/*.d.ts", "**/*.test.*", "**/*.spec.*"],
            nodir: true,
        });
        const sections = [`프로젝트 루트: ${this.basePath}`, ""];
        for (const file of files.sort()) {
            try {
                const fullPath = path.join(this.basePath, file);
                const content = fs.readFileSync(fullPath, "utf-8");
                const lines = content.split("\n");
                // 파일 요약: export, class, function, interface 추출
                const signatures = [];
                for (let i = 0; i < lines.length; i++) {
                    const line = lines[i];
                    if (/^export\s+(default\s+)?(function|class|interface|type|const|enum|async)/.test(line) ||
                        /^(function|class|interface|type)\s+/.test(line) ||
                        /^\s*app\.(get|post|put|delete|event)\(/.test(line) ||
                        /^\s*@(Controller|Injectable|Module|Get|Post|Cron)/.test(line)) {
                        signatures.push(`  L${i + 1}: ${line.trim().slice(0, 120)}`);
                    }
                }
                if (signatures.length > 0) {
                    sections.push(`📄 ${file} (${lines.length}줄)`);
                    sections.push(...signatures);
                    sections.push("");
                }
                else {
                    sections.push(`📄 ${file} (${lines.length}줄)`);
                }
            }
            catch {
                // skip
            }
        }
        return sections.join("\n");
    }
    matchesPattern(filename, pattern) {
        const extMatch = pattern.match(/\*\.\{(.+)\}/);
        if (extMatch) {
            const exts = extMatch[1].split(",");
            return exts.some((ext) => filename.endsWith(`.${ext}`));
        }
        return true;
    }
}
exports.CodebaseReader = CodebaseReader;
//# sourceMappingURL=codebase.js.map