#!/usr/bin/env node

import { existsSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const FRONTEND_DIR = join(__dirname, "..");
const CHARACTER_IMAGES_PATH = join(FRONTEND_DIR, "const/characterImages.ts");
const OUTPUT_PATH = join(FRONTEND_DIR, "const/characterSkillIconFiles.json");
const SKILL_SLOTS = ["T", "Q", "W", "E", "R"];

// Transforming characters need an explicit base-form icon instead of alphabetical order.
const OVERRIDES = {
  16: {
    Q: "Silvia_Human_Q.png",
    W: "Silvia_Human_W.png",
    E: "Silvia_Human_E.png",
    R: "Silvia_Human_R.png",
  },
  44: {
    T: "Echion_P0.png",
    R: "Echion_R0.png",
  },
  63: {
    Q: "LyAnh_Q.png",
    W: "LyAnh_W.png",
    E: "LyAnh_E.png",
    R: "LyAnh_R.png",
  },
};

function characterFoldersByCode() {
  const source = readFileSync(CHARACTER_IMAGES_PATH, "utf8");
  const entries = [...source.matchAll(/^\s*(\d+):\s*"(\/CharactER\/[^\"]+\/Mini\.png)",$/gm)];

  return entries.map((match) => {
    const code = Number(match[1]);
    const imagePath = decodeURIComponent(match[2]).slice(1);
    const defaultFolderIndex = imagePath.indexOf("/02.");
    const folder =
      defaultFolderIndex >= 0
        ? imagePath.slice(0, defaultFolderIndex)
        : imagePath.slice(0, imagePath.lastIndexOf("/"));
    return { code, folder };
  });
}

function matchesSlot(fileName, slot) {
  if (slot === "T") {
    return /(?:_|[ .])(?:P\d*|Passive|T)(?=[_. ]|$)/i.test(fileName);
  }
  return new RegExp(`(?:_|[ .])${slot}(?:\\d+)?(?=[_. ]|$)`, "i").test(fileName);
}

function scoreCandidate(fileName, slot) {
  const lower = fileName.toLowerCase();
  let score = fileName.length;

  if (slot === "T") {
    if (/_p\.png$/i.test(fileName)) score -= 500;
    else if (/_p1\.png$/i.test(fileName)) score -= 450;
    else if (/_passive\.png$/i.test(fileName)) score -= 400;
    else if (/_t\.png$/i.test(fileName)) score -= 350;
  } else {
    if (new RegExp(`_${slot}\\.png$`, "i").test(fileName)) score -= 500;
    else if (new RegExp(`_${slot}1\\.png$`, "i").test(fileName)) score -= 450;
    else if (new RegExp(`[ .]${slot}\\.png$`, "i").test(fileName)) score -= 400;
  }

  if (lower.includes("(old)")) score += 1_000;
  if (lower.includes("bike_") || lower.startsWith("ghost_")) score += 200;
  return score;
}

function chooseIcon(files, slot) {
  return files
    .filter((fileName) => matchesSlot(fileName, slot))
    .sort(
      (left, right) =>
        scoreCandidate(left, slot) - scoreCandidate(right, slot) || left.localeCompare(right)
    )[0];
}

const iconMap = {};

for (const { code, folder } of characterFoldersByCode()) {
  const skillIconDir = join(FRONTEND_DIR, "public", folder, "03. skill Icon");
  if (!existsSync(skillIconDir)) {
    throw new Error(`Skill icon folder is missing for character ${code}: ${skillIconDir}`);
  }

  const files = readdirSync(skillIconDir).filter((fileName) => fileName.endsWith(".png"));
  const slots = {};

  for (const slot of SKILL_SLOTS) {
    const fileName = OVERRIDES[code]?.[slot] ?? chooseIcon(files, slot);
    if (!fileName || !files.includes(fileName)) {
      throw new Error(`Representative ${slot} icon is missing for character ${code}`);
    }
    slots[slot] = fileName;
  }

  iconMap[code] = slots;
}

writeFileSync(OUTPUT_PATH, `${JSON.stringify(iconMap, null, 2)}\n`, "utf8");
process.stdout.write(`Generated ${OUTPUT_PATH} (${Object.keys(iconMap).length} characters)\n`);
