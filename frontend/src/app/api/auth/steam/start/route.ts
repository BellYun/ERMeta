import { NextRequest, NextResponse } from "next/server";
import { issueSteamStateToken } from "@/lib/auth/desktopAuthToken";
import { isDesktopAuthEnabled } from "@/lib/auth/featureFlags";

export const dynamic = "force-dynamic";

const STEAM_OPENID_ENDPOINT = "https://steamcommunity.com/openid/login";
const DEFAULT_DESKTOP_REDIRECT = "ermeta://auth/callback";

function isAllowedRedirectUri(redirectUri: string): boolean {
  return (
    redirectUri.startsWith("ermeta://") ||
    redirectUri.startsWith("http://localhost:") ||
    redirectUri.startsWith("http://127.0.0.1:")
  );
}

export async function GET(request: NextRequest) {
  if (!isDesktopAuthEnabled()) {
    return NextResponse.json(
      { error: "Desktop auth feature is disabled." },
      { status: 404 }
    );
  }

  const url = new URL(request.url);
  const redirectUri =
    url.searchParams.get("redirect") ?? DEFAULT_DESKTOP_REDIRECT;
  const format = url.searchParams.get("format");

  if (!isAllowedRedirectUri(redirectUri)) {
    return NextResponse.json(
      {
        error:
          "지원되지 않는 redirect URI입니다. ermeta:// 또는 localhost를 사용하세요.",
      },
      { status: 400 }
    );
  }

  const stateToken = issueSteamStateToken({ redirectUri });
  const callbackUrl = new URL("/api/auth/steam/callback", url.origin);
  callbackUrl.searchParams.set("state", stateToken);

  const steamParams = new URLSearchParams({
    "openid.ns": "http://specs.openid.net/auth/2.0",
    "openid.mode": "checkid_setup",
    "openid.return_to": callbackUrl.toString(),
    "openid.realm": url.origin,
    "openid.identity":
      "http://specs.openid.net/auth/2.0/identifier_select",
    "openid.claimed_id":
      "http://specs.openid.net/auth/2.0/identifier_select",
  });

  const loginUrl = `${STEAM_OPENID_ENDPOINT}?${steamParams.toString()}`;
  if (format === "json") {
    return NextResponse.json({
      loginUrl,
      redirectUri,
      callbackUrl: callbackUrl.toString(),
    });
  }

  return NextResponse.redirect(loginUrl);
}
