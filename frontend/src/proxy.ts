import { NextRequest, NextResponse } from "next/server";
import { DEFAULT_ROUTE_LOCALE, LANGUAGE_BY_ROUTE_LOCALE } from "@/i18n/routing";
import { LANGUAGE_COOKIE } from "@/lib/detectLanguage";
import { getRouteLocaleSegmentFromPathname } from "@/lib/localizedPath";

const COOKIE_MAX_AGE = 365 * 24 * 60 * 60; // 1년

function applyLanguageCookie(response: NextResponse, cookieLanguage: string) {
  response.cookies.set(LANGUAGE_COOKIE, cookieLanguage, {
    maxAge: COOKIE_MAX_AGE,
    path: "/",
    sameSite: "lax",
  });
}

export function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  if (pathname === "/synergy-detail/opengraph-image") {
    return NextResponse.next();
  }

  const routeLocale = getRouteLocaleSegmentFromPathname(pathname);
  const cookieLanguage = routeLocale
    ? LANGUAGE_BY_ROUTE_LOCALE[routeLocale]
    : LANGUAGE_BY_ROUTE_LOCALE[DEFAULT_ROUTE_LOCALE];

  if (!routeLocale) {
    const rewriteUrl = request.nextUrl.clone();
    rewriteUrl.pathname =
      pathname === "/" ? `/${DEFAULT_ROUTE_LOCALE}` : `/${DEFAULT_ROUTE_LOCALE}${pathname}`;

    const response = NextResponse.rewrite(rewriteUrl);
    applyLanguageCookie(response, cookieLanguage);
    return response;
  }

  const response = NextResponse.next();
  applyLanguageCookie(response, cookieLanguage);

  return response;
}

// 정적 자산/내부 라우트에서는 미들웨어 스킵 (불필요한 edge 호출 줄이기)
export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon\\.ico|robots\\.txt|ads\\.txt|sitemap|manifest|apple-icon|icon|character/|characters/|CharactER/|TraitSkill/|Item/|l10n/|data/|api/).*)",
  ],
};
