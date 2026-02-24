import { NextResponse } from "next/server";

import { getMissingRequiredEnv } from "@/lib/env";

export const dynamic = "force-dynamic";

export async function GET() {
  const missing = getMissingRequiredEnv();

  if (missing.length > 0) {
    return NextResponse.json(
      {
        ok: false,
        error: "Required environment variables are missing.",
        missing,
      },
      { status: 500 },
    );
  }

  return NextResponse.json({
    ok: true,
    message: "All required environment variables are configured.",
  });
}
