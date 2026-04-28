import { NextRequest, NextResponse } from "next/server";
import { LANGUAGE_COOKIE, resolveLanguage, SUPPORTED_LANGUAGES } from "@/lib/detectLanguage";

const COOKIE_MAX_AGE = 365 * 24 * 60 * 60; // 1년

export function proxy(request: NextRequest) {
  const existing = request.cookies.get(LANGUAGE_COOKIE)?.value;

  // 이미 유효한 cookie 있으면 그대로 통과
  if (existing && (SUPPORTED_LANGUAGES as readonly string[]).includes(existing)) {
    return NextResponse.next();
  }

  // 첫 방문(또는 잘못된 값) → Accept-Language 기반으로 결정 후 cookie 박아두기
  const accept = request.headers.get("accept-language");
  const language = resolveLanguage(null, accept);

  // 동일 요청에서도 layout이 새 값을 보도록 request cookie도 mutate
  const response = NextResponse.next({ request });
  request.cookies.set(LANGUAGE_COOKIE, language);
  response.cookies.set(LANGUAGE_COOKIE, language, {
    maxAge: COOKIE_MAX_AGE,
    path: "/",
    sameSite: "lax",
  });
  return response;
}

// 정적 자산/내부 라우트에서는 미들웨어 스킵 (불필요한 edge 호출 줄이기)
export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon\\.ico|robots\\.txt|sitemap|manifest|apple-icon|icon|characters/|l10n/|api/).*)",
  ],
};
