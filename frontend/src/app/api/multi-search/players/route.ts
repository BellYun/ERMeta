import { NextRequest, NextResponse } from "next/server";
import { isMultiSearchEnabled } from "@/lib/featureFlags";

const DEFAULT_MULTI_SEARCH_API_BASE_URL = "https://ermeta-production.up.railway.app";

export async function POST(request: NextRequest) {
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

  try {
    const body = await request.text();
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
