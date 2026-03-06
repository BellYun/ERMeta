import { NextRequest, NextResponse } from "next/server";
import { verifyDesktopSessionToken } from "@/lib/auth/desktopAuthToken";
import { isDesktopAuthEnabled } from "@/lib/auth/featureFlags";

export const dynamic = "force-dynamic";

function getBearerToken(request: NextRequest): string | null {
  const authHeader = request.headers.get("authorization");
  if (authHeader?.toLowerCase().startsWith("bearer ")) {
    return authHeader.slice(7).trim();
  }

  return new URL(request.url).searchParams.get("token");
}

export async function GET(request: NextRequest) {
  if (!isDesktopAuthEnabled()) {
    return NextResponse.json(
      { error: "Desktop auth feature is disabled." },
      { status: 404 }
    );
  }

  const token = getBearerToken(request);
  if (!token) {
    return NextResponse.json(
      { ok: false, error: "인증 토큰이 필요합니다." },
      { status: 401 }
    );
  }

  const payload = verifyDesktopSessionToken(token);
  if (!payload) {
    return NextResponse.json(
      { ok: false, error: "유효하지 않거나 만료된 토큰입니다." },
      { status: 401 }
    );
  }

  return NextResponse.json({
    ok: true,
    user: {
      steamId: payload.steamId,
      personaName: payload.personaName,
    },
    expiresAt: payload.exp,
  });
}
