#!/usr/bin/env node
// BSER API에서 아이템 등급(itemGrade) 데이터를 받아 const/itemGradeMap.json 으로 저장
// 사용: node --env-file=.env scripts/fetch-item-grades.mjs

import { writeFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUTPUT_PATH = join(__dirname, "../const/itemGradeMap.json");

const apiKey = process.env.BSER_API_KEY;
if (!apiKey) {
  console.error("BSER_API_KEY 환경변수가 없습니다. .env 파일을 확인하세요.");
  process.exit(1);
}

const META_TYPES = ["ItemWeapon", "ItemArmor"];
const gradeMap = {};

for (const metaType of META_TYPES) {
  console.log(`[fetch-item-grades] ${metaType} 처리 중...`);

  const res = await fetch(`https://open-api.bser.io/v2/data/${metaType}`, {
    headers: { "x-api-key": apiKey },
  });

  if (!res.ok) {
    console.error(`[fetch-item-grades] BSER API 오류 (${metaType}): ${res.status}`);
    process.exit(1);
  }

  const json = await res.json();
  const items = json?.data ?? [];

  for (const item of items) {
    if (item.code && item.itemGrade) {
      gradeMap[String(item.code)] = item.itemGrade;
    }
  }

  console.log(`[fetch-item-grades] ${metaType}: ${items.length}개 아이템 처리`);
}

// 코드 순으로 정렬하여 저장
const sorted = Object.fromEntries(
  Object.entries(gradeMap).sort(([a], [b]) => Number(a) - Number(b))
);

writeFileSync(OUTPUT_PATH, JSON.stringify(sorted, null, 2), "utf-8");
console.log(`[fetch-item-grades] 저장 완료: ${OUTPUT_PATH} (${Object.keys(sorted).length}개 아이템)`);
