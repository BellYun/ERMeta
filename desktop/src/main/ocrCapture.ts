import screenshot from "screenshot-desktop";
import { OcrSnapshot } from "../shared/types";

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
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const Tesseract = await import("tesseract.js");

  const buf: Buffer = await screenshot({ format: "png" });

  // 3개 닉네임 영역 병렬 OCR
  const results = await Promise.all(
    CROP_NICKNAME_REGIONS.map((rect) =>
      Tesseract.recognize(buf, "kor+eng", {
        rectangle: rect,
      } as Parameters<typeof Tesseract.recognize>[2])
    )
  );

  const rawText = results.map((r) => r.data.text).join("\n");
  const nicknames = extractNicknames(rawText);

  return {
    nicknames,
    rawText,
    capturedAt: Date.now(),
  };
}
