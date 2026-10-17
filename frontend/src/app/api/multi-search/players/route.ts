import { NextRequest, NextResponse } from "next/server";
import { isMultiSearchEnabled } from "@/lib/featureFlags";
import { adaptPlayerCompare, type PlayerCompareResponse } from "@/lib/playerApiAdapter";

const DEFAULT_MULTI_SEARCH_API_BASE_URL = "https://ermeta-production.up.railway.app";
const CURRENT_SEASON_ID = 41;
const CURRENT_MATCHING_MODE = 3;

export async function POST(request: NextRequest) {
  if (!isMultiSearchEnabled()) {
    return NextResponse.json(
      { error: "not_found" },
      { status: 404, headers: { "Cache-Control": "no-store" } }
    );
  }

  const playerApiBaseUrl = process.env.PLAYER_API_BASE_URL?.trim();
  if (playerApiBaseUrl) {
    return postToPlayerApi(request, playerApiBaseUrl);
  }

  const baseUrl =
    process.env.MULTI_SEARCH_API_BASE_URL ||
    process.env.NEST_API_BASE_URL ||
    DEFAULT_MULTI_SEARCH_API_BASE_URL;

  try {
    const body = withCurrentSeason(await request.text());
    const response = await fetch(`${baseUrl.replace(/\/$/, "")}/multi-search/players`, {
      method: "POST",
      headers: {
        "Content-Type": request.headers.get("Content-Type") || "application/json",
      },
      body,
      cache: "no-store",
    });

    const text = await response.text();
    return new NextResponse(text, {
      status: response.status,
      headers: {
        "Content-Type": response.headers.get("Content-Type") || "application/json; charset=utf-8",
        "Cache-Control": "no-store",
      },
    });
  } catch {
    return NextResponse.json(
      { error: "multi_search_unavailable" },
      { status: 503, headers: { "Cache-Control": "no-store" } }
    );
  }
}

async function postToPlayerApi(request: NextRequest, baseUrl: string) {
  try {
    const body = await request.json();
    const response = await fetch(`${baseUrl.replace(/\/$/, "")}/v1/players/compare`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...body,
        seasonId: CURRENT_SEASON_ID,
        matchingMode: CURRENT_MATCHING_MODE,
      }),
      cache: "no-store",
    });
    const payload = await response.json();
    return NextResponse.json(
      response.ok ? adaptPlayerCompare(payload as PlayerCompareResponse) : payload,
      { status: response.status, headers: { "Cache-Control": "no-store" } }
    );
  } catch {
    return NextResponse.json(
      { code: "PLAYER_API_UNAVAILABLE", message: "플레이어 API에 연결하지 못했습니다." },
      { status: 503, headers: { "Cache-Control": "no-store" } }
    );
  }
}

function withCurrentSeason(body: string): string {
  try {
    const parsed: unknown = JSON.parse(body);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return body;
    return JSON.stringify({
      ...parsed,
      seasonId: CURRENT_SEASON_ID,
      matchingMode: CURRENT_MATCHING_MODE,
    });
  } catch {
    return body;
  }
}
