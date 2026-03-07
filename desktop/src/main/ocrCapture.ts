import { execFile } from "child_process";
import screenshot from "screenshot-desktop";
import type { Worker as TesseractWorker } from "tesseract.js";
import { OcrSnapshot } from "../shared/types";

interface WindowRect {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

// PowerShell로 이터널 리턴 창 위치 탐지 (Windows 전용)
function findGameWindow(): Promise<WindowRect | null> {
  const ps = `
Add-Type -Name WinAPI -Namespace "" -MemberDefinition '
  [DllImport("user32.dll")] public static extern bool GetWindowRect(IntPtr h, out RECT r);
  [StructLayout(LayoutKind.Sequential)] public struct RECT { public int Left; public int Top; public int Right; public int Bottom; }
' -ErrorAction SilentlyContinue
$proc = Get-Process | Where-Object { $_.MainWindowTitle -like "*Eternal Return*" } | Select-Object -First 1
if ($proc) {
  $r = New-Object WinAPI+RECT
  [WinAPI]::GetWindowRect($proc.MainWindowHandle, [ref]$r) | Out-Null
  Write-Output "$($r.Left),$($r.Top),$($r.Right),$($r.Bottom)"
}
`.trim();

  return new Promise((resolve) => {
    execFile("powershell", ["-NoProfile", "-Command", ps], { timeout: 3000 }, (err, stdout) => {
      if (err || !stdout.trim()) return resolve(null);
      const [left, top, right, bottom] = stdout.trim().split(",").map(Number);
      if ([left, top, right, bottom].some(isNaN)) return resolve(null);
      resolve({ left, top, right, bottom });
    });
  });
}

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

  // 게임 창 위치 탐지 → 좌표 보정
  const gameWin = await findGameWindow();
  const offsetX = gameWin?.left ?? 0;
  const offsetY = gameWin?.top ?? 0;
  console.log(`[OCR] game window offset: ${offsetX},${offsetY}`);

  // 동일 워커로 순차 처리 — 병렬 WASM 스폰 없음
  const texts: string[] = [];
  for (const rect of CROP_NICKNAME_REGIONS) {
    const absRect = {
      left: rect.left + offsetX,
      top: rect.top + offsetY,
      width: rect.width,
      height: rect.height,
    };
    const { data } = await worker.recognize(buf, { rectangle: absRect } as Parameters<typeof worker.recognize>[1]);
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
