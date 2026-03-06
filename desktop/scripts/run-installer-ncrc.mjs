import { spawn } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";

async function walk(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await walk(fullPath)));
      continue;
    }
    files.push(fullPath);
  }

  return files;
}

function scoreInstaller(filePath) {
  const normalized = filePath.toLowerCase();
  let score = 0;

  if (normalized.endsWith(".exe")) score += 10;
  if (normalized.includes("setup")) score += 20;
  if (normalized.includes("latest")) score += 5;
  if (normalized.includes("unpacked")) score -= 100;

  return score;
}

async function findInstaller(distDir) {
  const allFiles = await walk(distDir);
  const exes = allFiles.filter((filePath) => filePath.toLowerCase().endsWith(".exe"));

  if (exes.length === 0) {
    throw new Error(`No .exe found under ${distDir}`);
  }

  const stats = await Promise.all(
    exes.map(async (filePath) => ({
      filePath,
      score: scoreInstaller(filePath),
      mtimeMs: (await fs.stat(filePath)).mtimeMs,
    }))
  );

  stats.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return b.mtimeMs - a.mtimeMs;
  });

  return stats[0].filePath;
}

async function main() {
  if (process.platform !== "win32") {
    console.error("installer:ncrc is Windows-only. Run this on Windows.");
    process.exit(1);
  }

  const distDir = path.resolve(process.cwd(), "dist");
  const installerPath = await findInstaller(distDir);

  console.log(`[installer:ncrc] Running: ${installerPath} /NCRC`);

  await new Promise((resolve, reject) => {
    const child = spawn(installerPath, ["/NCRC"], {
      stdio: "inherit",
    });

    child.once("error", reject);
    child.once("exit", (code) => {
      if (code === 0 || code === null) {
        resolve();
      } else {
        reject(new Error(`Installer exited with code ${code}`));
      }
    });
  });
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`[installer:ncrc] Failed: ${message}`);
  process.exit(1);
});
