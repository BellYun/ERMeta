#!/usr/bin/env node
// BSER API에서 l10n 데이터를 받아 public/l10n/ 에 정적 파일로 저장
// 사용: node --env-file=.env.local scripts/fetch-l10n.mjs

import { writeFileSync, mkdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUTPUT_DIR = join(__dirname, "../public/l10n");
const SEPARATOR = "\u2503"; // ┃

const LANGUAGES = ["Korean"];

const apiKey = process.env.BSER_API_KEY;
if (!apiKey) {
  console.error("BSER_API_KEY 환경변수가 없습니다. .env.local 파일을 확인하세요.");
  process.exit(1);
}

mkdirSync(OUTPUT_DIR, { recursive: true });

for (const language of LANGUAGES) {
  console.log(`[fetch-l10n] ${language} 처리 중...`);

  // 1단계: l10Path URL 가져오기
  const metaRes = await fetch(`https://open-api.bser.io/v1/l10n/${language}`, {
    headers: { "x-api-key": apiKey },
  });
  if (!metaRes.ok) {
    console.error(`[fetch-l10n] BSER API 오류: ${metaRes.status}`);
    process.exit(1);
  }
  const metaJson = await metaRes.json();
  const l10Path = metaJson?.data?.l10Path;
  if (!l10Path) {
    console.error("[fetch-l10n] l10Path를 찾을 수 없습니다.");
    process.exit(1);
  }
  console.log(`[fetch-l10n] l10Path: ${l10Path}`);

  // 2단계: 실제 파일 다운로드
  const fileRes = await fetch(l10Path);
  if (!fileRes.ok) {
    console.error(`[fetch-l10n] 파일 다운로드 오류: ${fileRes.status}`);
    process.exit(1);
  }
  const text = await fileRes.text();

  // 3단계: 파싱
  const parsed = {};
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const sepIdx = trimmed.indexOf(SEPARATOR);
    if (sepIdx === -1) continue;
    parsed[trimmed.slice(0, sepIdx)] = trimmed.slice(sepIdx + 1);
  }

  // 4단계: 저장
  const outputPath = join(OUTPUT_DIR, `${language}.json`);
  writeFileSync(outputPath, JSON.stringify(parsed), "utf-8");
  console.log(`[fetch-l10n] 저장 완료: ${outputPath} (${Object.keys(parsed).length}개 키)`);
}
