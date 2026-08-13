#!/usr/bin/env node
/* eslint-disable no-console */

import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUTPUT_PATH = join(__dirname, "../const/itemEffectMap.json");
const ITEMS_ENDPOINT = "https://er.dakgg.io/api/v1/data/items";
const LANGUAGES = {
  Korean: "ko",
  English: "en",
  Japanese: "ja",
};

function cleanEffectMarkup(value) {
  return value
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function extractItemEffect(tooltip) {
  if (typeof tooltip !== "string") return null;

  const effectBlocks = tooltip
    .split(/\n{2,}/)
    .filter((block) => /<b><color=yellow>/i.test(block))
    .map(cleanEffectMarkup)
    .filter(Boolean);

  return effectBlocks.length > 0 ? effectBlocks.join("\n\n") : null;
}

const effectsByLanguage = {};

for (const [language, languageHeader] of Object.entries(LANGUAGES)) {
  const response = await fetch(`${ITEMS_ENDPOINT}?hl=${languageHeader}`, {
    headers: {
      "Accept-Language": languageHeader,
      "Dakgg-Language": languageHeader,
    },
  });

  if (!response.ok) {
    console.error(`[fetch-item-effects] 아이템 API 오류 (${language}): ${response.status}`);
    process.exit(1);
  }

  const items = (await response.json())?.items ?? [];
  const effects = {};

  for (const item of items) {
    if (!item.id) continue;
    const effect = extractItemEffect(item.tooltip);
    if (effect) effects[String(item.id)] = effect;
  }

  effectsByLanguage[language] = Object.fromEntries(
    Object.entries(effects).sort(([left], [right]) => Number(left) - Number(right))
  );
  console.log(`[fetch-item-effects] ${language}: ${Object.keys(effects).length}개 효과`);
}

writeFileSync(OUTPUT_PATH, `${JSON.stringify(effectsByLanguage, null, 2)}\n`, "utf8");
console.log(`[fetch-item-effects] 저장 완료: ${OUTPUT_PATH}`);
