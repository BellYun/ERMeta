import { promises as fs } from "node:fs";
import { join } from "node:path";
import { NextResponse } from "next/server";

export const revalidate = 3600;

export async function GET(_request: Request, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  if (!/^\d+$/.test(code)) {
    return NextResponse.json({ error: "invalid code" }, { status: 400 });
  }
  const padded = code.padStart(3, "0");
  const filePath = join(process.cwd(), "public", "data", "synergy-pairs", `${padded}.json`);
  try {
    const raw = await fs.readFile(filePath, "utf8");
    return new NextResponse(raw, {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400",
      },
    });
  } catch {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }
}
