import { NextRequest, NextResponse } from "next/server";
import { isMultiSearchEnabled } from "@/lib/featureFlags";
import { adaptPlayerMatches, type PlayerMatchesResponse } from "@/lib/playerApiAdapter";

const DEFAULT_MULTI_SEARCH_API_BASE_URL = "https://ermeta-production.up.railway.app";

export async function GET(request: NextRequest) {
  if (!isMultiSearchEnabled()) {
    return NextResponse.json(
      { error: "not_found" },
      { status: 404, headers: { "Cache-Control": "no-store" } }
    );
  }

  const playerApiBaseUrl = process.env.PLAYER_API_BASE_URL?.trim();
  if (playerApiBaseUrl) {
    return getFromPlayerApi(request, playerApiBaseUrl);
  }

  const baseUrl =
    process.env.MULTI_SEARCH_API_BASE_URL ||
    process.env.NEST_API_BASE_URL ||
    DEFAULT_MULTI_SEARCH_API_BASE_URL;
  const url = new URL(`${baseUrl.replace(/\/$/, "")}/multi-search/recent-matches`);
  url.search = request.nextUrl.search;

  try {
    const response = await fetch(url, { cache: "no-store" });
    return new NextResponse(await response.text(), {
      status: response.status,
      headers: {
        "Content-Type": response.headers.get("Content-Type") || "application/json; charset=utf-8",
        "Cache-Control": "no-store",
      },
    });
  } catch {
    return NextResponse.json(
      { error: "recent_matches_unavailable" },
      { status: 503, headers: { "Cache-Control": "no-store" } }
    );
  }
}

async function getFromPlayerApi(request: NextRequest, baseUrl: string) {
  const nickname = request.nextUrl.searchParams.get("nickname")?.trim();
  if (!nickname) {
    return NextResponse.json(
      { code: "INVALID_NICKNAME", message: "닉네임을 입력해주세요." },
      { status: 400, headers: { "Cache-Control": "no-store" } }
    );
  }

  try {
    const url = new URL(
      `${baseUrl.replace(/\/$/, "")}/v1/players/${encodeURIComponent(nickname)}/matches`
    );
    url.searchParams.set("limit", request.nextUrl.searchParams.get("limit") ?? "10");
    const cursor = request.nextUrl.searchParams.get("cursor");
    if (cursor) url.searchParams.set("cursor", cursor);
    const response = await fetch(url, { cache: "no-store" });
    if (response.ok) {
      const payload = (await response.json()) as PlayerMatchesResponse;
      return NextResponse.json(adaptPlayerMatches(nickname, payload), {
        headers: { "Cache-Control": "no-store" },
      });
    }
    const error = await response.json();
    const rateLimited =
      response.status === 429 ||
      error?.code === "BSER_RATE_LIMITED" ||
      error?.code === "RATE_LIMITED";
    const bodyRetryAfter = Number(error?.retryAfter);
    const headerRetryAfter = Number(response.headers.get("Retry-After"));
    const retryAfter =
      Number.isInteger(bodyRetryAfter) && bodyRetryAfter > 0
        ? bodyRetryAfter
        : Number.isInteger(headerRetryAfter) && headerRetryAfter > 0
          ? headerRetryAfter
          : undefined;
    return NextResponse.json(
      {
        input: nickname,
        status: response.status === 404 ? "not_found" : "error",
        matches: [],
        code: error?.code,
        ...(rateLimited && retryAfter ? { retryAfter } : {}),
        reason:
          response.status === 404
            ? "nickname_not_found"
            : rateLimited
              ? "rate_limited"
              : error?.code === "BSER_UNAVAILABLE"
                ? "bser_api_unavailable"
                : "unknown_error",
      },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch {
    return NextResponse.json(
      {
        input: nickname,
        status: "error",
        matches: [],
        reason: "unknown_error",
      },
      { headers: { "Cache-Control": "no-store" } }
    );
  }
}
