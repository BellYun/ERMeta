import { NextResponse } from "next/server";
import { getCacheHeaders, NO_CACHE_HEADERS } from "@/lib/cache";
import { getCachedItemNames } from "@/lib/l10nNames";
import { tryNestApiProxy } from "@/lib/server/nestProxy";

// 사용 중단 예정 호환용 endpoint:
// 내부 앱은 더 이상 이 route를 직접 쓰지 않고 L10nProvider/static l10n에서 아이템 이름을 읽는다.
// 외부 사용 여부가 확인되기 전까지는 호환용으로만 유지한다.
export async function GET(request: Request) {
  const proxied = await tryNestApiProxy(request, "/items/names");
  if (proxied) return proxied;

  try {
    const names = await getCachedItemNames();

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
