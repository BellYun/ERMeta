import { NextResponse } from "next/server";
import { NO_CACHE_HEADERS } from "@/lib/cache";
import { isPublicPatchVersion } from "@/lib/publicPatchVersion";

export function getUnsupportedPatchResponse(patchVersion: string | null): NextResponse | null {
  if (patchVersion === null || isPublicPatchVersion(patchVersion)) return null;

  return NextResponse.json(
    { error: "Unsupported patch version" },
    { status: 400, headers: NO_CACHE_HEADERS }
  );
}
