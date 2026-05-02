#!/usr/bin/env node
/**
 * messages/ko.json을 source-of-truth로 두고, 누락된 키만
 * Anthropic Claude Haiku로 번역해 다른 언어 messages를 채운다.
 *
 * 사용:
 *   ANTHROPIC_API_KEY=... node scripts/translate-messages.mjs           # 누락 키만 보충
 *   ANTHROPIC_API_KEY=... node scripts/translate-messages.mjs --force   # 전체 재번역
 *   ANTHROPIC_API_KEY=... node scripts/translate-messages.mjs --only en # 단일 locale만
 *
 * source: messages/ko.json
 * targets: messages/{en,ja,zh-Hans,zh-Hant,es,fr,de,id,it,pl,pt,ru,vi,th}.json
 */

import { readFileSync, writeFileSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const MESSAGES_DIR = join(__dirname, "../messages");
const SOURCE_LOCALE = "ko";

// src/i18n/routing.ts 의 ROUTE_LOCALES 와 일치 유지.
// 라우트가 없는 locale 은 messages 파일이 dead asset 이 되므로 번역하지 않는다.
const TARGETS = [
  { locale: "en", lang: "English" },
  { locale: "ja", lang: "Japanese (日本語)" },
  { locale: "zh-Hans", lang: "Simplified Chinese (简体中文)" },
  { locale: "zh-Hant", lang: "Traditional Chinese (繁體中文)" },
];

// Eternal Return 게임 도메인 glossary — 일관된 용어 보장.
const GLOSSARY = `
Domain glossary (use these consistent translations):
- 픽률 → Pick Rate / 採用率 / 选取率 / 選取率 / Tasa de selección / Taux de sélection / Auswahlrate / Частота выбора / Tỷ lệ chọn / อัตราการเลือก
- 평균 RP → Average RP (keep "RP" as-is in all languages)
- 승률 → Win Rate / 勝率 / 胜率 / 勝率 / Tasa de victoria / Taux de victoire / Siegrate / Винрейт / Tỷ lệ thắng / อัตราการชนะ
- 패치 → Patch (keep as-is or transliterate)
- 시즌 → Season / シーズン / 赛季 / 賽季 / Temporada / Saison / Saison / Сезон / Mùa / ซีซั่น
- 캐릭터 → Character / キャラクター / 角色 / 角色 / Personaje / Personnage / Charakter / Персонаж / Nhân vật / ตัวละคร
- 무기 → Weapon / 武器 / 武器 / 武器 / Arma / Arme / Waffe / Оружие / Vũ khí / อาวุธ
- 특성 → Trait (game-specific term)
- 아이템 → Item
- 빌드 → Build
- 직업군 → Role / 職業 / 职业 / 職業 / Clase / Classe / Klasse / Класс / Vai trò / บทบาท
- 조합 → Synergy / 編成 / 阵容 / 陣容 / Sinergia / Synergie / Synergie / Синергия / Đội hình / การผสาน
- 미스릴+ → Mithril+ (keep "+")
- 다이아몬드 → Diamond
- 메테오라이트 → Meteorite
- 상위 1000위 → Top 1000

Brand/proper nouns (keep as-is, never translate):
- ER&GG, BSER, Eternal Return, 이리와지지

Version strings (keep as-is):
- v10.6, 10.x, etc.
`.trim();

function flatten(obj, prefix = "", out = {}) {
  for (const [key, value] of Object.entries(obj)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (value !== null && typeof value === "object" && !Array.isArray(value)) {
      flatten(value, path, out);
    } else {
      out[path] = value;
    }
  }
  return out;
}

function unflatten(flat) {
  const result = {};
  for (const [path, value] of Object.entries(flat)) {
    const keys = path.split(".");
    let cur = result;
    for (let i = 0; i < keys.length - 1; i++) {
      if (typeof cur[keys[i]] !== "object" || cur[keys[i]] === null) cur[keys[i]] = {};
      cur = cur[keys[i]];
    }
    cur[keys[keys.length - 1]] = value;
  }
  return result;
}

function loadJSON(path) {
  if (!existsSync(path)) return {};
  return JSON.parse(readFileSync(path, "utf-8"));
}

function saveJSON(path, data) {
  writeFileSync(path, JSON.stringify(data, null, 2) + "\n", "utf-8");
}

async function translateBatch({ language, koEntries, apiKey }) {
  // koEntries: Record<flatPath, koValue>
  const inputJson = JSON.stringify(koEntries, null, 2);

  const prompt = `You are a professional game UI translator for Eternal Return (Black Survival), a battle royale game.

Translate the following Korean UI strings to ${language}.

${GLOSSARY}

Rules:
1. Output VALID JSON only — same flat key structure as input.
2. Translate VALUES only, keep KEYS unchanged.
3. Keep brand names (ER&GG, BSER, Eternal Return) and version strings (v10.6) verbatim.
4. Match the tone: concise game-stat website, not formal documentation.
5. Preserve punctuation feel (Korean middle-dot 「·」 → comma or em-dash where natural).
6. NO markdown fences, NO explanation. JUST the JSON object.

Input (Korean):
${inputJson}

Output (${language} JSON):`;

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: "claude-3-5-haiku-20241022",
      max_tokens: 4096,
      messages: [{ role: "user", content: prompt }],
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Anthropic API ${res.status}: ${errText}`);
  }

  const data = await res.json();
  const text = data.content?.[0]?.text;
  if (!text) throw new Error("Empty response from Anthropic");

  // 모델이 가끔 ```json 펜스를 붙임 — 안전하게 추출.
  const cleaned = text
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```\s*$/i, "")
    .trim();

  let parsed;
  try {
    parsed = JSON.parse(cleaned);
  } catch (err) {
    throw new Error(`Invalid JSON from Anthropic: ${err.message}\n--- raw ---\n${text}`);
  }

  // 평탄화 형태로 받았다고 가정 (LLM이 가끔 nest화하기도 함 — flatten으로 정규화).
  return flatten(parsed);
}

function diffMissingKeys(source, target) {
  const missing = {};
  for (const [path, value] of Object.entries(source)) {
    if (!(path in target)) missing[path] = value;
  }
  return missing;
}

async function main() {
  const args = process.argv.slice(2);
  const force = args.includes("--force");
  const onlyIdx = args.indexOf("--only");
  const onlyLocale = onlyIdx >= 0 ? args[onlyIdx + 1] : null;

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.error("ANTHROPIC_API_KEY 환경변수가 필요합니다.");
    console.error("  export ANTHROPIC_API_KEY=sk-ant-...");
    console.error("  또는 frontend/.env.local 에 ANTHROPIC_API_KEY=... 추가 후");
    console.error("  node --env-file=.env.local scripts/translate-messages.mjs");
    process.exit(1);
  }

  const sourcePath = join(MESSAGES_DIR, `${SOURCE_LOCALE}.json`);
  if (!existsSync(sourcePath)) {
    console.error(`source 파일 없음: ${sourcePath}`);
    process.exit(1);
  }
  const sourceFlat = flatten(loadJSON(sourcePath));
  const sourceCount = Object.keys(sourceFlat).length;
  console.log(`[translate] source: ${sourcePath} (${sourceCount} keys)`);

  const targets = onlyLocale ? TARGETS.filter((t) => t.locale === onlyLocale) : TARGETS;
  if (targets.length === 0) {
    console.error(`알 수 없는 locale: ${onlyLocale}`);
    process.exit(1);
  }

  for (const { locale, lang } of targets) {
    const targetPath = join(MESSAGES_DIR, `${locale}.json`);
    const existingFlat = flatten(loadJSON(targetPath));

    const toTranslate = force ? sourceFlat : diffMissingKeys(sourceFlat, existingFlat);
    const count = Object.keys(toTranslate).length;

    if (count === 0) {
      console.log(`[${locale}] 이미 최신 — 스킵`);
      continue;
    }

    console.log(`[${locale}] ${lang} 번역 중... (${count}개 키)`);
    try {
      const translated = await translateBatch({ language: lang, koEntries: toTranslate, apiKey });
      const merged = { ...existingFlat, ...translated };
      // source에 없는 stale 키 청소
      for (const path of Object.keys(merged)) {
        if (!(path in sourceFlat)) delete merged[path];
      }
      saveJSON(targetPath, unflatten(merged));
      console.log(`[${locale}] 저장: ${targetPath} (총 ${Object.keys(merged).length}개 키)`);
    } catch (err) {
      console.error(`[${locale}] 실패:`, err.message);
    }

    // rate-limit 방지 약간 대기
    await new Promise((r) => setTimeout(r, 500));
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
