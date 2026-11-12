import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { gzipSync } from "node:zlib";
import ts from "typescript";

const frontend = fileURLToPath(new URL("../", import.meta.url));

function loadSource(file) {
  const source = readFileSync(file, "utf8");
  const { outputText } = ts.transpileModule(source, {
    fileName: file,
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      esModuleInterop: true,
      target: ts.ScriptTarget.ES2022,
    },
  });
  const requireFromFile = createRequire(file);
  const requireSource = (name) => {
    if (name === "server-only") return {};
    if (name.startsWith("@/")) return loadSource(resolve(frontend, "src", name.slice(2) + ".ts"));
    return requireFromFile(name);
  };
  const exports = {};
  new Function("require", "exports", outputText)(requireSource, exports);
  return exports;
}

const { buildCompositionAffinitySnapshot } = loadSource(
  resolve(frontend, "src/lib/characterAffinity.ts")
);
const snapshot = buildCompositionAffinitySnapshot();
const content = gzipSync(JSON.stringify(snapshot));
const version = createHash("sha256").update(content).digest("hex").slice(0, 16);
const directory = resolve(frontend, "public/data/composition-affinity");
mkdirSync(directory, { recursive: true });
writeFileSync(resolve(directory, version + ".json.gz"), content);
const manifest = { version, bytes: content.length };
writeFileSync(
  resolve(frontend, "src/data/composition-affinity-snapshot.json"),
  JSON.stringify(manifest, null, 2) + "\n"
);
process.stdout.write(JSON.stringify(manifest) + "\n");
