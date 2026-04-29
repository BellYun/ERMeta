import { NextRequest, NextResponse } from "next/server";
import createMiddleware from "next-intl/middleware";
import {
  DEFAULT_ROUTE_LOCALE,
  LANGUAGE_BY_ROUTE_LOCALE,
  ROUTE_LOCALE_BY_LANGUAGE,
  routing,
} from "@/i18n/routing";
import { LANGUAGE_COOKIE, resolveLanguage } from "@/lib/detectLanguage";
import {
  getRouteLocaleSegmentFromPathname,
  stripRouteLocaleFromPathname,
} from "@/lib/localizedPath";
import { localizeRoutePath } from "@/lib/seoLocales";

const COOKIE_MAX_AGE = 365 * 24 * 60 * 60; // 1년
const handleI18nRouting = createMiddleware(routing);

export function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const routeLocale = getRouteLocaleSegmentFromPathname(pathname);
  const existing = request.cookies.get(LANGUAGE_COOKIE)?.value;
  const accept = request.headers.get("accept-language");
  const preferredLanguage = resolveLanguage(existing, accept);
  const preferredLocale = ROUTE_LOCALE_BY_LANGUAGE[preferredLanguage];

  if (!routeLocale && preferredLocale !== DEFAULT_ROUTE_LOCALE) {
    const url = request.nextUrl.clone();
    url.pathname = localizeRoutePath(pathname || "/", preferredLocale);
    const response = NextResponse.redirect(url);
    response.cookies.set(LANGUAGE_COOKIE, preferredLanguage, {
      maxAge: COOKIE_MAX_AGE,
      path: "/",
      sameSite: "lax",
    });
    return response;
  }

  const response = handleI18nRouting(request);
  const normalizedPath = stripRouteLocaleFromPathname(pathname);
  const cookieLanguage = routeLocale
    ? LANGUAGE_BY_ROUTE_LOCALE[routeLocale]
    : normalizedPath === pathname
      ? preferredLanguage
      : resolveLanguage(existing, accept);

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
