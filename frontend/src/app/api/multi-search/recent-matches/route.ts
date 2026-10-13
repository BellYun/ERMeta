import { NextRequest, NextResponse } from "next/server";
import { isMultiSearchEnabled } from "@/lib/featureFlags";

const DEFAULT_MULTI_SEARCH_API_BASE_URL = "https://ermeta-production.up.railway.app";

export async function GET(request: NextRequest) {
  if (!isMultiSearchEnabled()) {
    return NextResponse.json(
      { error: "not_found" },
      { status: 404, headers: { "Cache-Control": "no-store" } }
    );
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
