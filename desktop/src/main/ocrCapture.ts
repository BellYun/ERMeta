import path from "path";
import screenshot from "screenshot-desktop";
import { app } from "electron";
import { OcrSnapshot } from "../shared/types";

// ocr/image.png 기준 crop region
// 좌측 캐릭터 그리드(전체 너비 ~40%, 헤더 제외)
// 해상도별 튜닝 필요 — 임시 고정값
const CROP_REGION = {
  left: 5,
  top: 120,
  width: 730,
  height: 860,
};

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

  const langCachePath = path.join(app.getPath("userData"), "tessdata");

  const buf: Buffer = await screenshot({ format: "png" });

  const { data } = await Tesseract.recognize(buf, "kor+eng", {
    rectangle: CROP_REGION,
    langPath: langCachePath,
    cacheMethod: "readWrite",
  } as Parameters<typeof Tesseract.recognize>[2]);

  const nicknames = extractNicknames(data.text);

  return {
    nicknames,
    rawText: data.text,
    capturedAt: Date.now(),
  };
}
