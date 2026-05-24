import { NextResponse } from "next/server";
import { getCacheHeaders, NO_CACHE_HEADERS } from "@/lib/cache";
import { getCachedTraitNames } from "@/lib/l10nNames";

// 사용 중단 예정 호환용 endpoint:
// 내부 앱은 더 이상 이 route를 직접 쓰지 않고 L10nProvider/static l10n에서 특성 이름을 읽는다.
// 외부 사용 여부가 확인되기 전까지는 호환용으로만 유지한다.
export async function GET() {
  try {
    const names = await getCachedTraitNames();

    if (!names) {
      return NextResponse.json(
        { error: "Static l10n not found" },
        { status: 500, headers: NO_CACHE_HEADERS }
      );
    }

    return NextResponse.json({ names }, { headers: getCacheHeaders("slow") });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500, headers: NO_CACHE_HEADERS });
  }
}
