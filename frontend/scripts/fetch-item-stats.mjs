#!/usr/bin/env node
/* eslint-disable no-console */

import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUTPUT_PATH = join(__dirname, "../const/itemStatMap.json");
const META_TYPES = ["ItemWeapon", "ItemArmor"];
const STAT_FIELDS = [
  "adaptiveForce",
  "attackPower",
  "attackPowerByLv",
  "attackSpeedRatio",
  "cooldownReduction",
  "criticalStrikeChance",
  "criticalStrikeDamage",
  "defense",
  "healerGiveHpHealRatio",
  "hpRegenRatio",
  "increaseBasicAttackDamageRatioByLv",
  "lifeSteal",
  "maxHp",
  "maxHpByLv",
  "moveSpeed",
  "moveSpeedRatio",
  "normalLifeSteal",
  "penetrationDefense",
  "penetrationDefenseRatio",
  "sightRange",
  "skillAmp",
  "skillAmpByLevel",
  "skillAmpRatio",
  "tacticalCooldownReduction",
  "ultCooldownReduction",
  "uniqueAttackRange",
  "uniqueSkillAmpRatio",
  "uniqueTenacity",
];

const apiKey = process.env.BSER_API_KEY;
if (!apiKey) {
  console.error("BSER_API_KEY 환경변수가 없습니다. .env 파일을 확인하세요.");
  process.exit(1);
}

const itemStats = {};

for (const metaType of META_TYPES) {
  const response = await fetch(`https://open-api.bser.io/v2/data/${metaType}`, {
    headers: { "x-api-key": apiKey },
  });

  if (!response.ok) {
    console.error(`[fetch-item-stats] BSER API 오류 (${metaType}): ${response.status}`);
    process.exit(1);
  }

  const items = (await response.json())?.data ?? [];
  for (const item of items) {
    if (!item.code) continue;

    const stats = {};
    for (const field of STAT_FIELDS) {
      if (typeof item[field] === "number" && item[field] !== 0) {
        stats[field] = item[field];
      }
    }

    if (Object.keys(stats).length > 0) itemStats[String(item.code)] = stats;
  }
}

const sorted = Object.fromEntries(
  Object.entries(itemStats).sort(([left], [right]) => Number(left) - Number(right))
);

writeFileSync(OUTPUT_PATH, `${JSON.stringify(sorted, null, 2)}\n`, "utf8");
console.log(`[fetch-item-stats] 저장 완료: ${OUTPUT_PATH} (${Object.keys(sorted).length}개 아이템)`);
