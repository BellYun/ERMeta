#!/usr/bin/env node
/* eslint-disable no-console */
// BSER API에서 무기 아이템 코드와 무기 타입 코드 매핑을 생성
// 사용: node --env-file=.env scripts/fetch-item-weapon-types.mjs

import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUTPUT_PATH = join(__dirname, "../const/weaponItemTypeMap.json");

const WEAPON_TYPE_CODES = {
  Glove: 1,
  Tonfa: 2,
  Bat: 3,
  Whip: 4,
  HighAngleFire: 5,
  DirectFire: 6,
  Bow: 7,
  CrossBow: 8,
  Pistol: 9,
  AssaultRifle: 10,
  SniperRifle: 11,
  Hammer: 13,
  Axe: 14,
  OneHandSword: 15,
  TwoHandSword: 16,
  Polearm: 17,
  DualSword: 18,
  Spear: 19,
  Nunchaku: 20,
  Rapier: 21,
  Guitar: 22,
  Camera: 23,
  Arcana: 24,
  VFArm: 25,
};

const apiKey = process.env.BSER_API_KEY;
if (!apiKey) {
  console.error("BSER_API_KEY 환경변수가 없습니다. .env 파일을 확인하세요.");
  process.exit(1);
}

const response = await fetch("https://open-api.bser.io/v2/data/ItemWeapon", {
  headers: { "x-api-key": apiKey },
});
if (!response.ok) {
  console.error(`[fetch-item-weapon-types] BSER API 오류: ${response.status}`);
  process.exit(1);
}

const items = (await response.json())?.data ?? [];
const mapping = {};
const unknownTypes = new Set();

for (const item of items) {
  const typeCode = WEAPON_TYPE_CODES[item.weaponType];
  if (!typeCode) {
    unknownTypes.add(item.weaponType);
    continue;
  }
  mapping[String(item.code)] = typeCode;
}

if (unknownTypes.size > 0) {
  console.error(`[fetch-item-weapon-types] 알 수 없는 무기 타입: ${[...unknownTypes].join(", ")}`);
  process.exit(1);
}

const sorted = Object.fromEntries(
  Object.entries(mapping).sort(([a], [b]) => Number(a) - Number(b))
);
writeFileSync(OUTPUT_PATH, `${JSON.stringify(sorted, null, 2)}\n`, "utf-8");
console.log(
  `[fetch-item-weapon-types] 저장 완료: ${OUTPUT_PATH} (${Object.keys(sorted).length}개 무기)`
);
