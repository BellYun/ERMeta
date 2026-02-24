import { NextRequest, NextResponse } from "next/server";

export const revalidate = 3600; // 1시간 캐시

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ language: string }> }
) {
  const { language } = await params;
  const apiKey = process.env.BSER_API_KEY;

  if (!apiKey) {
    return NextResponse.json({ error: "BSER_API_KEY not set" }, { status: 500 });
  }

  try {
    // 1단계: BSER API에서 l10n 파일 URL 가져오기
    console.log(`[bser/l10n] BSER API 요청: language=${language}`);
    const metaRes = await fetch(
      `https://open-api.bser.io/v1/l10n/${language}`,
      { headers: { "x-api-key": apiKey } }
    );

    console.log(`[bser/l10n] BSER API 응답: status=${metaRes.status}`);
    if (!metaRes.ok) {
      return NextResponse.json(
        { error: `BSER API error: ${metaRes.status}` },
        { status: metaRes.status }
      );
    }

    const metaJson = await metaRes.json();
    const l10Path: string = metaJson?.data?.l10Path;

    console.log(`[bser/l10n] l10Path: ${l10Path}`);
    if (!l10Path) {
      return NextResponse.json({ error: "l10Path not found" }, { status: 502 });
    }

    // 2단계: 실제 l10n 텍스트 파일 다운로드
    console.log(`[bser/l10n] l10n 파일 다운로드 중...`);
    const l10nRes = await fetch(l10Path);
    console.log(`[bser/l10n] l10n 파일 응답: status=${l10nRes.status}`);
    if (!l10nRes.ok) {
      return NextResponse.json(
        { error: `l10n file fetch error: ${l10nRes.status}` },
        { status: 502 }
      );
    }

    const text = await l10nRes.text();

    // 3단계: 파싱 → Record<string, string>
    // 구분자: ┃ (U+2503), 줄바꿈: CRLF(\r\n) or LF(\n)
    const SEPARATOR = "\u2503";
    const parsedL10n: Record<string, string> = {};
    for (const line of text.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const sepIdx = trimmed.indexOf(SEPARATOR);
      if (sepIdx === -1) continue;
      const key = trimmed.slice(0, sepIdx);
      const value = trimmed.slice(sepIdx + 1);
      parsedL10n[key] = value;
    }

    console.log(`[bser/l10n] 파싱 완료: ${Object.keys(parsedL10n).length}개 키, 캐릭터 이름 샘플:`, {
      "Character/Name/1": parsedL10n["Character/Name/1"],
      "Character/Name/2": parsedL10n["Character/Name/2"],
      "Character/Name/3": parsedL10n["Character/Name/3"],
    });
    return NextResponse.json({ parsedL10n });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
