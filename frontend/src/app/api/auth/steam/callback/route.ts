import { NextRequest, NextResponse } from "next/server";
import {
  issueDesktopSessionToken,
  verifySteamStateToken,
} from "@/lib/auth/desktopAuthToken";
import { isDesktopAuthEnabled } from "@/lib/auth/featureFlags";

export const dynamic = "force-dynamic";

const STEAM_OPENID_ENDPOINT = "https://steamcommunity.com/openid/login";
const DEFAULT_ERROR_REDIRECT = "ermeta://auth/callback";

function parseSteamIdFromClaimedId(claimedId: string | null): string | null {
  if (!claimedId) return null;
  const match = claimedId.match(
    /^https?:\/\/steamcommunity\.com\/openid\/id\/(\d+)$/i
  );
  return match?.[1] ?? null;
}

async function verifyOpenIdWithSteam(searchParams: URLSearchParams) {
  const verification = new URLSearchParams();

  for (const [key, value] of searchParams.entries()) {
    if (key.startsWith("openid.")) {
      verification.set(key, value);
    }
  }

  verification.set("openid.mode", "check_authentication");

  const response = await fetch(STEAM_OPENID_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: verification.toString(),
    cache: "no-store",
  });

  const bodyText = await response.text();
  return response.ok && /is_valid\s*:\s*true/i.test(bodyText);
}

async function fetchPersonaName(steamId: string): Promise<string> {
  const key = process.env.STEAM_WEB_API_KEY;
  if (!key) {
    return `steam_${steamId.slice(-6)}`;
  }

  const profileUrl = new URL(
    "https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v0002/"
  );
  profileUrl.searchParams.set("key", key);
  profileUrl.searchParams.set("steamids", steamId);

  const response = await fetch(profileUrl.toString(), {
    cache: "no-store",
  });

  if (!response.ok) {
    return `steam_${steamId.slice(-6)}`;
  }

  const data = (await response.json()) as {
    response?: {
      players?: Array<{ personaname?: string }>;
    };
  };

  const personaname = data.response?.players?.[0]?.personaname?.trim();
  if (!personaname) {
    return `steam_${steamId.slice(-6)}`;
  }

  return personaname;
}

function buildRedirectUrl(
  redirectUri: string,
  params: Record<string, string>
): string | null {
  try {
    const url = new URL(redirectUri);
    for (const [key, value] of Object.entries(params)) {
      url.searchParams.set(key, value);
    }
    return url.toString();
  } catch {
    return null;
  }
}

function redirectWithError(
  redirectUri: string,
  code: string,
  detail?: string
): NextResponse {
  const url = buildRedirectUrl(redirectUri, {
    error: code,
    ...(detail ? { error_description: detail } : {}),
  });
  if (!url) {
    return NextResponse.json(
      {
        error: code,
        error_description: detail ?? "redirect URI가 유효하지 않습니다.",
      },
      { status: 400 }
    );
  }

  return NextResponse.redirect(url);
}

export async function GET(request: NextRequest) {
  if (!isDesktopAuthEnabled()) {
    return NextResponse.json(
      { error: "Desktop auth feature is disabled." },
      { status: 404 }
    );
  }

  const url = new URL(request.url);
  const stateToken = url.searchParams.get("state");
  const fallbackRedirectUri =
    url.searchParams.get("redirect") ?? DEFAULT_ERROR_REDIRECT;

  if (!stateToken) {
    return redirectWithError(
      fallbackRedirectUri,
      "missing_state",
      "state 파라미터가 없습니다."
    );
  }

  const statePayload = verifySteamStateToken(stateToken);
  if (!statePayload) {
    return redirectWithError(
      fallbackRedirectUri,
      "invalid_state",
      "state 검증에 실패했습니다."
    );
  }

  const redirectUri = statePayload.redirectUri;

  try {
    const isOpenIdValid = await verifyOpenIdWithSteam(url.searchParams);
    if (!isOpenIdValid) {
      return redirectWithError(
        redirectUri,
        "steam_verification_failed",
        "Steam OpenID 검증에 실패했습니다."
      );
    }

    const steamId = parseSteamIdFromClaimedId(
      url.searchParams.get("openid.claimed_id")
    );

    if (!steamId) {
      return redirectWithError(
        redirectUri,
        "missing_steam_id",
        "Steam ID를 확인할 수 없습니다."
      );
    }

    const personaName = await fetchPersonaName(steamId);
    const { token, payload } = issueDesktopSessionToken({
      steamId,
      personaName,
    });

    const successRedirect = buildRedirectUrl(redirectUri, {
      token,
      steamId: payload.steamId,
      personaName: payload.personaName,
      expiresAt: String(payload.exp),
    });

    if (!successRedirect) {
      return NextResponse.json(
        {
          error: "invalid_redirect_uri",
          error_description: "유효하지 않은 redirect URI입니다.",
        },
        { status: 400 }
      );
    }

    return NextResponse.redirect(successRedirect);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "알 수 없는 오류가 발생했습니다.";
    return redirectWithError(redirectUri, "callback_exception", message);
  }
}
