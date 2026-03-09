import { NextResponse } from "next/server"


export async function GET() {
  const apiKey = process.env.BSER_API_KEY
  if (!apiKey) {
    return NextResponse.json({ error: "BSER_API_KEY not set" }, { status: 500 })
  }

  try {
    // 1단계: l10n 파일 URL 조회
    const metaRes = await fetch("https://open-api.bser.io/v1/l10n/Korean", {
      headers: { "x-api-key": apiKey },
    })
    if (!metaRes.ok) {
      return NextResponse.json({ error: `BSER API error: ${metaRes.status}` }, { status: metaRes.status })
    }
    const metaJson = await metaRes.json()
    const l10Path: string = metaJson?.data?.l10Path
    if (!l10Path) {
      return NextResponse.json({ error: "l10Path not found" }, { status: 502 })
    }

    // 2단계: l10n 텍스트 다운로드 및 파싱
    const l10nRes = await fetch(l10Path)
    if (!l10nRes.ok) {
      return NextResponse.json({ error: `l10n fetch error: ${l10nRes.status}` }, { status: 502 })
    }
    const text = await l10nRes.text()

    // 3단계: Item/Name/{code} 키만 추출 → { code: name }
    const SEPARATOR = "\u2503"
    const names: Record<number, string> = {}
    for (const line of text.split(/\r?\n/)) {
      const trimmed = line.trim()
      if (!trimmed || trimmed.startsWith("#")) continue
      const sepIdx = trimmed.indexOf(SEPARATOR)
      if (sepIdx === -1) continue
      const key = trimmed.slice(0, sepIdx)
      if (!key.startsWith("Item/Name/")) continue
      const code = Number(key.slice("Item/Name/".length))
      if (!isNaN(code) && code > 0) {
        names[code] = trimmed.slice(sepIdx + 1)
      }
    }

    return NextResponse.json({ names })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
