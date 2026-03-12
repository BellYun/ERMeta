#!/usr/bin/env node
// BSER API l10n에서 아이템 이름을 받아 const/itemNameMap.json 으로 저장
// 사용: node --env-file=.env scripts/fetch-item-names.mjs

import { writeFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUTPUT_PATH = join(__dirname, "../const/itemNameMap.json");
const SEPARATOR = "\u2503"; // ┃

const apiKey = process.env.BSER_API_KEY;
if (!apiKey) {
  console.error("BSER_API_KEY 환경변수가 없습니다. .env 파일을 확인하세요.");
  process.exit(1);
}

console.log("[fetch-item-names] l10n 메타데이터 조회 중...");

// 1단계: l10n 파일 URL 조회
const metaRes = await fetch("https://open-api.bser.io/v1/l10n/Korean", {
  headers: { "x-api-key": apiKey },
});
if (!metaRes.ok) {
  console.error(`[fetch-item-names] BSER API 오류: ${metaRes.status}`);
  process.exit(1);
}
const metaJson = await metaRes.json();
const l10Path = metaJson?.data?.l10Path;
if (!l10Path) {
  console.error("[fetch-item-names] l10Path를 찾을 수 없습니다.");
  process.exit(1);
}

console.log(`[fetch-item-names] l10n 파일 다운로드 중...`);

// 2단계: l10n 텍스트 다운로드 및 파싱
const l10nRes = await fetch(l10Path);
if (!l10nRes.ok) {
  console.error(`[fetch-item-names] l10n 다운로드 오류: ${l10nRes.status}`);
  process.exit(1);
}
const text = await l10nRes.text();

// 3단계: Item/Name/{code} 키만 추출
const names = {};
for (const line of text.split(/\r?\n/)) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("#")) continue;
  const sepIdx = trimmed.indexOf(SEPARATOR);
  if (sepIdx === -1) continue;
  const key = trimmed.slice(0, sepIdx);
  if (!key.startsWith("Item/Name/")) continue;
  const code = Number(key.slice("Item/Name/".length));
  if (!isNaN(code) && code > 0) {
    names[String(code)] = trimmed.slice(sepIdx + 1);
  }
}

// 코드 순으로 정렬하여 저장
const sorted = Object.fromEntries(
  Object.entries(names).sort(([a], [b]) => Number(a) - Number(b))
);

writeFileSync(OUTPUT_PATH, JSON.stringify(sorted, null, 2), "utf-8");
console.log(`[fetch-item-names] 저장 완료: ${OUTPUT_PATH} (${Object.keys(sorted).length}개 아이템)`);
