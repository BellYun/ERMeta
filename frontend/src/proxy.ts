import { NextRequest } from "next/server";
import createMiddleware from "next-intl/middleware";
import { DEFAULT_ROUTE_LOCALE, LANGUAGE_BY_ROUTE_LOCALE, routing } from "@/i18n/routing";
import { LANGUAGE_COOKIE } from "@/lib/detectLanguage";
import { getRouteLocaleSegmentFromPathname } from "@/lib/localizedPath";

const COOKIE_MAX_AGE = 365 * 24 * 60 * 60; // 1년
const handleI18nRouting = createMiddleware(routing);

export function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const routeLocale = getRouteLocaleSegmentFromPathname(pathname);
  const response = handleI18nRouting(request);
  const cookieLanguage = routeLocale
    ? LANGUAGE_BY_ROUTE_LOCALE[routeLocale]
    : LANGUAGE_BY_ROUTE_LOCALE[DEFAULT_ROUTE_LOCALE];

  response.cookies.set(LANGUAGE_COOKIE, cookieLanguage, {
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
