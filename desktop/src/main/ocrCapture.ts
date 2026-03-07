import screenshot from "screenshot-desktop";
import type { Worker as TesseractWorker } from "tesseract.js";
import { OcrSnapshot } from "../shared/types";

let _worker: TesseractWorker | null = null;

async function getWorker(): Promise<TesseractWorker> {
  if (!_worker) {
    const { createWorker } = await import("tesseract.js");
    _worker = await createWorker("kor+eng");
  }
  return _worker;
}

export async function terminateOcrWorker(): Promise<void> {
  if (_worker) {
    await _worker.terminate();
    _worker = null;
  }
}

// 1600x900 기준 — 하단 닉네임 3개 영역 (실측)
// y: 776~790, 패딩 추가해 770~800
const CROP_NICKNAME_REGIONS = [
  { left: 888,  top: 770, width: 124, height: 30 }, // 1번 플레이어
  { left: 1125, top: 770, width: 124, height: 30 }, // 2번 플레이어
  { left: 1362, top: 770, width: 124, height: 30 }, // 3번 플레이어
];

// 닉네임으로 판단할 최소/최대 글자 길이
const MIN_LEN = 2;
const MAX_LEN = 20;

// 허용 문자: 영숫자, 한글, 특수문자 일부
const NICKNAME_RE = /^[a-zA-Z0-9가-힣ㄱ-ㅎㅏ-ㅣ_\-.#]+$/;

function extractNicknames(text: string): string[] {
  return text
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.length >= MIN_LEN && l.length <= MAX_LEN)
    .filter((l) => NICKNAME_RE.test(l))
    .slice(0, 45); // 최대 45명
}

export async function captureNicknames(): Promise<OcrSnapshot> {
  const worker = await getWorker();
  const buf: Buffer = await screenshot({ format: "png" });

  // 동일 워커로 순차 처리 — 병렬 WASM 스폰 없음
  const texts: string[] = [];
  for (const rect of CROP_NICKNAME_REGIONS) {
    const { data } = await worker.recognize(buf, { rectangle: rect } as Parameters<typeof worker.recognize>[1]);
    texts.push(data.text);
  }

  const rawText = texts.join("\n");
  const nicknames = extractNicknames(rawText);

  return {
    nicknames,
    rawText,
    capturedAt: Date.now(),
  };
}
